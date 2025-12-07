# 🤖 Chatbot API - دليل الاستخدام الكامل

## نظرة عامة

Chatbot ذكي يتفاعل مع قاعدة البيانات MySQL ويجيب على الأسئلة بالعربية والإنجليزية.

## 📍 Endpoint

```
POST /chatbot
```

## 📤 Request

```json
{
  "question": "ما هو إجمالي مبلغ جميع طلبات الشراء؟"
}
```

### Parameters:
- `question` (required, string): السؤال الذي تريد طرحه

## 📥 Response

### Success Response:
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

### Error Response:
```json
{
  "success": false,
  "error": "السؤال مطلوب",
  "message": "يرجى إرسال سؤال في حقل 'question'"
}
```

## 💡 أمثلة على الأسئلة

### أسئلة بالعربية:
- "ما هو إجمالي مبلغ جميع طلبات الشراء؟"
- "كم عدد الفواتير المعلقة؟"
- "عرض جميع طلبات الشراء التي حالتها 'Approved'"
- "ما هو متوسط مبلغ الفواتير؟"
- "كم عدد عناصر طلب الشراء PO-123؟"

### أسئلة بالإنجليزية:
- "What is the total amount of all purchase orders?"
- "How many pending invoices are there?"
- "Show all purchase orders with status 'Approved'"
- "What is the average invoice amount?"
- "How many items are in purchase order PO-123?"

## 🔧 الميزات

1. **دعم متعدد اللغات**: العربية والإنجليزية
2. **أمان**: فقط استعلامات SELECT مسموحة
3. **ذكاء**: توليد SQL تلقائياً من اللغة الطبيعية
4. **سرعة**: معالجة سريعة مع معلومات الأداء
5. **موثوقية**: معالجة أخطاء شاملة

## 🛡️ الأمان

- ✅ فقط استعلامات SELECT مسموحة
- ✅ منع INSERT, UPDATE, DELETE
- ✅ التحقق من صحة SQL قبل التنفيذ
- ✅ معالجة أخطاء آمنة

## 📊 قاعدة البيانات المدعومة

الـ Chatbot يدعم الجداول التالية:
- `purchaseorders` - طلبات الشراء
- `purchaseorderitems` - عناصر طلبات الشراء
- `supplier_invoices` - فواتير الموردين
- `supplier_invoice_items` - عناصر فواتير الموردين
- `delivery_notes` - سندات التسليم
- `delivery_note_items` - عناصر سندات التسليم
- `goods_receipts` - إيصالات الاستلام
- `goods_receipt_items` - عناصر إيصالات الاستلام
- `user` - المستخدمين

## 🚀 الاستخدام من Frontend

### JavaScript/TypeScript:
```javascript
const response = await fetch('http://localhost:4000/chatbot', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    question: 'ما هو إجمالي مبلغ جميع طلبات الشراء؟'
  })
});

const data = await response.json();
console.log(data.answer);
```

### Axios:
```javascript
import axios from 'axios';

const response = await axios.post('http://localhost:4000/chatbot', {
  question: 'ما هو إجمالي مبلغ جميع طلبات الشراء؟'
});

console.log(response.data.answer);
```

### React Example:
```jsx
const [question, setQuestion] = useState('');
const [answer, setAnswer] = useState('');
const [loading, setLoading] = useState(false);

const askQuestion = async () => {
  setLoading(true);
  try {
    const response = await fetch('http://localhost:4000/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    const data = await response.json();
    setAnswer(data.answer);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};
```

## ⚙️ الإعدادات المطلوبة

تأكد من وجود المتغيرات التالية في `.env`:
```env
HF_TOKEN=your_huggingface_token
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=involinker2
```

## 🐛 استكشاف الأخطاء

### خطأ: "السؤال مطلوب"
- تأكد من إرسال `question` في الـ body
- تأكد من أن `question` ليس فارغاً

### خطأ: "حدث خطأ في الاستعلام"
- حاول إعادة صياغة السؤال بشكل أوضح
- تأكد من استخدام أسماء الجداول الصحيحة

### خطأ: "حدث خطأ في الاتصال بقاعدة البيانات"
- تحقق من إعدادات قاعدة البيانات
- تأكد من أن MySQL يعمل

## 📝 ملاحظات

- الـ Chatbot يستخدم LLM لتوليد SQL من اللغة الطبيعية
- النتائج محدودة بـ 10 صفوف في الإجابة النهائية
- البيانات الحساسة (مثل كلمات المرور) يتم إزالتها تلقائياً

