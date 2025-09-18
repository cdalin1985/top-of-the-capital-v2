/**
 * Capital Ladder App Server
 * Main entry point for the application.
 */

require('dotenv').config();
const { createApp } = require('./lib/createApp');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3001;

// Create the app, server, and io instances from the factory
const { app, server, io } = createApp();

// Start the server only if not in a test environment
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    logger.info(`Capital Ladder server listening on port ${PORT}`);
  });
} else {
  logger.info('Test environment detected - server will not be started automatically.');
}

// Export for testing and other potential programmatic uses
module.exports = { app, server, io };
