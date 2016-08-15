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

        const file = request.get({ 
            url : destiny,
            headers: { 
                'User-Agent': 'request' 
            } 
        }).on('error', (err) => {

            console.log(err);

        });

        callback(file);
    }

    //First request to NASA API for getting the JSON with the URL's 
    request.get(nasa_url, (error, response, body) => {

        if (!error) {

            let nasa_obj = JSON.parse(body);
            
                fetchImage(nasa_obj.url, nasa_obj.title + '.jpg', function(stream) {
                    
                    bot.sendPhoto(config.channel, stream, { caption : nasa_obj.title });

                });


                fetchImage(nasa_obj.url, nasa_obj.title + 'hd.jpg', function(stream) {

                    bot.sendDocument(config.channel, stream);

                });

        } else {
            console.log(error);
        }
    });
    
});