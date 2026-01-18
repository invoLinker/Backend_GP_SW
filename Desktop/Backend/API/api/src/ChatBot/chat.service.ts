import { Injectable, BadRequestException, Logger, ForbiddenException, NotAcceptableException } from '@nestjs/common';
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

  async ask(question: string, userRole?: string, userId?: number) {
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
          throw new NotAcceptableException(friendlyMessage);
        }
      }

      this.logger.log('Generating SQL from question...');
      this.logger.log(`Question: ${question}`);
      this.logger.log(`User role: ${userRole}, UserId: ${userId}`);
      let sql = await this.llm.generateSQL(question);
      this.logger.log(`Generated SQL (before filter): ${sql}`);
      
      // If user is Supplier, filter suppliers by user_id
      if (userRole === 'Supplier' && userId) {
        const sqlLower = sql.toLowerCase();
        // Check if query involves suppliers table - more comprehensive check
        const hasSuppliersTable = sqlLower.includes('from suppliers') || 
                                   sqlLower.includes('join suppliers') || 
                                   sqlLower.includes(' suppliers ') || 
                                   sqlLower.includes('`suppliers`') ||
                                   sqlLower.includes('from `suppliers`') || 
                                   sqlLower.includes('join `suppliers`') ||
                                   sqlLower.includes('suppliers.supplier_id') ||
                                   sqlLower.includes('suppliers.supplier_name') ||
                                   sqlLower.includes('suppliers.user_id');
        
        if (hasSuppliersTable) {
          // Check if already filtered by user_id
          const alreadyFiltered = sqlLower.includes(`suppliers.user_id = ${userId}`) || 
                                  sqlLower.includes(`user_id = ${userId}`) ||
                                  sqlLower.includes(`s.user_id = ${userId}`);
          
          if (!alreadyFiltered) {
            // Determine the alias used for suppliers table
            let supplierAlias = 'suppliers';
            const aliasMatch = sql.match(/from\s+suppliers\s+(\w+)/i) || sql.match(/join\s+suppliers\s+(\w+)/i);
            if (aliasMatch && aliasMatch[1]) {
              supplierAlias = aliasMatch[1];
            }
            
            // Add WHERE clause to filter by user_id
            // Handle different SQL patterns
            if (sqlLower.includes(' where ')) {
              // Add AND condition
              sql = sql.replace(/ where /gi, ` WHERE ${supplierAlias}.user_id = ${userId} AND `);
            } else {
              // No WHERE clause - add one before GROUP BY, ORDER BY, or LIMIT
              const groupByIndex = sqlLower.indexOf(' group by');
              const orderByIndex = sqlLower.indexOf(' order by');
              const limitIndex = sqlLower.indexOf(' limit');
              
              let insertIndex = sql.length;
              if (groupByIndex !== -1) insertIndex = Math.min(insertIndex, groupByIndex);
              if (orderByIndex !== -1) insertIndex = Math.min(insertIndex, orderByIndex);
              if (limitIndex !== -1) insertIndex = Math.min(insertIndex, limitIndex);
              
              // Insert WHERE clause
              const beforeWhere = sql.substring(0, insertIndex).trim();
              const afterWhere = sql.substring(insertIndex).trim();
              sql = `${beforeWhere} WHERE ${supplierAlias}.user_id = ${userId} ${afterWhere}`;
            }
            this.logger.log(`[Supplier Filter] Filtered SQL for Supplier user (${userId}): ${sql}`);
          } else {
            this.logger.log(`[Supplier Filter] SQL already contains user_id filter for user ${userId}`);
          }
        } else {
          this.logger.log(`[Supplier Filter] Query does not involve suppliers table, skipping filter`);
        }
      } else {
        this.logger.log(`[Supplier Filter] User role is not Supplier or userId is missing. Role: ${userRole}, UserId: ${userId}`);
      }

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
          if (error.message === 'PERMISSION_DENIED' || error.statusCode === 401) {
            throw new NotAcceptableException(
              isArabic
                ? 'عذراً، لا يمكنني الإجابة على سؤالك بناءً على الصلاحيات المعطاة لي.'
                : 'Sorry, I cannot answer your question based on the permissions granted to me.'
            );
          }
          // throw error;
        }
      }

      this.logger.log('Executing SQL query...');
      this.logger.log(`Final SQL: ${sql}`);
      
      let rows: any[];
      try {
        [rows] = await this.sequelize.query(sql);
      } catch (error: any) {
        this.logger.error(`SQL execution error: ${error.message}`);
        this.logger.error(`Failed SQL: ${sql}`);
        throw new BadRequestException(
          isArabic
            ? `خطأ في تنفيذ الاستعلام: ${error.message}`
            : `SQL execution error: ${error.message}`
        );
      }
      
      const rowCount = Array.isArray(rows) ? rows.length : 0;
      this.logger.log(`Query returned ${rowCount} rows`);
      if (rowCount === 0) {
        this.logger.warn(`Query returned 0 rows. SQL: ${sql}`);
        this.logger.warn(`User role: ${userRole}, UserId: ${userId}`);
      } else {
        this.logger.log(`First row sample: ${JSON.stringify(rows[0])}`);
      }

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
      'مع السلامة', 'باي', 'وداع', 'يسلمو',

      'hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening',
      'how are you', 'how do you do', 'what\'s up', 'sup',
      'thanks', 'thank you', 'bye', 'goodbye', 'see you',
      
      'ما هو المشروع', 'عن المشروع', 'عن النظام', 'ما هو النظام',
      'ماذا يفعل', 'ماذا تفعل', 'ماذا تقدر', 'شو تقدر', 'شو بتقدر',
      'شو فكرته', 'شو فكرة', 'ما فكرته', 'ما فكرة', 'فكرة المشروع', 'فكرة النظام', 'فكرة',
      'what is the project', 'about the project', 'what is this system',
      'what can you do', 'what do you do', 'tell me about', 'what does it do', 'what does the project do',
      'what is the idea', 'idea of', 'idea of the', 'what is the app', 'what is the application',
      'help', 'مساعدة', 'مساعدة', 'help me',
    ];

    return generalKeywords.some(keyword => question.includes(keyword));
  }

 
  private async handleGeneralQuestion(question: string, startTime: number) {
    const isArabic = /[\u0600-\u06FF]/.test(question);
    const trimmedQuestion = question.trim().toLowerCase();

    const projectInfo = isArabic
      ? `🔍 نظام إدارة المشتريات والفواتير (ERP/Accounting System)

      هذا النظام يساعدك في:
      - استقبال فواتير الموردين
      - مطابقة الفواتير مع أوامر الشراء وسندات الاستلام
      - كشف الأخطاء والتضارب تلقائيًا باستخدام الذكاء الاصطناعي
      - تنبيه المسؤولين لاتخاذ القرار المناسب
      - تتبع دورة حياة الفاتورة من الإنشاء حتى الدفع والموافقة

      يمكنني مساعدتك في:
      - تحليل الفواتير والبيانات
      - البحث عن معلومات محددة
      - مقارنة البيانات بين المستندات
      - كشف حالات الشذوذ وإعطاء ملاحظات

      فقط اسألني أي سؤال عن الفواتير أو النظام وسأساعدك!`
      : `🔍 Purchase Orders & Invoices Management System (ERP/Accounting)

      This platform helps you:
      - Receive supplier invoices
      - Match invoices with purchase orders and receipts
      - Automatically detect discrepancies and errors using AI
      - Notify responsible teams for review and decision-making
      - Track invoice lifecycle from creation to approval and payment

      I can help you with:
      - Invoice analysis and data insight
      - Searching for specific information
      - Comparing invoices with reference documents
      - Detecting anomalies and providing recommendations

      Just ask me anything about invoices or the system — I'm here to help!`;


    if (trimmedQuestion.includes('مرحبا') || trimmedQuestion.includes('hello') || 
        trimmedQuestion.includes('hi') || trimmedQuestion.includes('hey') ||
        trimmedQuestion.includes('أهلا') || trimmedQuestion.includes('هلا')) {
      const greeting = isArabic
        ? `مرحباً! 👋

    أنا مساعدك الذكي في نظام ERP لإدارة المشتريات والفواتير.

    هذا النظام يساعدك في:
    • تتبع المشتريات وطلبات الشراء
    • تدقيق الفواتير والمطابقة مع المستندات
    • إدارة المخزون والمدفوعات
    • تحليل البيانات والإحصائيات

    اسألني أي سؤال عن البيانات وسأساعدك! 💬`
            : `Hello! 👋

    I'm your smart assistant for the ERP system for managing purchases and invoices.

    This system helps you with:
    • Tracking purchases and purchase orders
    • Auditing invoices and matching with documents
    • Managing inventory and payments
    • Data analysis and statistics

    Ask me any question about the data and I'll help you! 💬`;
      
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

    // رد على "كيفك" أو "كيف حالك"
    if (trimmedQuestion.includes('كيفك') || trimmedQuestion.includes('كيف حالك') ||
        trimmedQuestion.includes('شلونك') || trimmedQuestion.includes('شلون') ||
        trimmedQuestion.includes('how are you') || trimmedQuestion.includes('how do you do')) {
      const howAreYou = isArabic
        ? 'تمام وانت كيفك؟ 😊\n\nإذا عندك أي سؤال عن البيانات أو النظام، أنا جاهز!'
        : 'I\'m doing great, thanks! How are you? 😊\n\nIf you have any questions about the data or system, I\'m here to help!';
      
      return {
        success: true,
        answer: howAreYou,
        rows: [],
        metadata: {
          rowCount: 0,
          executionTime: `${Date.now() - startTime}ms`,
        },
      };
    }

    if (trimmedQuestion.includes('مشروع') || trimmedQuestion.includes('نظام') ||
        trimmedQuestion.includes('project') || trimmedQuestion.includes('system') ||
        trimmedQuestion.includes('app') || trimmedQuestion.includes('idea') ||
         trimmedQuestion.includes('فكرة') ||
        trimmedQuestion.includes('ماذا يفعل') || trimmedQuestion.includes('what can you')) {
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

    if (trimmedQuestion.includes('شكرا') || trimmedQuestion.includes('thanks') ||
        trimmedQuestion.includes('thank') || trimmedQuestion.includes('يسلمو')) {
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