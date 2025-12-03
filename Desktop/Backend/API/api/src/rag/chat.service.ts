import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { LlmService } from './llm.service';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ChatResponse {
  answer: string;
  sql?: string;
  rows?: any[];
  analysis?: any;
  metadata?: {
    rowCount: number;
    executionTime: number;
    queryType: 'question' | 'analysis' | 'general';
  };
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private conversationHistory: Map<string, ChatMessage[]> = new Map();

  constructor(
    private readonly sequelize: Sequelize,
    private readonly llm: LlmService
  ) {}

  /**
   * Main method to handle user questions
   */
  async ask(
    question: string,
    sessionId?: string,
    includeSql: boolean = false,
  ): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      // Detect query type
      const queryType = this.detectQueryType(question);

      // Handle general questions (not database-related)
      if (queryType === 'general') {
        return await this.handleGeneralQuestion(question, startTime);
      }

      // Handle database questions and analyses
      const sql = await this.llm.generateSQL(question);
      this.logger.log(`Generated SQL: ${sql}`);

      // Execute SQL query
      const [rows] = await this.sequelize.query(sql);
      const executionTime = Date.now() - startTime;

      // Format answer
      const answer = await this.llm.formatAnswer(question, rows);

      // Perform analysis if needed
      let analysis = null;
      if (queryType === 'analysis' || this.requiresAnalysis(question, rows)) {
        analysis = await this.performAnalysis(question, rows);
      }

      // Store conversation history
      if (sessionId) {
        this.addToHistory(sessionId, question, answer);
      }

      const response: ChatResponse = {
        answer,
        rows: Array.isArray(rows) ? rows : [],
        analysis,
        metadata: {
          rowCount: Array.isArray(rows) ? rows.length : 0,
          executionTime,
          queryType,
        },
      };

      if (includeSql) {
        response.sql = sql;
      }

      return response;
    } catch (error: any) {
      this.logger.error(`Error processing question: ${error.message}`, error.stack);
      
      // Provide user-friendly error messages
      if (error.message?.includes('SELECT')) {
        throw new BadRequestException(
          'I had trouble generating a valid database query. Could you rephrase your question?'
        );
      }

      if (error.message?.includes('SQL')) {
        throw new BadRequestException(
          'There was an error executing the database query. Please try again or rephrase your question.'
        );
      }

      throw new BadRequestException(
        `I encountered an error: ${error.message}. Please try again.`
      );
    }
  }

  /**
   * Detect the type of query
   */
  private detectQueryType(question: string): 'question' | 'analysis' | 'general' {
    const q = question.toLowerCase();

    // Check if it's a general question (greeting, etc.)
    const generalKeywords = [
      'hello', 'hi', 'hey', 'how are you', 'what can you do',
      'help', 'thanks', 'thank you', 'bye',
      'مرحبا', 'السلام', 'كيف حالك', 'شكرا'
    ];

    if (generalKeywords.some(keyword => q.includes(keyword))) {
      return 'general';
    }

    // Check if it's an analysis request
    const analysisKeywords = [
      'analyze', 'analysis', 'trend', 'compare', 'summary', 'overview',
      'statistics', 'stats', 'average', 'mean', 'total', 'breakdown',
      'تحليل', 'مقارنة', 'إحصائيات', 'نظرة عامة', 'ملخص'
    ];

    if (analysisKeywords.some(keyword => q.includes(keyword))) {
      return 'analysis';
    }

    return 'question';
  }

  /**
   * Handle general questions (not database-related)
   */
  private async handleGeneralQuestion(
    question: string,
    startTime: number,
  ): Promise<ChatResponse> {
    const answer = await this.llm.formatAnswer(question, []);
    const executionTime = Date.now() - startTime;

    return {
      answer,
      metadata: {
        rowCount: 0,
        executionTime,
        queryType: 'general',
      },
    };
  }

  /**
   * Check if analysis is required based on question and results
   */
  private requiresAnalysis(question: string, rows: any[]): boolean {
    if (!Array.isArray(rows) || rows.length === 0) {
      return false;
    }

    // If result has many rows, might need analysis
    if (rows.length > 10) {
      return true;
    }

    // Check for analysis keywords
    const q = question.toLowerCase();
    const analysisKeywords = [
      'show', 'list', 'all', 'many', 'multiple',
      'عرض', 'قائمة', 'كل', 'جميع'
    ];

    return analysisKeywords.some(keyword => q.includes(keyword));
  }

  /**
   * Perform analysis on query results
   */
  private async performAnalysis(question: string, rows: any[]): Promise<any> {
    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        summary: 'No data available for analysis.',
        insights: [],
      };
    }

    // Basic statistical analysis
    const analysis: any = {
      totalRecords: rows.length,
      insights: [],
    };

    // Try to identify numeric columns for statistical analysis
    const numericColumns: string[] = [];
    if (rows.length > 0) {
      Object.keys(rows[0]).forEach(key => {
        const sampleValue = rows[0][key];
        if (
          typeof sampleValue === 'number' &&
          !isNaN(sampleValue) &&
          !Number.isInteger(sampleValue) ||
          (typeof sampleValue === 'number' && Number.isInteger(sampleValue))
        ) {
          numericColumns.push(key);
        }
      });
    }

    // Calculate statistics for numeric columns
    if (numericColumns.length > 0) {
      analysis.statistics = {};
      numericColumns.forEach(column => {
        const values = rows
          .map(row => row[column])
          .filter(val => val != null && !isNaN(val));

        if (values.length > 0) {
          const sum = values.reduce((a, b) => a + b, 0);
          const avg = sum / values.length;
          const min = Math.min(...values);
          const max = Math.max(...values);

          analysis.statistics[column] = {
            sum,
            average: avg.toFixed(2),
            min,
            max,
            count: values.length,
          };
        }
      });
    }

    // Generate insights using LLM
    try {
      const insightsPrompt = `
Based on the following data, provide 3-5 key insights or observations:

Data (first 20 rows):
${JSON.stringify(rows.slice(0, 20), null, 2)}

Question: ${question}

Provide insights in a clear, concise format. Focus on patterns, trends, or notable findings.
      `;

      const insights = await this.llm.formatAnswer(insightsPrompt, rows.slice(0, 20));
      analysis.insights = insights;
    } catch (error) {
      this.logger.warn('Failed to generate LLM insights', error);
      analysis.insights = ['Analysis completed. Review the data above for details.'];
    }

    return analysis;
  }

  /**
   * Add message to conversation history
   */
  private addToHistory(sessionId: string, question: string, answer: string): void {
    if (!this.conversationHistory.has(sessionId)) {
      this.conversationHistory.set(sessionId, []);
    }

    const history = this.conversationHistory.get(sessionId)!;
    history.push(
      { role: 'user', content: question, timestamp: new Date() },
      { role: 'assistant', content: answer, timestamp: new Date() },
    );

    // Keep only last 20 messages (10 exchanges)
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
  }

  /**
   * Get conversation history for a session
   */
  getHistory(sessionId: string): ChatMessage[] {
    return this.conversationHistory.get(sessionId) || [];
  }

  /**
   * Clear conversation history for a session
   */
  clearHistory(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
  }

  /**
   * Perform advanced analysis (trends, comparisons, etc.)
   */
  async performAdvancedAnalysis(
    question: string,
    analysisType: 'trend' | 'comparison' | 'summary',
  ): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      // Generate SQL for analysis
      const analysisPrompt = this.buildAnalysisPrompt(question, analysisType);
      const sql = await this.llm.generateSQL(analysisPrompt);

      this.logger.log(`Analysis SQL: ${sql}`);

      const [rows] = await this.sequelize.query(sql);
      const executionTime = Date.now() - startTime;

      // Generate comprehensive analysis
      const answer = await this.llm.formatAnswer(question, rows);
      const analysis = await this.performAnalysis(question, rows);

      return {
        answer,
        sql,
        rows: Array.isArray(rows) ? rows : [],
        analysis,
        metadata: {
          rowCount: Array.isArray(rows) ? rows.length : 0,
          executionTime,
          queryType: 'analysis',
        },
      };
    } catch (error: any) {
      this.logger.error(`Analysis error: ${error.message}`, error.stack);
      throw new BadRequestException(`Analysis failed: ${error.message}`);
    }
  }

  /**
   * Build analysis prompt based on type
   */
  private buildAnalysisPrompt(question: string, type: string): string {
    const baseQuestion = question;

    switch (type) {
      case 'trend':
        return `${baseQuestion} Show trends over time with appropriate grouping.`;
      case 'comparison':
        return `${baseQuestion} Compare different categories or periods.`;
      case 'summary':
        return `${baseQuestion} Provide a comprehensive summary with aggregations.`;
      default:
        return baseQuestion;
    }
  }
}
