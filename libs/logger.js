const winston = require("winston");
require("winston-daily-rotate-file");

const file_transport = new winston.transports.DailyRotateFile({
  filename: "logs/ds-%DATE%.log",
  datePattern: "YYYY-MM-DD-HH",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "5d", // 5일 동안 로그 파일 유지
});

const console_transport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
});

const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      if (stack) {
        return `${timestamp} ${level}: ${message}\n${stack}`;
      }
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [console_transport, file_transport],
});

module.exports = logger;
