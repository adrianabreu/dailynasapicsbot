const request     = require('request');
const fs          = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const cron        = require('node-cron');
const config      = require('./config/config');
const nasa_url    = 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY';

const bot = new TelegramBot(config.token);

cron.schedule(config.cron, function() {

    console.log('Let\'s start');

    function fetchImage(destiny, name, callback) {

        let f = fs.createWriteStream(name);

        f.on('finish', function(){
            callback(name);
        });

        request.get({ 
            url : destiny,
            headers: { 
                'User-Agent': 'request' 
            } 
        })
        .pipe(f);
    }

    //First request to NASA API for getting the JSON with the URL's 
    request.get(nasa_url, function(error, response, body) {

        if (!error) {

            let my_obj = JSON.parse(body);

            bot.sendMessage(config.channel, my_obj.title);

            fetchImage(my_obj.url, my_obj.title + '.jpg', function(f_name) {
                
                bot.sendPhoto(config.channel, f_name);

            });

            fetchImage(my_obj.url, my_obj.title + 'hd.jpg', function(f_name) {

                bot.sendDocument(config.channel, f_name);

            });

        } else {
            console.log(error);
        }
    })
});