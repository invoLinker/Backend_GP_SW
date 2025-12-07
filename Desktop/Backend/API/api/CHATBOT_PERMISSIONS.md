# 🔐 نظام Permissions للـ Chatbot

## نظرة عامة

الـ Chatbot الآن محمي بنظام permissions بناءً على الـ roles. كل role له permissions محددة، والـ chatbot يتحقق من هذه الـ permissions قبل الإجابة على الأسئلة.

## كيف يعمل؟

### 1. Authentication
- يجب أن يكون المستخدم مسجل دخول (JWT token)
- الـ token يحتوي على `role` الخاص بالمستخدم

### 2. Permission Check
- الـ chatbot يتحقق من `use_chatbot` permission أولاً
- ثم يتحقق من permissions محددة بناءً على الـ tables المطلوبة في السؤال

### 3. Table Permissions Mapping

| Table | Required Permissions |
|-------|---------------------|
| `purchaseorders` | `get_purchase_order` |
| `purchaseorderitems` | `get_purchase_order` |
| `supplier_invoices` | `get_supplier-invoices`, `search_supplier-invoices` |
| `supplier_invoice_items` | `get_supplier-invoices` |
| `delivery_notes` | `get_DN`, `get_supplier-invoices` |
| `delivery_note_items` | `get_DN` |
| `goods_receipts` | `get_delivery_note` |
| `goods_receipt_items` | `get_delivery_note` |
| `payments` | `get_all_payment`, `get_payment` |
| `stock` | `get_stock` |
| `items` | `get_item`, `search_item` |
| `user` | `search_users` |
| `roles` | `get_role_by_name` |
| `permissions` | `get_permission` |
| `role_permissions` | `get_permission` |
| `edit_requests` | `get_edit_request` |

## الإعداد

### 1. إنشاء Permission للـ Chatbot

```sql
INSERT INTO permissions (permission_name, description) 
VALUES ('use_chatbot', 'Permission to use the chatbot');
```

### 2. ربط Permission بالـ Role

```bash
POST /role-permissions
{
  "roleName": "Employee",
  "permissionName": "use_chatbot"
}
```

### 3. إضافة Permissions للـ Tables

```bash
# مثال: إعطاء موظف permission للوصول إلى Purchase Orders
POST /role-permissions
{
  "roleName": "Employee",
  "permissionName": "get_purchase_order"
}
```

## أمثلة

### موظف عادي (Employee)
- لديه `use_chatbot` فقط
- يمكنه السؤال عن معلومات عامة
- **لا يمكنه** الوصول إلى بيانات حساسة

### مدير (Manager)
- لديه `use_chatbot` + `get_purchase_order` + `get_supplier-invoices`
- يمكنه السؤال عن Purchase Orders و Invoices
- **لا يمكنه** الوصول إلى Users أو Roles

### Admin
- لديه جميع الـ permissions
- يمكنه السؤال عن أي شيء

## رسائل الأخطاء

### بدون Authentication
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### بدون Permission
```json
{
  "statusCode": 403,
  "message": "You don't have permission to access this data. Required permissions: get_purchase_order"
}
```

## الأمان

1. ✅ **Authentication Required**: يجب تسجيل الدخول
2. ✅ **Permission Check**: التحقق من permissions قبل تنفيذ SQL
3. ✅ **Double Check**: التحقق مرة أخرى بعد توليد SQL
4. ✅ **Table-Level Security**: كل table له permissions محددة
5. ✅ **Safe Queries Only**: فقط SELECT queries مسموحة

## ملاحظات

- الـ chatbot يتحقق من permissions **قبل** توليد SQL
- إذا كان السؤال يحتوي على tables محظورة، سيتم رفضه فوراً
- بعض الـ tables (مثل `suppliers`) لا تحتاج permissions (يمكن تعديلها لاحقاً)
- يمكن إضافة permissions جديدة بسهولة في `chat-permission.service.ts`

