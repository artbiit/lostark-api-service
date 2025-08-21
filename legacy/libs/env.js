const logger = require("./logger");

require("dotenv").config();

const env = init();

function init() {
  const env = {};
  const keys = [
    //SETTINGS
    "PREFIX",
    "PORT",
    //DB
    "DB_USER",
    "DB_HOST",
    "DB_PORT",
    "DB_SCHEMA",
    "DB_PASSWORD",
    //API
    "api_key",
    "base_url",
  ];
  for (let key of keys) {
    env[key] = check(key);
  }
  logger.info("env. initailized.");
  return env;
}

function check(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`env.check. not found env : ${key}`);
  }
  return value;
}
module.exports = env;
