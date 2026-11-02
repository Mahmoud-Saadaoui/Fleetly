require('dotenv').config();

const mongoose = require('mongoose');
const dbConnect = require("./config/connect");
const logger = require("./utils/logger");
const { validateEnv } = require('./config/validateEnv');

validateEnv();

const app = require('./app');

const PORT = process.env.PORT || 5001;
let server;

const startServer = async () => {
  try {
    await dbConnect();
    server = app.listen(PORT, () => {
      logger.info(`Server Is Running in ${process.env.NODE_ENV || 'development'} Mode on Port ${PORT}`);
    });
  } catch (error) {
    logger.error('Server startup failed', { message: error.message });
    process.exitCode = 1;
  }
};

const shutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully`);

  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, 10000);

  const closeServer = server
    ? new Promise((resolve) => server.close(resolve))
    : Promise.resolve();

  closeServer
    .then(() => mongoose.connection.close(false))
    .then(() => {
      clearTimeout(shutdownTimeout);
      process.exit(0);
    })
    .catch((error) => {
      clearTimeout(shutdownTimeout);
      logger.error('Graceful shutdown failed', { message: error.message });
      process.exit(1);
    });
};

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

startServer();
