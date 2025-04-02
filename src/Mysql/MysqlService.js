const fs = require("fs");
const utils = require("../../libs/utils");
const env = require("../../libs/env");
const mysql = require("mysql2");
const logger = require("../../libs/logger");
class MysqlService {
  dmlQueue = [];
  queryQueue = [];

  constructor() {

  }

  async init(){
    this.createConnectionPool();
    await this.createTables();
  }

  createConnectionPool() {
    this.inerternalPool = mysql.createPool({
      host: env["DB_HOST"],
      port: env["DB_PORT"],
      user: env["DB_USER"],
      password: env["DB_PASSWORD"],
      database: env["DB_SCHEMA"],
      connectionLimit: 30,
      enableKeepAlive: true,
      queueLimit: 0,
      waitForConnections: true,
    });
    this.pool = this.inerternalPool.promise();
  }

  async createTables() {
    const text = fs.readFileSync(`${__dirname}/schema.txt`, "utf-8");
    text.split(";").forEach(async (qry) => {
      if (qry.IsNullOrWhiteSpace()) {
        return;
      }
      const result = await this.execute(qry);
    });
  }

  async execute(qry, params) {
    return await this.pool.execute(qry, params);
  } //execute

  async query(qry, params) {
    return await this.pool.query(qry, params);
  }


  async transaction(querySet){
    // let querySet = [
    //   {
    //     qry: "SELECT ...",
    //     params: [1,2,3]
    //   }
    // ];
    let conn;
try{
  conn = await this.pool.getConnection();
  conn.beginTransaction();
  for(let set of querySet){
    await conn.execute(set.qry, set.params);
  }
  conn.commit();

}catch(error){
  logger.error(`MysqlServer.transaction. : ${error}`);
  if(conn){
    conn.rollback();
  }
  throw error;
}finally{
  if(conn){
    conn.release();
  }

}
  }
}

 async function create() {
  const service = new MysqlService();
   await service.init();
  return service;
}

module.exports = { create };
