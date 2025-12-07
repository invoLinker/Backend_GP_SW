# 📋 أمثلة عملية - نظام Roles

## Viewer 👁️ (فقط أسئلة عامة)

### ✅ مسموح:
```json
POST /chatbot
Headers: { "Authorization": "Bearer <viewer_token>" }

{ "question": "مرحبا" }
→ ✅ "مرحباً! أهلاً وسهلاً بك..."

{ "question": "ما هو المشروع؟" }
→ ✅ يشرح المشروع

{ "question": "ماذا تفعل؟" }
→ ✅ يشرح الوظائف
```

### ❌ ممنوع:
```json
{ "question": "ما هو إجمالي مبلغ جميع طلبات الشراء؟" }
→ ❌ 403: "دور Viewer يمكنه فقط طرح أسئلة عامة عن النظام..."

{ "question": "كم عدد الفواتير؟" }
→ ❌ 403: "دور Viewer يمكنه فقط طرح أسئلة عامة..."

{ "question": "عرض جميع المستخدمين" }
→ ❌ 403: "دور Viewer يمكنه فقط طرح أسئلة عامة..."
```

---

## Employee 👤 (موظف عادي)

### ✅ مسموح:
```json
POST /chatbot
Headers: { "Authorization": "Bearer <employee_token>" }

{ "question": "ما هو إجمالي مبلغ جميع طلبات الشراء؟" }
→ ✅ يجيب

{ "question": "عرض جميع سندات التسليم" }
→ ✅ يجيب

{ "question": "كم عدد العناصر في المخزون؟" }
→ ✅ يجيب
```

### ❌ ممنوع:
```json
{ "question": "كم عدد الفواتير المعلقة؟" }
→ ❌ 403: "دور Employee لا يملك صلاحية للوصول إلى: supplier_invoices"

{ "question": "ما هو إجمالي المدفوعات؟" }
→ ❌ 403: "دور Employee لا يملك صلاحية للوصول إلى: payments"

{ "question": "عرض جميع المستخدمين" }
→ ❌ 403: "دور Employee لا يملك صلاحية للوصول إلى: user"
```

---

## Accountant 💰 (محاسب)

### ✅ مسموح:
```json
POST /chatbot
Headers: { "Authorization": "Bearer <accountant_token>" }

{ "question": "كم عدد الفواتير المعلقة؟" }
→ ✅ يجيب

{ "question": "ما هو إجمالي المدفوعات؟" }
→ ✅ يجيب

{ "question": "عرض جميع طلبات الشراء" }
→ ✅ يجيب
```

### ❌ ممنوع:
```json
{ "question": "عرض جميع المستخدمين" }
→ ❌ 403: "دور Accountant لا يملك صلاحية للوصول إلى: user"

{ "question": "عرض جميع سندات التسليم" }
→ ❌ 403: "دور Accountant لا يملك صلاحية للوصول إلى: delivery_notes"

{ "question": "كم عدد العناصر في المخزون؟" }
→ ❌ 403: "دور Accountant لا يملك صلاحية للوصول إلى: stock"
```

---

## Finance 💵 (مالية)

### ✅ مسموح:
```json
POST /chatbot
Headers: { "Authorization": "Bearer <finance_token>" }

{ "question": "ما هو إجمالي المدفوعات؟" }
→ ✅ يجيب

{ "question": "كم عدد الفواتير المعلقة؟" }
→ ✅ يجيب

{ "question": "ما هو إجمالي مبلغ طلبات الشراء؟" }
→ ✅ يجيب
```

### ❌ ممنوع:
```json
{ "question": "عرض جميع المستخدمين" }
→ ❌ 403: "دور Finance لا يملك صلاحية للوصول إلى: user"

{ "question": "عرض جميع سندات التسليم" }
→ ❌ 403: "دور Finance لا يملك صلاحية للوصول إلى: delivery_notes"

{ "question": "كم عدد العناصر في المخزون؟" }
→ ❌ 403: "دور Finance لا يملك صلاحية للوصول إلى: stock"
```

---

## Manager 📊 (مدير)

### ✅ مسموح:
```json
POST /chatbot
Headers: { "Authorization": "Bearer <manager_token>" }

{ "question": "ما هو إجمالي مبلغ جميع طلبات الشراء؟" }
→ ✅ يجيب

{ "question": "كم عدد الفواتير المعلقة؟" }
→ ✅ يجيب

{ "question": "عرض جميع سندات التسليم" }
→ ✅ يجيب

{ "question": "ما هو إجمالي المدفوعات؟" }
→ ✅ يجيب

{ "question": "كم عدد العناصر في المخزون؟" }
→ ✅ يجيب
```

### ❌ ممنوع:
```json
{ "question": "عرض جميع المستخدمين" }
→ ❌ 403: "دور Manager لا يملك صلاحية للوصول إلى: user"

{ "question": "عرض جميع الأدوار" }
→ ❌ 403: "دور Manager لا يملك صلاحية للوصول إلى: roles"
```

---

## Admin 👑 (مدير النظام)

### ✅ مسموح - كل شيء:
```json
POST /chatbot
Headers: { "Authorization": "Bearer <admin_token>" }

{ "question": "ما هو إجمالي مبلغ جميع طلبات الشراء؟" }
→ ✅ يجيب

{ "question": "كم عدد الفواتير المعلقة؟" }
→ ✅ يجيب

{ "question": "عرض جميع المستخدمين" }
→ ✅ يجيب

{ "question": "عرض جميع الأدوار" }
→ ✅ يجيب

{ "question": "ما هو إجمالي المدفوعات؟" }
→ ✅ يجيب

{ "question": "عرض جميع سندات التسليم" }
→ ✅ يجيب

{ "question": "كم عدد العناصر في المخزون؟" }
→ ✅ يجيب

{ "question": "أي سؤال آخر..." }
→ ✅ يجيب على كل شيء!
```

---

## ملخص

| Role | أسئلة عامة | Purchase Orders | Invoices | Payments | Users | Stock | Delivery Notes |
|------|------------|-----------------|----------|----------|-------|-------|----------------|
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Employee** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Accountant** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Finance** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Manager** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## رسائل الأخطاء

### Viewer يحاول الوصول إلى بيانات:
```json
{
  "statusCode": 403,
  "message": "دور Viewer يمكنه فقط طرح أسئلة عامة عن النظام (مثل: مرحبا، ما هو المشروع)، وليس الوصول إلى البيانات",
  "error": "Forbidden"
}
```

### Employee يحاول الوصول إلى Invoices:
```json
{
  "statusCode": 403,
  "message": "دور Employee لا يملك صلاحية للوصول إلى: supplier_invoices",
  "error": "Forbidden"
}
```

### بدون Token:
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

---

## الخلاصة

- ✅ **Viewer**: فقط أسئلة عامة، لا يرى بيانات
- ✅ **Employee**: Purchase Orders, Delivery Notes, Stock فقط
- ✅ **Accountant**: Invoices, Payments, Purchase Orders
- ✅ **Finance**: Payments, Invoices, Purchase Orders
- ✅ **Manager**: كل شيء عدا Users & Roles
- ✅ **Admin**: كل شيء!

 النظام الآن بسيط وواضح! 🎉

