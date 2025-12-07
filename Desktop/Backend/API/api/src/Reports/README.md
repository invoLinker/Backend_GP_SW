# نظام التقارير (Reports System)

نظام مرن لإدارة التقارير يدعم نوعين من التقارير:
1. **تقارير جاهزة** (Pre-built Reports): تقارير مبنية مسبقاً تعتمد على قواعد العمل
2. **تقارير تحليلية** (AI Analytical Reports): تقارير يتم توليدها باستخدام الذكاء الاصطناعي

## المميزات

- ✅ نظام مرن لإضافة تقارير جديدة بسهولة
- ✅ دعم تقارير جاهزة وتقارير AI
- ✅ تحكم بالوصول بناءً على الأدوار (Roles)
- ✅ دعم اللغة العربية والإنجليزية
- ✅ معاملات قابلة للتخصيص
- ✅ تحليل ذكي باستخدام AI (Groq/GPT/Claude)

## البنية

```
Reports/
├── report-types.ts          # أنواع البيانات والواجهات
├── report-registry.ts        # سجل التقارير (لتسجيل التقارير الجديدة)
├── report-ai.service.ts      # خدمة الذكاء الاصطناعي للتحليل
├── reports.service.ts        # الخدمة الرئيسية
├── reports.controller.ts     # Controller للـ API
├── reports.module.ts         # NestJS Module
└── README.md                 # هذا الملف
```

## الاستخدام

### 1. الحصول على جميع التقارير المتاحة

```http
GET /reports
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "reports": [
    {
      "id": "purchase_orders_summary",
      "name": "ملخص طلبات الشراء",
      "description": "تقرير شامل عن جميع طلبات الشراء مع إحصائيات",
      "type": "pre_built",
      "outputType": "data",
      "allowedRoles": ["Admin", "Finance", "Accountant"],
      "parameters": [...]
    }
  ]
}
```

### 2. تنفيذ تقرير

```http
POST /reports/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "reportId": "purchase_orders_summary",
  "parameters": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "status": "approved"
  },
  "outputType": "both",
  "language": "ar"
}
```

**Response:**
```json
{
  "success": true,
  "reportId": "purchase_orders_summary",
  "reportName": "ملخص طلبات الشراء",
  "type": "pre_built",
  "data": [...],
  "analysis": "تحليل نصي...",
  "metadata": {
    "rowCount": 50,
    "executionTime": "234ms",
    "generatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 3. تنفيذ تقرير سريع (بدون معاملات)

```http
POST /reports/:reportId/execute
Authorization: Bearer <token>
```

## أنواع المخرجات (Output Types)

- `data`: عرض البيانات فقط (JSON/جدول)
- `ai_analysis`: تحليل نصي باستخدام AI فقط
- `both`: البيانات والتحليل معاً

## إضافة تقرير جديد

### تقرير جاهز (Pre-built)

```typescript
// في report-registry.ts
ReportRegistry.registerReport({
  id: 'my_custom_report',
  name: 'تقريري المخصص',
  description: 'وصف التقرير',
  type: ReportType.PRE_BUILT,
  outputType: ReportOutputType.DATA,
  allowedRoles: ['Admin'], // اختياري
  dataFetcher: async (params: any) => {
    // منطق جلب البيانات
    const query = `SELECT * FROM my_table WHERE ...`;
    const [results] = await sequelize.query(query);
    return results;
  },
  parameters: [
    {
      name: 'startDate',
      type: 'date',
      required: true,
      description: 'تاريخ البداية',
    },
  ],
});
```

### تقرير AI تحليلي

```typescript
ReportRegistry.registerReport({
  id: 'ai_analysis_report',
  name: 'تحليل ذكي',
  description: 'تحليل باستخدام AI',
  type: ReportType.AI_ANALYTICAL,
  outputType: ReportOutputType.AI_ANALYSIS,
  requiresAIAnalysis: true,
  dataFetcher: async (params: any) => {
    // جلب البيانات للتحليل
    const query = `SELECT ...`;
    const [results] = await sequelize.query(query);
    return results;
  },
});
```

### إضافة تقرير ديناميكياً (من الكود)

```typescript
// في أي service
constructor(private readonly reportsService: ReportsService) {}

someMethod() {
  this.reportsService.registerCustomReport({
    id: 'dynamic_report',
    name: 'تقرير ديناميكي',
    // ...
  });
}
```

## التقارير المتاحة افتراضياً

### تقارير جاهزة:
1. **purchase_orders_summary** - ملخص طلبات الشراء
2. **supplier_invoices_summary** - ملخص فواتير الموردين
3. **stock_summary** - ملخص المخزون

### تقارير AI:
1. **supplier_performance_analysis** - تحليل أداء الموردين
2. **cash_flow_analysis** - تحليل تدفق الأموال
3. **inventory_analysis** - تحليل المخزون والتنبؤ

## إعدادات AI

النظام يستخدم نماذج AI قابلة للتخصيص:

```env
# نموذج التحليل (Groq أو بديل)
REPORT_ANALYSIS_MODEL=meta-llama/Llama-3.1-8B-Instruct:novita
GROQ_API_KEY=your_key_here
GROQ_BASE_URL=https://router.huggingface.co/v1

# نموذج الصياغة (اختياري - يمكن استخدام GPT/Claude)
REPORT_WRITING_MODEL=meta-llama/Llama-3.1-8B-Instruct:novita
```

## الأمان والصلاحيات

- جميع الـ endpoints محمية بـ JWT Authentication
- يمكن تحديد الأدوار المسموح لها بالوصول لكل تقرير
- التحقق من المعاملات قبل التنفيذ

## أمثلة

### مثال 1: تقرير بسيط

```typescript
// جلب جميع التقارير
const reports = await reportsService.getAllReports('Admin');

// تنفيذ تقرير
const result = await reportsService.executeReport({
  reportId: 'stock_summary',
  language: 'ar',
});
```

### مثال 2: تقرير بمعاملات

```typescript
const result = await reportsService.executeReport({
  reportId: 'purchase_orders_summary',
  parameters: {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'approved',
  },
  outputType: 'both',
  language: 'ar',
});
```

### مثال 3: تقرير AI

```typescript
const result = await reportsService.executeReport({
  reportId: 'supplier_performance_analysis',
  outputType: 'ai_analysis',
  language: 'ar',
});
```

## ملاحظات

- التقارير الجاهزة أسرع لأنها لا تحتاج AI
- التقارير التحليلية تحتاج وقت أطول لكنها توفر رؤى أعمق
- يمكن دمج النوعين للحصول على بيانات + تحليل
- النظام يدعم إضافة تقارير جديدة بدون تعديل الكود الأساسي

## التطوير المستقبلي

- [ ] تصدير التقارير إلى PDF/Excel
- [ ] جدولة التقارير (Scheduled Reports)
- [ ] تقارير تفاعلية (Interactive Reports)
- [ ] دعم المزيد من نماذج AI
- [ ] تخزين نتائج التقارير في قاعدة البيانات

