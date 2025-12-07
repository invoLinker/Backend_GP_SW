import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

/**
 * خدمة الذكاء الاصطناعي للتقارير التحليلية
 * تدعم نماذج مختلفة: Groq للتحليل المنطقي، GPT/Claude للصياغة
 */
@Injectable()
export class ReportAIService {
  private readonly logger = new Logger(ReportAIService.name);
  
  // نموذج للتحليل المنطقي (Groq - سريع ومنخفض التكلفة)
  private analysisClient: OpenAI;
  private readonly analysisModel: string;
  
  // نموذج للصياغة (GPT/Claude - قوي في الكتابة)
  private writingClient: OpenAI;
  private readonly writingModel: string;

  constructor() {
    // إعداد نموذج التحليل (Groq أو بديل مفتوح المصدر)
    this.analysisClient = new OpenAI({
      apiKey: process.env.HF_TOKEN2 || process.env.GROQ_API_KEY,
      baseURL: process.env.GROQ_BASE_URL || 'https://router.huggingface.co/v1',
    });
    
    // يمكن استخدام Groq للتحليل (سريع ومنخفض التكلفة)
    this.analysisModel = process.env.REPORT_ANALYSIS_MODEL || 'meta-llama/Llama-3.1-8B-Instruct:novita';
    
    // إعداد نموذج الصياغة (نفس النموذج أو يمكن تغييره لـ GPT/Claude)
    this.writingClient = this.analysisClient; // يمكن تغييره لاستخدام GPT/Claude
    this.writingModel = process.env.REPORT_WRITING_MODEL || this.analysisModel;
  }

  /**
   * تحليل البيانات وإنشاء تقرير تحليلي
   */
  async generateAnalyticalReport(
    data: any[],
    reportName: string,
    reportDescription: string,
    language: 'ar' | 'en' = 'ar',
    customPrompt?: string
  ): Promise<string> {
    try {
      this.logger.log(`Generating analytical report: ${reportName} (${language})`);
      
      // تنظيف البيانات
      const cleanData = this.sanitizeData(data);
      
      // إنشاء prompt للتحليل
      const analysisPrompt = this.buildAnalysisPrompt(
        reportName,
        reportDescription,
        cleanData,
        language,
        customPrompt
      );
      
      // توليد التحليل
      const analysis = await this.performAnalysis(analysisPrompt, language);
      
      // تحسين الصياغة (اختياري - يمكن تفعيله لاستخدام نموذج أقوى)
      const enhancedAnalysis = await this.enhanceWriting(analysis, language);
      
      this.logger.log(`Report generated successfully: ${reportName}`);
      return enhancedAnalysis;
    } catch (error: any) {
      this.logger.error(`Error generating analytical report: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * تحليل البيانات واستخراج الأنماط
   */
  private async performAnalysis(prompt: string, language: 'ar' | 'en'): Promise<string> {
    const systemPrompt = language === 'ar'
      ? `
أنت محلل بيانات محترف متخصص في تحليل البيانات المالية والمحاسبية.

مهمتك:
- تحليل البيانات المقدمة بعمق
- استخراج الأنماط والاتجاهات المهمة
- تحديد النقاط الإيجابية والسلبية
- تقديم توصيات عملية قابلة للتطبيق
- استخدام أرقام وإحصائيات دقيقة

القواعد:
- أجب بالعربية فقط
- كن واضحاً ومختصراً
- استخدم جداول أو قوائم عند الحاجة
- قدم رؤى قابلة للتنفيذ
- لا تخترع بيانات غير موجودة
`
      : `
You are a professional data analyst specializing in financial and accounting data analysis.

Your task:
- Deeply analyze the provided data
- Extract important patterns and trends
- Identify positive and negative points
- Provide practical, actionable recommendations
- Use accurate numbers and statistics

Rules:
- Answer in English only
- Be clear and concise
- Use tables or lists when needed
- Provide actionable insights
- Do not invent missing data
`;

    const response = await this.analysisClient.chat.completions.create({
      model: this.analysisModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4, // توازن بين الإبداع والدقة
      max_tokens: 2000,
    });

    return response.choices[0].message?.content?.trim() || 
           (language === 'ar' ? 'فشل في توليد التحليل' : 'Failed to generate analysis');
  }

  /**
   * تحسين صياغة التحليل (اختياري - يمكن استخدام نموذج أقوى)
   */
  private async enhanceWriting(text: string, language: 'ar' | 'en'): Promise<string> {
    // إذا كان نفس النموذج، نرجع النص كما هو
    // يمكن تفعيل هذا لاستخدام GPT-4 أو Claude للصياغة
    if (this.writingModel === this.analysisModel) {
      return text;
    }

    const systemPrompt = language === 'ar'
      ? `
أنت كاتب محترف متخصص في صياغة التقارير الإدارية.

مهمتك:
- تحسين صياغة النص المقدم
- جعله أكثر احترافية ووضوحاً
- الحفاظ على جميع المعلومات والبيانات
- تحسين التدفق والتنظيم
`
      : `
You are a professional writer specializing in administrative report writing.

Your task:
- Improve the writing of the provided text
- Make it more professional and clear
- Preserve all information and data
- Improve flow and organization
`;

    try {
      const response = await this.writingClient.chat.completions.create({
        model: this.writingModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      return response.choices[0].message?.content?.trim() || text;
    } catch (error) {
      this.logger.warn('Failed to enhance writing, returning original text');
      return text;
    }
  }

  /**
   * بناء prompt التحليل
   */
  private buildAnalysisPrompt(
    reportName: string,
    reportDescription: string,
    data: any[],
    language: 'ar' | 'en',
    customPrompt?: string
  ): string {
    const dataSummary = this.summarizeData(data);
    
    if (language === 'ar') {
      return `
اسم التقرير: ${reportName}
الوصف: ${reportDescription}

${customPrompt || 'قم بتحليل البيانات التالية وتقديم تقرير شامل يحتوي على:'}
- ملخص تنفيذي
- النقاط الرئيسية
- الأنماط والاتجاهات
- التوصيات العملية

البيانات:
${JSON.stringify(dataSummary, null, 2)}

يرجى تقديم تحليل شامل ومفصل بالعربية.
`;
    } else {
      return `
Report Name: ${reportName}
Description: ${reportDescription}

${customPrompt || 'Please analyze the following data and provide a comprehensive report containing:'}
- Executive summary
- Key points
- Patterns and trends
- Practical recommendations

Data:
${JSON.stringify(dataSummary, null, 2)}

Please provide a comprehensive and detailed analysis in English.
`;
    }
  }

  /**
   * تنظيف البيانات قبل إرسالها للـ AI
   */
  private sanitizeData(data: any[]): any[] {
    const MAX_ROWS = 100; // حد أقصى للصفوف
    const MAX_STRING_LENGTH = 500;

    const limited = Array.isArray(data) ? data.slice(0, MAX_ROWS) : [];

    return limited.map((row) => {
      const sanitized: Record<string, any> = {};
      
      Object.entries(row).forEach(([key, value]) => {
        // تجاهل الحقول الحساسة أو غير الضرورية
        if (['id', 'createdAt', 'updatedAt', 'password', 'token'].includes(key)) {
          return;
        }

        if (typeof value === 'string') {
          sanitized[key] = value.length > MAX_STRING_LENGTH
            ? value.slice(0, MAX_STRING_LENGTH) + ' ...[truncated]'
            : value;
        } else {
          sanitized[key] = value;
        }
      });

      return sanitized;
    });
  }

  /**
   * تلخيص البيانات (إحصائيات أساسية)
   */
  private summarizeData(data: any[]): any {
    if (!Array.isArray(data) || data.length === 0) {
      return { summary: 'No data available', count: 0 };
    }

    const summary: any = {
      totalRows: data.length,
      sampleRows: data.slice(0, 10), // أول 10 صفوف كعينة
    };

    // حساب إحصائيات أساسية للحقول الرقمية
    const numericFields: Record<string, number[]> = {};
    
    data.forEach((row) => {
      Object.entries(row).forEach(([key, value]) => {
        if (typeof value === 'number') {
          if (!numericFields[key]) {
            numericFields[key] = [];
          }
          numericFields[key].push(value);
        }
      });
    });

    // حساب المجموع والمتوسط للحقول الرقمية
    const statistics: Record<string, any> = {};
    Object.entries(numericFields).forEach(([field, values]) => {
      const sum = values.reduce((a, b) => a + b, 0);
      statistics[field] = {
        sum,
        average: sum / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
      };
    });

    if (Object.keys(statistics).length > 0) {
      summary.statistics = statistics;
    }

    return summary;
  }
}

