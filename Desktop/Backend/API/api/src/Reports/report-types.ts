/**
 * أنواع التقارير المتاحة في النظام
 */
export enum ReportType {
  /** تقارير جاهزة مبنية مسبقاً - تعتمد على قواعد العمل */
  PRE_BUILT = 'pre_built',
  
  /** تقارير تحليلية يتم توليدها باستخدام الذكاء الاصطناعي */
  AI_ANALYTICAL = 'ai_analytical',
}

/**
 * نوع مخرج التقرير
 */
export enum ReportOutputType {
  /** عرض البيانات مباشرة (جدول/JSON) */
  DATA = 'data',
  
  /** تحليل نصي باستخدام AI */
  AI_ANALYSIS = 'ai_analysis',
  
  /** كليهما - البيانات والتحليل */
  BOTH = 'both',
}

/**
 * تعريف التقرير
 */
export interface ReportDefinition {
  /** معرف فريد للتقرير */
  id: string;
  
  /** اسم التقرير */
  name: string;
  
  /** وصف التقرير */
  description: string;
  
  /** نوع التقرير */
  type: ReportType;
  
  /** الأدوار المسموح لها بالوصول (فارغ = جميع الأدوار) */
  allowedRoles?: string[];
  
  /** نوع المخرج المطلوب */
  outputType: ReportOutputType;
  
  /** دالة لجلب البيانات (للتقارير الجاهزة) */
  dataFetcher?: (params: any) => Promise<any>;
  
  /** SQL query (للتقارير الجاهزة) */
  sqlQuery?: string | ((params: any) => string);
  
  /** هل يحتاج تحليل AI */
  requiresAIAnalysis?: boolean;
  
  /** معاملات التقرير */
  parameters?: ReportParameter[];
}

/**
 * معاملات التقرير
 */
export interface ReportParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select';
  required: boolean;
  description: string;
  defaultValue?: any;
  options?: { label: string; value: any }[]; // للـ select
}

/**
 * طلب التقرير
 */
export interface ReportRequest {
  reportId: string;
  parameters?: Record<string, any>;
  outputType?: ReportOutputType;
  language?: 'ar' | 'en';
}

/**
 * استجابة التقرير
 */
export interface ReportResponse {
  success: boolean;
  reportId: string;
  reportName: string;
  type: ReportType;
  data?: any;
  analysis?: string;
  metadata?: {
    rowCount?: number;
    executionTime?: string;
    generatedAt?: Date;
  };
  error?: string;
}

