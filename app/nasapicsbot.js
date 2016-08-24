const request     = require('request');
const fs          = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const config      = require('../config/config');
const logger      = require('./logger');

const nasa_url    = 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY';
const bot         = new TelegramBot(config.token);

logger.info('New picture');

function fetchImage(destiny, name, callback) {

    const file = request.get({ 
        url : destiny,
        headers: { 
            'User-Agent': 'request' 
        } 
    }).on('error', (err) => {
        logger.error(err);
    });

    callback(file);
}

//First request to NASA API for getting the JSON with the URL's 
request.get(nasa_url, (error, response, body) => {

    if (!error) {

        let nasa_obj = JSON.parse(body);
        
            fetchImage(nasa_obj.url, nasa_obj.title + '.jpg', function(stream) {
                
                bot.sendPhoto(config.channel, stream, { caption : nasa_obj.title })
                .catch( (err) => {
                    logger.error(err);
                });

            });

            fetchImage(nasa_obj.url, nasa_obj.title + 'hd.jpg', function(stream) {

                bot.sendDocument(config.channel, stream)
                .catch( (err) => {
                   logger.error(err); 
                });

            });

    } else {
        logger.error(err);
    }
});