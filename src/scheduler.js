const cron = require("node-cron");
const moment = require("moment");
const api = require("../libs/API");
const cUtils = require("./Service/Commands/commandUtils");
const utils = require("../libs/utils");
const logger = require("../libs/logger");

logger.info("Scheduler has been initialized");
// cron.schedule("0 6 * * * *",async () => { //매일 6시
//     await mysql.execute("DELETE FROM dailyRandomCard;");
// });

// 매일 자정에 실행
cron.schedule(
  "0 0 * * *",
  async () => {
    try {
      logger.info("Schedule - Procyon : Start Delete Old Contents");
      await cUtils.deleteOldContents();
      logger.info("Schedule - Procyon : Done Delete Old Contents");
      logger.info("Schedule - Procyon : Start Upsert Procyon");
      const api_result = await api.gamecontents(
        api.gamecontents_types.calendar
      );
      if (api_result.status == 200) {
        await cUtils.upsertProcyon(api_result.data);
        logger.info("Schedule - Procyon : Done Upsert Procyon");
      } else {
        logger.error("Schedule - Procyon : Failed Upsert Procyon");
      }
    } catch (error) {
      logger.error(`Schedule - Procyon :\n${error.stack}`);
    }
  },
  {
    timezone: "Asia/Seoul",
  }
);

//   cron.schedule('* * * * * *', () => {
//     console.log(1);
// });
