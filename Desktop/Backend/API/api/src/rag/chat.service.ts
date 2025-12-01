import { Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { LlmService } from './llm.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly llm: LlmService
  ) {}

  async ask(question: string) {
    const sql = await this.llm.generateSQL(question);
    console.log("Generated SQL:", sql);

    const [rows] = await this.sequelize.query(sql);

    const answer = await this.llm.formatAnswer(question, rows);

    return { sql, rows, answer };
  }
}
