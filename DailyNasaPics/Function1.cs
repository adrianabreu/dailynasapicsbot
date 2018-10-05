using System;
using System.Net.Http;
using System.Threading.Tasks;
using DailyNasaPics.Models;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Host;
using Newtonsoft.Json;
using System.Configuration;
using Microsoft.Extensions.Configuration;

namespace DailyNasaPics
{
    public static class CronFunctions
    {
        private static HttpClient _httpClient = new HttpClient();

        [FunctionName("DailyNasaPicMorning")]
        public static async Task Run([TimerTrigger("0 0 6  * * *")]TimerInfo myTimer, TraceWriter log, ExecutionContext context)
        {
            // TimerTrigger("0 0 8 * * *")
            log.Info($"Executing bot at: {DateTime.Now}");

            // Step 1 -- Setup
            var config = new ConfigurationBuilder()
                .SetBasePath(context.FunctionAppDirectory)
                .AddJsonFile("local.settings.json", optional: true, reloadOnChange: true)
                .AddEnvironmentVariables()
                .Build();

            // Step 2 -- Request image
            log.Info($"Retrieving Nasa image");
            var nasaEndPoint = "https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY";
            var response = await _httpClient.GetAsync(nasaEndPoint);
            var message = JsonConvert.DeserializeObject<NasaMedia>(await response.Content.ReadAsStringAsync());


            // Step 3 -- Send Media
            log.Info($"Sending media to telegram");
            var nasaBot = new NasaBot(config["token"], config["channelName"], log);

            await nasaBot.SendMedia(message);
        }
    }
}
