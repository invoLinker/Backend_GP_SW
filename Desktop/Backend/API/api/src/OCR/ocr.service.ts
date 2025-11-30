import { BadRequestException, Injectable } from '@nestjs/common';
import type { Express } from 'express';
import Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';
import sharp from 'sharp';
const pdfParse = require('pdf-parse');
import OpenAI from 'openai';
import FormData from 'form-data';
import axios from 'axios';



@Injectable()
export class OcrService {
  private client: OpenAI;
  private hf_api_token = process.env.HF_TOKEN;

  constructor() {
    this.client = new OpenAI({
      baseURL: 'https://router.huggingface.co/v1',
      apiKey: this.hf_api_token,
    });
  }

  private async  preprocessImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize({ width: 2000 })       // تكبير إذا كانت الصورة صغيرة
    .grayscale()                   // تحويل إلى أبيض وأسود
    .normalise()  
    .trim()                  // تعديل التباين تلقائياً
    .sharpen()                     // زيادة الحدة
    .toBuffer();
}

  async extractText(file: Express.Multer.File): Promise<string> {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!ext) throw new Error('File has no extension');

    if (['png', 'jpg', 'jpeg'].includes(ext)) {
      const processedBuffer = await this.preprocessImage(file.buffer);
      const { data } = await Tesseract.recognize(processedBuffer, 'eng+ara', {
        logger: m => console.log(m), 
      });
      return data.text;
    }

    if (ext === 'pdf') {
      const data = await pdfParse(file.buffer);
      return data.text;
    }

    if (['xls', 'xlsx'].includes(ext)) {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      let text = '';
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        text += XLSX.utils.sheet_to_csv(sheet) + '\n';
      });
      return text;
    }

    throw new Error('Unsupported file type');
  }

  detectDocumentType(text: string): 'Supplier Invoice' | 'Delivery Note' | 'unknown' {
    const lower = text.toLowerCase();
    const supplierKeywords = ['invoice', 'فاتورة', 'ضريبية', 'bill', 'vat', 'payment'];
    const deliveryKeywords = ['delivery', 'إشعار', 'توريد', 'استلام', 'goods received', 'سند تسليم'];
    if (supplierKeywords.some(k => lower.includes(k))) return 'Supplier Invoice';
    if (deliveryKeywords.some(k => lower.includes(k))) return 'Delivery Note';
    return 'unknown';
  }

  async extractDataByType(text: string): Promise<any> {
    const docType = this.detectDocumentType(text);
    console.log('📄 Detected document type:', docType);

    let prompt = '';
    if (docType === 'Supplier Invoice') {
      prompt = `
      النص قد يكون عربي او انجليزي
        Analyze this supplier invoice text and extract:
        - invoice_number
        - invoice_date (YYYY-MM-DD)
        - received_date (YYYY-MM-DD)
        - subtotal
        - vat
        - discount
        - total_amount
        - payment_method (Cash or Bank Transfer or PayPal or Credit by default Bank Transfer)
        - notes
        - supplier_email
        - supplier_name
        - supplier_phone
        - supplier_address
        - po_number
        - items (item_name, quantity, unit_price, total_price, barcode)
        - currency (USD or ILS or JOD by default ILS)
        - bank_name
        - bank_account
        - to_name
        - to_email
        - to_phone
        - to_address
        Return valid JSON only, no explanations.
        Text:
        """${text}"""
      `;
    } else if (docType === 'Delivery Note') {
      prompt = `
        النص قد يكون عربي او انجليزي
        Analyze this delivery note text and extract:
        - po_number
        - dn_number
        - supplier_name
        - supplier_email
        - supplier_phone
        - supplier_address
        - dn_date (YYYY-MM-DD)
        - items (product_name, quantity, unit, barcode)
        - notes
        - to_name
        - to_email
        - to_phone
        - to_address
        Return valid JSON only, no explanations.
        Text:
        """${text}"""
      `;
    } else {
      prompt = `
        Try to detect if this text is a Supplier Invoice or Delivery Note.
        Extract all relevant structured data fields.
        Return only JSON.
        Text:
        """${text}"""
      `;
    }

    const completion = await this.client.chat.completions.create({
      model: 'openai/gpt-oss-safeguard-20b:groq',
      messages: [{ role: 'user', content: prompt }],
    });

    const reply = completion.choices[0].message?.content?.trim() || '';
    try {
      return JSON.parse(reply);
    } catch {
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return { type: docType, error: 'Invalid JSON format', raw: reply };
    }

}



  async processFile(file: Express.Multer.File): Promise<any> {
  const text = await this.extractText(file);
  return this.extractDataByType(text);
}


  
}



