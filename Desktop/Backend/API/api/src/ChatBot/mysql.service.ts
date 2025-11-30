// import { Injectable } from '@nestjs/common';
// import * as mysql from 'mysql2/promise';

// @Injectable()
// export class MysqlService {
//   private pool: mysql.Pool;

//   constructor() {
//     this.pool = mysql.createPool({
//       host: 'localhost',
//       user: 'root',
//       password: '123456789',
//       database: 'involinker2',
//       waitForConnections: true,
//       connectionLimit: 10,
//     });
//   }

//   async query(sql: string, params: any[] = []) {
//     const [rows] = await this.pool.query(sql, params);
//     return rows as any[];
//   }
// }

import { Injectable } from '@nestjs/common';
import * as mysql from 'mysql2/promise';

@Injectable()
export class MysqlService {
  private pool: mysql.Pool;

  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

  async query(sql: string, params: any[] = []) {
    const [rows] = await this.pool.query(sql, params);
    return rows as any[];
  }
}
