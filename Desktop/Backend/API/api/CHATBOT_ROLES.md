# 🔐 نظام Roles للـ Chatbot

## نظرة عامة

الـ Chatbot الآن يعمل بناءً على **الـ Roles** مباشرة. كل role له tables مسموحة، والـ chatbot يتحقق من الـ role قبل الإجابة.

## الـ Roles المدعومة

### 1. Admin 👑
**يرى كل شيء:**
- ✅ Purchase Orders
- ✅ Supplier Invoices
- ✅ Delivery Notes
- ✅ Goods Receipts
- ✅ Payments
- ✅ Stock
- ✅ Items
- ✅ Users & Roles
- ✅ Tasks
- ✅ History Log
- ✅ كل شيء!

### 2. Accountant 💰
**بيانات محاسبية فقط:**
- ✅ Supplier Invoices
- ✅ Payments
- ✅ Purchase Orders
- ❌ Users
- ❌ Roles
- ❌ Delivery Notes

### 3. Finance 💵
**بيانات مالية فقط:**
- ✅ Payments
- ✅ Supplier Invoices
- ✅ Purchase Orders
- ❌ Users
- ❌ Stock
- ❌ Delivery Notes

### 4. Manager 📊
**إدارة:**
- ✅ Purchase Orders
- ✅ Supplier Invoices
- ✅ Delivery Notes
- ✅ Goods Receipts
- ✅ Payments
- ✅ Stock
- ✅ Items
- ✅ Tasks
- ❌ Users & Roles

### 5. Employee 👤
**موظف عادي:**
- ✅ Purchase Orders
- ✅ Delivery Notes
- ✅ Stock
- ✅ Items
- ❌ Invoices
- ❌ Payments
- ❌ Users

### 6. Viewer 👁️
**فقط أسئلة عامة:**
- ✅ "مرحبا"
- ✅ "ما هو المشروع؟"
- ✅ "ماذا تفعل؟"
- ❌ **لا يرى أي بيانات من قاعدة البيانات**

---

## أمثلة عملية

### مثال 1: Viewer يسأل سؤال عام ✅

**السؤال:**
```json
{
  "question": "مرحبا"
}
```

**الرد:**
```json
{
  "success": true,
  "answer": "مرحباً! أهلاً وسهلاً بك...",
  "rows": []
}
```

---

### مثال 2: Viewer يسأل عن بيانات ❌

**السؤال:**
```json
{
  "question": "ما هو إجمالي مبلغ جميع طلبات الشراء؟"
}
```

**الرد:**
```json
{
  "statusCode": 403,
  "message": "Viewer role can only ask general questions about the system, not access data",
  "error": "Forbidden"
}
```

**أو بالعربية:**
```json
{
  "statusCode": 403,
  "message": "دور Viewer يمكنه فقط طرح أسئلة عامة عن النظام، وليس الوصول إلى البيانات",
  "error": "Forbidden"
}
```

---

### مثال 3: Accountant يسأل عن Invoices ✅

**السؤال:**
```json
{
  "question": "كم عدد الفواتير المعلقة؟"
}
```

**الرد:**
```json
{
  "success": true,
  "answer": "عدد الفواتير المعلقة هو 15 فاتورة",
  "rows": [...]
}
```

---

### مثال 4: Accountant يسأل عن Users ❌

**السؤال:**
```json
{
  "question": "كم عدد المستخدمين؟"
}
```

**الرد:**
```json
{
  "statusCode": 403,
  "message": "You don't have permission to access: user with role \"Accountant\"",
  "error": "Forbidden"
}
```

---

### مثال 5: Employee يسأل عن Purchase Orders ✅

**السؤال:**
```json
{
  "question": "عرض جميع طلبات الشراء"
}
```

**الرد:**
```json
{
  "success": true,
  "answer": "هناك 25 طلب شراء...",
  "rows": [...]
}
```

---

### مثال 6: Employee يسأل عن Payments ❌

**السؤال:**
```json
{
  "question": "ما هو إجمالي المدفوعات؟"
}
```

**الرد:**
```json
{
  "statusCode": 403,
  "message": "You don't have permission to access: payments with role \"Employee\"",
  "error": "Forbidden"
}
```

---

## جدول سريع

| Role | Purchase Orders | Invoices | Payments | Users | Stock | Delivery Notes |
|------|----------------|----------|----------|-------|-------|----------------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Accountant** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Finance** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Manager** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Employee** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Viewer** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## كيف يعمل النظام؟

1. **المستخدم يرسل سؤال** مع JWT token
2. **النظام يكتشف الـ role** من الـ token
3. **التحقق من السؤال:**
   - إذا Viewer → فقط أسئلة عامة
   - إذا role آخر → يتحقق من الـ tables المطلوبة
4. **التحقق من SQL:**
   - بعد توليد SQL، يتحقق مرة أخرى من الـ tables
5. **الإجابة أو الرفض:**
   - إذا مسموح → يجيب
   - إذا ممنوع → يرفض مع رسالة واضحة

---

## إضافة Role جديد

لإضافة role جديد، عدل `chat-permission.service.ts`:

```typescript
// في roleTables Map
['NewRole', [
  'purchaseorders',
  'supplier_invoices',
  // ... tables أخرى
]],
```

---

## ملاحظات

- ✅ النظام بسيط وواضح
- ✅ كل role له tables محددة
- ✅ Viewer فقط أسئلة عامة
- ✅ Admin يرى كل شيء
- ✅ رسائل أخطاء واضحة

