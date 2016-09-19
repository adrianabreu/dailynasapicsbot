const request     = require('request');
const rp          = require('request-promise');
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
    }).on('error', err => {     
        callback(err, null);
    });

    callback(null, file);

}

//First request to NASA API for getting the JSON with the URL's 
rp(nasa_url).then( body => {

    let nasa_obj = JSON.parse(body);
        
    fetchImage(nasa_obj.url, nasa_obj.title + '.jpg', function(err, stream) {
                
        if (err) {

            logger.error(err);

        } else {
            
            bot.sendPhoto(config.channel, stream, { caption : nasa_obj.title })
            .then( function(){
                logger.info('Normal pic send');
            })
            .catch( (err) => {
                logger.error(err);
            });                 
        }
    });

    fetchImage(nasa_obj.url, nasa_obj.title + 'hd.jpg', function(err, stream) {

        if (err) {

            logger.error(err);

        } else {

            bot.sendDocument(config.channel, stream)
            .then( function(){
                logger.info('HD pic send');
            })
            .catch( (err) => {
               logger.error(err); 
            });

        }

    });

}).catch( error => {
    console.log(error);
    logger.error(error);
});