const logger = require('./app/logger');
const config = require('./config/config');

logger.info('Setup complete');

require('./app/nasapicsbot');
