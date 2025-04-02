const logger = require("./libs/logger");
const utils = require("./libs/utils");
const env = require("./libs/env");
const mysqlService = require("./src/Mysql/MysqlService");

global.logger = logger;
global.utils = utils;
global.env = env;

process.on("uncaughtException", (err) => {
  // log the exception
  logger.error(`uncaught exception detected, err: ${err}\n${err.stack}`);
});

async function initialize() {
  try {
    global.mysql = await mysqlService.create();
    logger.info("process start...");

    require("./src/scheduler");
    const service = require("./src/Service/Service");
    await service.init();

    while (true) {
      await utils.sleep(1000);
    }
  } catch (error) {
    logger.error(`Initialization failed, err: ${error}\n${error.stack}`);
    process.exit(1); // exit the process if initialization fails
  }
}

initialize();
