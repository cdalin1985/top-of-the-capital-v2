/**
 * Simple logger utility for Top of the Capital application
 * Provides structured logging with log levels and timestamps
 */

const LOG_LEVELS = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
};

// Check if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Format a log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} [meta] - Optional metadata
 * @returns {string} Formatted log message
 */
function formatMessage(level, message, meta) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

const logger = {
    /**
     * Log an error message
     * @param {string} message - Error message
     * @param {Error|Object} [error] - Error object or metadata
     */
    error(message, error) {
        const meta = error instanceof Error
            ? { error: error.message, stack: isProduction ? undefined : error.stack }
            : error;
        console.error(formatMessage(LOG_LEVELS.ERROR, message, meta));
    },

    /**
     * Log a warning message
     * @param {string} message - Warning message
     * @param {Object} [meta] - Optional metadata
     */
    warn(message, meta) {
        console.warn(formatMessage(LOG_LEVELS.WARN, message, meta));
    },

    /**
     * Log an info message
     * @param {string} message - Info message
     * @param {Object} [meta] - Optional metadata
     */
    info(message, meta) {
        console.log(formatMessage(LOG_LEVELS.INFO, message, meta));
    },

    /**
     * Log a debug message (only in non-production)
     * @param {string} message - Debug message
     * @param {Object} [meta] - Optional metadata
     */
    debug(message, meta) {
        if (!isProduction) {
            console.log(formatMessage(LOG_LEVELS.DEBUG, message, meta));
        }
    }
};

module.exports = logger;
