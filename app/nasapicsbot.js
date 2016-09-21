const request     = require('request');
const rp          = require('request-promise');
const TelegramBot = require('node-telegram-bot-api');
const config      = require('../config/config');
const logger      = require('./logger');

const nasa_url    = 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY';
const bot         = new TelegramBot(config.token);

logger.info('New picture');

/*
 * IMAGE PROCESSING 
 */
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

function imageType(nasa_obj) {

    fetchImage(nasa_obj.url, nasa_obj.title + '.jpg', function(err, stream) {
                
        if (err) {

            logger.error(err);

        } else {
            
            bot.sendPhoto(config.channel, stream, { caption : nasa_obj.title })
            .then( function() {
                logger.info('Normal pic send');
            })
            .catch( err => {
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
            .catch( err => {
               logger.error(err); 
            });

        }
    });   
}

/*
 * ANY OTHER KIND OF MEDIA 
 */
function otherType(nasa_obj) {

    if (nasa_obj['media_type'] === 'video') {
        let msg = nasa_obj.title + '\n';
        msg += nasa_obj.url;
        bot.sendMessage(config.channel, msg);
    }
}

/*
 * ENTRY POINT
 * First request to NASA API for getting the JSON with the URL's 
 */
rp(nasa_url).then( body => {

    let nasa_obj = JSON.parse(body);
    
    if (nasa_obj['media_type'] === 'image') {
        imageType(nasa_obj)
    } else {
        otherType(nasa_obj);
    }

}).catch( error => {
    logger.error(error);
});