# 📋 أمثلة على نظام Permissions في Chatbot

## مثال 1: موظف عادي بدون Permissions

### السيناريو:
- **الموظف**: لديه فقط `use_chatbot` permission
- **لا يملك**: `get_purchase_order` permission

### السؤال:
```json
POST /chatbot
Headers: {
  "Authorization": "Bearer <employee_token>"
}
Body: {
  "question": "ما هو إجمالي مبلغ جميع طلبات الشراء؟"
}
```

### الرد:
```json
{
  "statusCode": 403,
  "message": "You don't have permission to access this data. Required permissions: get_purchase_order",
  "error": "Forbidden"
}
```

**أو بالعربية:**
```json
{
  "statusCode": 403,
  "message": "ليس لديك صلاحية للوصول إلى هذه البيانات. الصلاحيات المطلوبة: get_purchase_order",
  "error": "Forbidden"
}
```

---

## مثال 2: موظف يحاول الوصول إلى Invoices

### السؤال:
```json
{
  "question": "كم عدد الفواتير المعلقة؟"
}
```

### الرد:
```json
{
  "statusCode": 403,
  "message": "You don't have permission to access this data. Required permissions: get_supplier-invoices, search_supplier-invoices",
  "error": "Forbidden"
}
```

---

## مثال 3: موظف يحاول الوصول إلى بيانات المستخدمين

### السؤال:
```json
{
  "question": "كم عدد المستخدمين النشطين؟"
}
```

### الرد:
```json
{
  "statusCode": 403,
  "message": "You don't have permission to access this data. Required permissions: search_users",
  "error": "Forbidden"
}
```

---

## مثال 4: موظف يسأل سؤال مسموح (عام)

### السؤال:
```json
{
  "question": "مرحبا"
}
```

### الرد:
```json
{
  "success": true,
  "answer": "مرحباً! أهلاً وسهلاً بك...",
  "rows": [],
  "metadata": {
    "rowCount": 0,
    "executionTime": "45ms"
  }
}
```

✅ **يعمل** لأن السؤال لا يحتاج permissions

---

## مثال 5: مدير لديه Permissions

### السيناريو:
- **المدير**: لديه `use_chatbot` + `get_purchase_order` + `get_supplier-invoices`

### السؤال:
```json
{
  "question": "ما هو إجمالي مبلغ جميع طلبات الشراء؟"
}
```

### الرد:
```json
{
  "success": true,
  "answer": "إجمالي مبلغ جميع طلبات الشراء هو 125,000 دينار أردني",
  "rows": [
    {
      "total_amount": 125000,
      "currency": "JOD"
    }
  ],
  "metadata": {
    "rowCount": 1,
    "executionTime": "234ms"
  }
}
```

✅ **يعمل** لأنه لديه الـ permission المطلوب

---

## مثال 6: مدير يحاول الوصول إلى بيانات Users (ممنوعة)

### السؤال:
```json
{
  "question": "عرض جميع المستخدمين"
}
```

### الرد:
```json
{
  "statusCode": 403,
  "message": "You don't have permission to access this data. Required permissions: search_users",
  "error": "Forbidden"
}
```

❌ **مرفوض** لأنه لا يملك `search_users` permission

---

## مثال 7: بدون Token (Unauthorized)

### السؤال:
```json
POST /chatbot
// بدون Authorization header
{
  "question": "مرحبا"
}
```

### الرد:
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

---

## جدول Permissions المطلوبة

| السؤال | Table المطلوب | Permission المطلوب |
|--------|---------------|-------------------|
| "ما هو إجمالي مبلغ جميع طلبات الشراء؟" | `purchaseorders` | `get_purchase_order` |
| "كم عدد الفواتير المعلقة؟" | `supplier_invoices` | `get_supplier-invoices` |
| "عرض جميع سندات التسليم" | `delivery_notes` | `get_DN` |
| "ما هو إجمالي المدفوعات؟" | `payments` | `get_all_payment` |
| "كم عدد العناصر في المخزون؟" | `stock` | `get_stock` |
| "عرض جميع المستخدمين" | `user` | `search_users` |
| "مرحبا" | لا شيء | لا شيء ✅ |

---

## كيفية إضافة Permissions

### 1. إعطاء موظف permission للوصول إلى Purchase Orders:

```bash
POST /role-permissions
Headers: { "Authorization": "Bearer <admin_token>" }
Body: {
  "roleName": "Employee",
  "permissionName": "get_purchase_order"
}
```

### 2. إعطاء موظف permission للوصول إلى Invoices:

```bash
POST /role-permissions
Body: {
  "roleName": "Employee",
  "permissionName": "get_supplier-invoices"
}
```

### 3. إزالة Permission:

```bash
DELETE /role-permissions
Body: {
  "roleName": "Employee",
  "permissionName": "get_purchase_order"
}
```

---

## ملاحظات مهمة

1. **التحقق مزدوج**: النظام يتحقق من permissions مرتين:
   - قبل توليد SQL (بناءً على السؤال)
   - بعد توليد SQL (بناءً على الـ tables الفعلية)

2. **رسائل واضحة**: رسائل الأخطاء توضح بالضبط أي permissions مطلوبة

3. **الأمان**: حتى لو حاول المستخدم تجاوز النظام، لن يتمكن من الوصول إلى بيانات ممنوعة

4. **المرونة**: يمكن إضافة/إزالة permissions بسهولة حسب الحاجة

