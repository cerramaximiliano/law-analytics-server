// server.js
const app = require("./app");
const logger = require("./utils/logger");


// Capturar errores no controlados
process.on('uncaughtException', (error) => {
    logger.error(`UNCAUGHT EXCEPTION: ${error.message}`);
    logger.error(error.stack);
    // Mantener el proceso vivo pero loggear el error
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('UNHANDLED REJECTION');
    logger.error(`Reason: ${reason}`);
    // Mantener el proceso vivo pero loggear el error
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    try {
        logger.info(`Server running on port ${PORT} - on ${process.env.NODE_ENV}`)
    } catch (error) {
        logger.error(`Error ${error}`)
    }
});
