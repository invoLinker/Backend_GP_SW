import { Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class ChatPermissionService {
  private readonly roleTables: Map<string, string[]> = new Map([
    ['Admin', [
      'purchaseorders', 'purchaseorderitems',
      'suppliers', 'supplier_invoices', 'supplier_invoice_items',
      'delivery_notes', 'delivery_note_items',
      'goods_receipts', 'goods_receipt_items',
      'payments', 'stock',
      'user', 'roles', 'permissions', 'role_permissions',
      'tasks', 'history_log',
      'invoice_incidents', 'invoice_incident_items',
      'edit_requests', 'verification_exceptions'
    ]],

    ['Accountant', [
      'suppliers', 'supplier_invoices', 'supplier_invoice_items',
      'payments', 'purchaseorders', 'purchaseorderitems',
      'delivery_notes','delivery_note_items','goods_receipts', 'goods_receipt_items',
      'stock'
    ]],

    ['PaymentOfficer', [
      'payments', 'supplier_invoices',
      'purchaseorders', 'purchaseorderitems'
    ]],

    ['Warehouse', [
      'purchaseorders', 'purchaseorderitems',
      'delivery_notes', 'delivery_note_items',
      'stock', 'goods_receipts', 'goods_receipt_items',
    ]],

    ['Viewer', []], 

    ['Supplier', []]

  ]);


  private extractTablesFromSQL(sql: string): string[] {
    const tables: string[] = [];
    const sqlLower = sql.toLowerCase();
    
    const allPossibleTables = [
      'purchaseorders', 'purchaseorderitems',
      'suppliers', 'supplier_invoices', 'supplier_invoice_items',
      'delivery_notes', 'delivery_note_items',
      'goods_receipts', 'goods_receipt_items',
      'payments', 'stock', 'user', 'roles', 
      'tasks', 'history_log',
      'invoice_incidents', 'invoice_incident_items',
      'edit_requests', 'verification_exceptions'
    ];
    
    allPossibleTables.forEach(table => {
      if (sqlLower.includes(`from ${table}`) || 
          sqlLower.includes(`join ${table}`) ||
          sqlLower.includes(` ${table} `) ||
          sqlLower.includes(` ${table}.`) ||
          sqlLower.includes(`\`${table}\``)) {
        tables.push(table);
      }
    });
    
    return [...new Set(tables)]; 
  }


  async checkPermissions(userRole: string, sql: string): Promise<void> {
    const requiredTables = this.extractTablesFromSQL(sql);
    
    if (requiredTables.length === 0) {
      return;
    }

    const normalizedRole = this.normalizeRoleName(userRole);
    const allowedTables = this.roleTables.get(normalizedRole) || [];
    
    if (!this.roleTables.has(normalizedRole)) {
      throw new ForbiddenException(
        `Role "${userRole}" is not configured for chatbot access`
      );
    }

    for (const table of requiredTables) {
      if (!allowedTables.includes(table)) {
        throw new ForbiddenException('PERMISSION_DENIED');
      }
    }
  }


  async checkQuestionPermissions(userRole: string, question: string): Promise<{ allowed: boolean; reason?: string }> {
    const questionLower = question.toLowerCase();
    
    // Check if it's a general question about the system - ALLOW FOR EVERYONE
    const generalKeywords = [
      'مرحبا', 'hello', 'hi', 'hey', 'أهلا', 'هلا',
      'مشروع', 'نظام', 'project', 'system', 'app', 'application',
      'ماذا يفعل', 'ماذا تفعل', 'ماذا تقدر', 'شو تقدر', 'شو بتقدر',
      'شو فكرته', 'شو فكرة', 'ما فكرته', 'ما فكرة', 'فكرة المشروع', 'فكرة النظام', 'فكرة',
      'ما هو المشروع', 'عن المشروع', 'عن النظام', 'ما هو النظام',
      'what is the project', 'about the project', 'what is this system',
      'what can you do', 'what do you do', 'tell me about', 'what does it do', 'what does the project do',
      'what is the idea', 'idea of', 'idea of the', 'what is the app', 'what is the application',
      'help', 'مساعدة', 'شكرا', 'thanks', 'thank'
    ];
    
    const isGeneral = generalKeywords.some(keyword => questionLower.includes(keyword));
    if (isGeneral) {
      return { allowed: true }; // General questions allowed for everyone
    }
    
    const normalizedRole = this.normalizeRoleName(userRole);
    console.log(`[Permission Check] Original role: "${userRole}", Normalized: "${normalizedRole}"`);
    const allowedTables = this.roleTables.get(normalizedRole) || [];
    console.log(`[Permission Check] Allowed tables for ${normalizedRole}:`, allowedTables);
    
    if (!this.roleTables.has(normalizedRole)) {
      console.log(`[Permission Check] Role "${normalizedRole}" not found in roleTables`);
      const isArabic = /[\u0600-\u06FF]/.test(question);
      return {
        allowed: false,
        reason: isArabic
          ? 'عذراً، لا يمكنني الإجابة على سؤالك بناءً على الصلاحيات المعطاة لي.'
          : 'Sorry, I cannot answer your question based on the permissions granted to me.'
      };
    }

    if (normalizedRole === 'Viewer') {
      const generalKeywords = [
        'مرحبا', 'hello', 'hi', 'hey', 'أهلا', 'هلا',
        'مشروع', 'نظام', 'project', 'system',
        'ماذا تفعل', 'what can you', 'help', 'مساعدة',
        'شكرا', 'thanks', 'thank'
      ];
      
      const isGeneral = generalKeywords.some(keyword => questionLower.includes(keyword));
      
      if (!isGeneral) {
        const isArabic = /[\u0600-\u06FF]/.test(question);
        return {
          allowed: false,
          reason: isArabic
            ? 'عذراً، لا يمكنني الإجابة على سؤالك بناءً على الصلاحيات المعطاة لي. يمكنني فقط الإجابة على أسئلة عامة عن النظام.'
            : 'Sorry, I cannot answer your question based on the permissions granted to me. I can only answer general questions about the system.'
        };
      }
      
      return { allowed: true };
    }

    const detectedTables: string[] = [];
    
    if (questionLower.includes('purchase order') || questionLower.includes(' po ') || 
        questionLower.includes('طلب شراء') || questionLower.includes('طلبات الشراء')) {
      detectedTables.push('purchaseorders', 'purchaseorderitems');
    }
    
    if (questionLower.includes('invoice') || questionLower.includes('فاتورة') || 
        questionLower.includes('فواتير') || questionLower.includes('فاتورة مورد')) {
      detectedTables.push('supplier_invoices', 'supplier_invoice_items');
    }
    
    if (questionLower.includes('delivery note') || questionLower.includes(' dn ') ||
        questionLower.includes('سند') || questionLower.includes('سندات')) {
      detectedTables.push('delivery_notes', 'delivery_note_items');
    }
        if (questionLower.includes('goods receipt') || questionLower.includes(' gr ') ||
        questionLower.includes('إيصال') || questionLower.includes('إيصالات')) {
      detectedTables.push('goods_receipts', 'goods_receipt_items');
    }
    
    if (questionLower.includes('payment') || questionLower.includes('دفعة') || 
        questionLower.includes('دفعات')) {
      detectedTables.push('payments');
    }
    
    if (questionLower.includes('stock') || questionLower.includes('مخزون') || questionLower.includes('warehouse') ||
        questionLower.includes('مخزن') || questionLower.includes('مخازن') || (questionLower.includes('item')) ||
        questionLower.includes('عنصر') || (questionLower.includes('product')) || questionLower.includes('عناصر') ||
      (questionLower.includes('المنتجات'))) {
      detectedTables.push('stock');
    }
    
    
    if (questionLower.includes('user') || questionLower.includes('مستخدم') ||
        questionLower.includes('موظف')) {
      detectedTables.push('user');
    }
    
    if (questionLower.includes('role') ||
        questionLower.includes('دور') || questionLower.includes('صلاحية')) {
      detectedTables.push('roles');
    }
    
    if (questionLower.includes('task') || questionLower.includes('مهمة')) {
      detectedTables.push('tasks');
    }
    
    if (questionLower.includes('supplier') || questionLower.includes('مورد')) {
      detectedTables.push('suppliers');
    }

    if (detectedTables.length === 0) {
      return { allowed: true };
    }

    console.log(`[Permission Check] Detected tables from question:`, detectedTables);
    
    const forbiddenTables = detectedTables.filter(table => !allowedTables.includes(table));
    console.log(`[Permission Check] Forbidden tables:`, forbiddenTables);
    
    if (forbiddenTables.length > 0) {
      const isArabic = /[\u0600-\u06FF]/.test(question);
      return {
        allowed: false,
        reason: isArabic
          ? 'عذراً، لا يمكنني الإجابة على سؤالك بناءً على الصلاحيات المعطاة لي. يرجى التواصل مع المدير للحصول على صلاحيات إضافية.'
          : 'Sorry, I cannot answer your question based on the permissions granted to me. Please contact your administrator for additional permissions.'
      };
    }

    return { allowed: true };
  }


  getAllowedTables(userRole: string): string[] {
    const normalizedRole = this.normalizeRoleName(userRole);
    return this.roleTables.get(normalizedRole) || [];
  }

  private normalizeRoleName(role: string): string {
    if (!role) return role;
    
    const roleLower = role.toLowerCase();
    
    const roleMap: Record<string, string> = {
      'admin': 'Admin',
      'accountant': 'Accountant',
      'paymentofficer': 'PaymentOfficer',
      'warehouse': 'Warehouse',
      'viewer': 'Viewer',
      'supplier': 'Supplier',
    };
    
    return roleMap[roleLower] || role;
  }
}
