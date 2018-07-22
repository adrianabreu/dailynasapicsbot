using DailyNasaPics.Models;
using Microsoft.Azure.WebJobs.Host;
using System.Net.Http;
using System.Threading.Tasks;
using Telegram.Bot.Types;

namespace DailyNasaPics
{
    public class NasaBot
    {

        private readonly string _token;

        private readonly string _channel;

        private readonly HttpClient _httpClient;

        private readonly TraceWriter _log;

        private Telegram.Bot.TelegramBotClient _botClient;


        public NasaBot(string token, string channel, TraceWriter log)
        {
            _token = token;
            _channel = channel;
            _httpClient = new HttpClient();
            _log = log;

            _botClient = new Telegram.Bot.TelegramBotClient(_token);
        }

        public async Task SendMedia(NasaMedia nasaMedia)
        {
            switch (nasaMedia.media_type)
            {
                case "image":
                    _log.Info($"Sending picture media type {nasaMedia.media_type}");
                    await _botClient.SendPhotoAsync(_channel, new FileToSend(nasaMedia.Url), nasaMedia.Title);
                    _log.Info($"Retrieving hd picture");
                    var picture = await _httpClient.GetStreamAsync(nasaMedia.HdUrl);
                    _log.Info("Sending picture through channel");
                    await _botClient.SendDocumentAsync(_channel, new FileToSend(nasaMedia.HdUrl, picture));

                    _log.Info("Sending explanation");
                    await _botClient.SendTextMessageAsync(_channel, nasaMedia.Explanation);

                    break;
                case "video":
                    _log.Info($"Sending video media type {nasaMedia.media_type}");
                    var firstMessage = nasaMedia.Title + " - " + nasaMedia.Url;
                    await _botClient.SendTextMessageAsync(_channel, firstMessage);
                    await _botClient.SendTextMessageAsync(_channel, nasaMedia.Explanation);
                    break;
                default:
                    _log.Info($"Unknow message media type {nasaMedia.media_type}");
                    break;
            }
        }

    }
}
