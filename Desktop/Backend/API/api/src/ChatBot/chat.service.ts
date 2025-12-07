import { Injectable, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { LlmService } from './llm.service';
import { ChatPermissionService } from './chat-permission.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly sequelize: Sequelize,
    private readonly llm: LlmService,
    private readonly permissionService: ChatPermissionService
  ) {}

  async ask(question: string, userRole?: string) {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Processing question: ${question.substring(0, 100)}...`);

      const isArabic = /[\u0600-\u06FF]/.test(question);
      if (!question || question.trim().length === 0) {
        throw new BadRequestException(
          isArabic ? 'السؤال لا يمكن أن يكون فارغاً' : 'Question cannot be empty'
        );
      }

      const trimmedQuestion = question.trim().toLowerCase();

      if (this.isGeneralQuestion(trimmedQuestion)) {
        return await this.handleGeneralQuestion(question, startTime);
      }

      if (userRole) {
        this.logger.log(`User role: ${userRole}, Question: ${question.substring(0, 50)}...`);
        const permissionCheck = await this.permissionService.checkQuestionPermissions(userRole, question);
        this.logger.log(`Permission check result: ${JSON.stringify(permissionCheck)}`);
        if (!permissionCheck.allowed) {
          const friendlyMessage = permissionCheck.reason || (
            isArabic
              ? 'عذراً، لا يمكنني الإجابة على سؤالك بناءً على الصلاحيات المعطاة لي.'
              : 'Sorry, I cannot answer your question based on the permissions granted to me.'
          );
          throw new ForbiddenException(friendlyMessage);
        }
      }

      this.logger.log('Generating SQL from question...');
      const sql = await this.llm.generateSQL(question);
      this.logger.log(`Generated SQL: ${sql}`);

      if (!sql.toLowerCase().trim().startsWith('select')) {
        throw new BadRequestException(
          isArabic
            ? 'تم توليد استعلام غير آمن. يرجى المحاولة مرة أخرى.'
            : 'An unsafe query was generated. Please try again.'
        );
      }

      if (userRole) {
        try {
          await this.permissionService.checkPermissions(userRole, sql);
        } catch (error: any) {
          if (error.message === 'PERMISSION_DENIED' || error.statusCode === 403) {
            throw new ForbiddenException(
              isArabic
                ? 'عذراً، لا يمكنني الإجابة على سؤالك بناءً على الصلاحيات المعطاة لي.'
                : 'Sorry, I cannot answer your question based on the permissions granted to me.'
            );
          }
          throw error;
        }
      }

      this.logger.log('Executing SQL query...');
      const [rows] = await this.sequelize.query(sql);
      const rowCount = Array.isArray(rows) ? rows.length : 0;
      this.logger.log(`Query returned ${rowCount} rows`);

      this.logger.log('Formatting answer...');
      const answer = await this.llm.formatAnswer(question, rows);

      const executionTime = Date.now() - startTime;
      this.logger.log(`Question processed successfully in ${executionTime}ms`);

      return {
        success: true,
        answer,
        rows: Array.isArray(rows) ? rows : [],
        metadata: {
          rowCount,
          executionTime: `${executionTime}ms`,
        },
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      const isArabic = /[\u0600-\u06FF]/.test(question);

      if (error instanceof ForbiddenException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Error processing question: ${error.message}`, error.stack);

      if (error.message?.includes('SQL') || error.message?.includes('syntax')) {
        throw new BadRequestException(
          isArabic
            ? 'حدث خطأ في الاستعلام. يرجى إعادة صياغة السؤال بشكل أوضح.'
            : 'An error occurred in the query. Please rephrase your question more clearly.'
        );
      }

      if (error.message?.includes('database') || error.message?.includes('table')) {
        throw new BadRequestException(
          isArabic
            ? 'حدث خطأ في الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى لاحقاً.'
            : 'An error occurred connecting to the database. Please try again later.'
        );
      }

      throw new BadRequestException(
        isArabic
          ? `حدث خطأ أثناء معالجة السؤال: ${error.message || 'خطأ غير معروف'}`
          : `An error occurred while processing the question: ${error.message || 'Unknown error'}`
      );
    }
  }

 
  private isGeneralQuestion(question: string): boolean {
    const generalKeywords = [
      'مرحبا', 'مرحب', 'السلام', 'السلام عليكم', 'أهلا', 'أهلاً', 'هاي', 'هلا',
      'كيف حالك', 'كيفك', 'شلونك', 'شلون', 'وينك', 'وين',
      'صباح الخير', 'مساء الخير', 'مساء النور',
      'شكرا', 'شكراً', 'مشكور', 'تسلم', 'الله يسلمك',
      'مع السلامة', 'باي', 'وداع',

      'hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening',
      'how are you', 'how do you do', 'what\'s up', 'sup',
      'thanks', 'thank you', 'bye', 'goodbye', 'see you',
      
      'ما هو المشروع', 'عن المشروع', 'عن النظام', 'ما هو النظام',
      'ماذا تفعل', 'ماذا تقدر', 'شو تقدر', 'شو بتقدر',
      'what is the project', 'about the project', 'what is this system',
      'what can you do', 'what do you do', 'tell me about',
      'help', 'مساعدة', 'مساعدة', 'help me',
    ];

    return generalKeywords.some(keyword => question.includes(keyword));
  }

 
  private async handleGeneralQuestion(question: string, startTime: number) {
    const isArabic = /[\u0600-\u06FF]/.test(question);
    const trimmedQuestion = question.trim().toLowerCase();

    const projectInfo = isArabic
      ? `نظام إدارة المشتريات والفواتير (ERP/Accounting System)

      هذا النظام يساعدك في إدارة:
      - طلبات الشراء (Purchase Orders)
      - فواتير الموردين (Supplier Invoices)
      - سندات التسليم (Delivery Notes)
      - إيصالات الاستلام (Goods Receipts)
      - المدفوعات (Payments)
      - المخزون (Stock)
      - المهام (Tasks)
      - المستخدمين والأدوار (Users & Roles)

      يمكنني مساعدتك في:
      - الإجابة على أسئلة عن البيانات في قاعدة البيانات
      - تحليل البيانات والإحصائيات
      - البحث عن معلومات محددة
      - مقارنة البيانات

      فقط اسألني أي سؤال عن البيانات وسأجيبك!`
            : `Purchase Orders & Invoices Management System (ERP/Accounting)

      This system helps you manage:
      - Purchase Orders
      - Supplier Invoices
      - Delivery Notes
      - Goods Receipts
      - Payments
      - Stock
      - Tasks
      - Users & Roles

      I can help you with:
      - Answering questions about database data
      - Data analysis and statistics
      - Searching for specific information
      - Comparing data

      Just ask me any question about the data and I'll answer!`;

    if (trimmedQuestion.includes('مرحبا') || trimmedQuestion.includes('hello') || 
        trimmedQuestion.includes('hi') || trimmedQuestion.includes('hey') ||
        trimmedQuestion.includes('أهلا') || trimmedQuestion.includes('هلا')) {
      const greeting = isArabic
        ? 'مرحباً! أهلاً وسهلاً بك. أنا مساعدك الذكي لمساعدتك في الإجابة على أسئلتك عن قاعدة البيانات.\n\n' + projectInfo
        : 'Hello! Welcome. I\'m your smart assistant to help you answer questions about the database.\n\n' + projectInfo;
      
      return {
        success: true,
        answer: greeting,
        rows: [],
        metadata: {
          rowCount: 0,
          executionTime: `${Date.now() - startTime}ms`,
        },
      };
    }

    if (trimmedQuestion.includes('مشروع') || trimmedQuestion.includes('نظام') ||
        trimmedQuestion.includes('project') || trimmedQuestion.includes('system') ||
        trimmedQuestion.includes('ماذا تفعل') || trimmedQuestion.includes('what can you')) {
      return {
        success: true,
        answer: projectInfo,
        rows: [],
        metadata: {
          rowCount: 0,
          executionTime: `${Date.now() - startTime}ms`,
        },
      };
    }

    if (trimmedQuestion.includes('شكر') || trimmedQuestion.includes('thanks') ||
        trimmedQuestion.includes('thank')) {
      const thanks = isArabic
        ? 'العفو! أنا هنا لمساعدتك دائماً. إذا كان لديك أي سؤال عن البيانات، فقط اسألني.'
        : 'You\'re welcome! I\'m always here to help. If you have any questions about the data, just ask me.';
      
      return {
        success: true,
        answer: thanks,
        rows: [],
        metadata: {
          rowCount: 0,
          executionTime: `${Date.now() - startTime}ms`,
        },
      };
    }

    const generalAnswer = await this.llm.formatAnswer(question, []);
    
    return {
      success: true,
      answer: generalAnswer,
      rows: [],
      metadata: {
        rowCount: 0,
        executionTime: `${Date.now() - startTime}ms`,
      },
    };
  }
}
