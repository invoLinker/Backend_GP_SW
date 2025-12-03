import { Controller, Post, Body, Get, Delete, Param, Query } from '@nestjs/common';
import { ChatService, ChatMessage } from './chat.service';

export class AskQuestionDto {
  question: string;
  sessionId?: string;
  includeSql?: boolean;
}

export class AnalysisRequestDto {
  question: string;
  analysisType?: 'trend' | 'comparison' | 'summary';
  sessionId?: string;
  includeSql?: boolean;
}

@Controller('chat')
export class ChatController {
  constructor(private chat: ChatService) {}

  /**
   * Main endpoint for asking questions
   * POST /chat/ask
   */
  @Post('ask')
  async ask(@Body() body: AskQuestionDto) {
    const { question, sessionId, includeSql = false } = body;
    
    if (!question || question.trim().length === 0) {
      return {
        error: 'Question is required',
        answer: 'Please provide a question to get started.',
      };
    }

    return await this.chat.ask(question, sessionId, includeSql);
  }

  /**
   * Endpoint for advanced analysis
   * POST /chat/analyze
   */
  @Post('analyze')
  async analyze(@Body() body: AnalysisRequestDto) {
    const { question, analysisType = 'summary', sessionId, includeSql = false } = body;
    
    if (!question || question.trim().length === 0) {
      return {
        error: 'Question is required',
        answer: 'Please provide a question for analysis.',
      };
    }

    return await this.chat.performAdvancedAnalysis(question, analysisType);
  }

  /**
   * Get conversation history for a session
   * GET /chat/history/:sessionId
   */
  @Get('history/:sessionId')
  getHistory(@Param('sessionId') sessionId: string): ChatMessage[] {
    return this.chat.getHistory(sessionId);
  }

  /**
   * Clear conversation history for a session
   * DELETE /chat/history/:sessionId
   */
  @Delete('history/:sessionId')
  clearHistory(@Param('sessionId') sessionId: string) {
    this.chat.clearHistory(sessionId);
    return { message: 'Conversation history cleared', sessionId };
  }

  /**
   * Health check endpoint
   * GET /chat/health
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'chatbot',
      timestamp: new Date().toISOString(),
    };
  }
}
