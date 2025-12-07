# Chatbot API Usage Guide

This chatbot allows you to ask questions about your MySQL database and get intelligent answers based on the data. It can also perform analyses and other tasks.

## Single Endpoint

### Chatbot Endpoint
**POST** `/chatbot`

This single endpoint handles all chatbot functionality:
- Questions about your database
- Analysis requests
- General conversations
- Automatic detection of query type

**Request Body:**
```json
{
  "question": "What is the total amount of all purchase orders?",
  "sessionId": "optional-session-id",
  "includeSql": false
}
```

**Request Parameters:**
- `question` (required): Your question in natural language (English or Arabic)
- `sessionId` (optional): Session ID for conversation history
- `includeSql` (optional): Set to `true` to include the generated SQL in response

**Response:**
```json
{
  "answer": "The total amount of all purchase orders is $125,000.00",
  "rows": [...],
  "analysis": {
    "totalRecords": 50,
    "statistics": {
      "total_amount": {
        "sum": 125000,
        "average": "2500.00",
        "min": 100,
        "max": 10000
      }
    },
    "insights": "Key insights about the data..."
  },
  "metadata": {
    "rowCount": 50,
    "executionTime": 234,
    "queryType": "question"
  }
}
```

## Example Questions

### Simple Questions
- "What is the total amount of all purchase orders?"
- "Show me all invoices with status 'Pending'"
- "How many delivery notes were created this month?"
- "What is the average invoice amount?"

### Analysis Questions
- "Analyze purchase order trends over the last 3 months"
- "Compare total amounts by supplier"
- "Give me a summary of all pending invoices"
- "What are the top 5 purchase orders by amount?"

### Arabic Questions (Supported)
- "ما هو إجمالي مبلغ جميع طلبات الشراء؟"
- "عرض جميع الفواتير المعلقة"
- "تحليل اتجاهات طلبات الشراء"

## Features

1. **Natural Language Processing**: Ask questions in plain English or Arabic
2. **Intelligent SQL Generation**: Automatically generates safe SQL queries
3. **Data Analysis**: Performs statistical analysis and provides insights
4. **Conversation History**: Maintains context across multiple questions
5. **Error Handling**: Provides user-friendly error messages
6. **Multilingual Support**: Supports both English and Arabic

## Security

- Only SELECT queries are allowed (no INSERT, UPDATE, DELETE)
- SQL injection protection
- Query validation before execution
- Safe data sanitization

## Notes

- The chatbot uses your MySQL database configured in `app.module.ts`
- Make sure your `HF_TOKEN` environment variable is set for the LLM service
- Session IDs are optional but recommended for conversation context
- Large result sets are automatically limited and summarized

