import { BadRequestException, Injectable } from '@nestjs/common';
import type { Express } from 'express';
import Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';
import sharp from 'sharp';
const pdfParse = require('pdf-parse');
import OpenAI from 'openai';
import FormData from 'form-data';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import pdfPoppler from 'pdf-poppler';



@Injectable()
export class OcrService {
  private client: OpenAI;
  private hf_api_token = process.env.HF_TOKEN2;

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

  private async extractImageFromPDF(buffer: Buffer): Promise<Buffer> {
    const tempPdf = path.join(__dirname, 'temp.pdf');
    const outDir = path.join(__dirname, 'pdf_images');

    fs.writeFileSync(tempPdf, buffer);

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

    await pdfPoppler.convert(tempPdf, {
      format: 'png',
      out_dir: outDir,
      out_prefix: 'page',
      page: 1,
    });

    const imgPath = path.join(outDir, 'page-1.png');
    const img = fs.readFileSync(imgPath);

    fs.unlinkSync(tempPdf);
    fs.unlinkSync(imgPath);

    return img;
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
      try {
        const parsed = await pdfParse(file.buffer);
        const text = parsed.text?.trim() || "";

        const isTextPDF =
          text.length > 30 &&
          !/[\u0000-\u001F]/.test(text);

        if (isTextPDF) {
          console.log("📄 PDF has text → using parsed text");
          return text;
        }

        console.log("🖼 PDF is scanned → converting to image");
        const imgBuffer = await this.extractImageFromPDF(file.buffer);
        const processed = await this.preprocessImage(imgBuffer);

        const { data } = await Tesseract.recognize(processed, 'eng+ara');
        return data.text;

      } catch (err) {
        console.log("⚠ pdf-parse failed → fallback OCR");
        const imgBuffer = await this.extractImageFromPDF(file.buffer);
        const processed = await this.preprocessImage(imgBuffer);

        const { data } = await Tesseract.recognize(processed, 'eng+ara');
        return data.text;
      }
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
        - payment_method (Cash or Bank Transfer or Stripe or Credit by default Bank Transfer)
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
        - items (item_name, quantity, unit, barcode)
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


// import { BadRequestException, Injectable } from '@nestjs/common';
// import type { Express } from 'express';
// import Tesseract from 'tesseract.js';
// import * as XLSX from 'xlsx';
// import sharp from 'sharp';
// const pdfParse = require('pdf-parse');
// import OpenAI from 'openai';
// import FormData from 'form-data';
// import axios from 'axios';
// import * as path from 'path';
// import * as fs from 'fs';
// import pdfPoppler from 'pdf-poppler';

// @Injectable()
// export class OcrService {
//   private client: OpenAI;
//   private hf_api_token = process.env.HF_TOKEN2;

//   constructor() {
//     this.client = new OpenAI({
//       baseURL: 'https://router.huggingface.co/v1',
//       apiKey: this.hf_api_token,
//     });
//   }

//   private async preprocessImage(buffer: Buffer): Promise<Buffer> {
//     return sharp(buffer)
//       .resize({ width: 2000 })
//       .grayscale()
//       .normalise()
//       .trim()
//       .sharpen()
//       .toBuffer();
//   }

  // private async extractImageFromPDF(buffer: Buffer): Promise<Buffer> {
  //   const tempPdf = path.join(__dirname, 'temp.pdf');
  //   const outDir = path.join(__dirname, 'pdf_images');

  //   fs.writeFileSync(tempPdf, buffer);

  //   if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  //   await pdfPoppler.convert(tempPdf, {
  //     format: 'png',
  //     out_dir: outDir,
  //     out_prefix: 'page',
  //     page: 1,
  //   });

  //   const imgPath = path.join(outDir, 'page-1.png');
  //   const img = fs.readFileSync(imgPath);

  //   fs.unlinkSync(tempPdf);
  //   fs.unlinkSync(imgPath);

  //   return img;
  // }

//   async extractText(file: Express.Multer.File): Promise<string> {
//     const ext = file.originalname.split('.').pop()?.toLowerCase();
//     if (!ext) throw new Error('File has no extension');

//     if (['png', 'jpg', 'jpeg'].includes(ext)) {
//       const processed = await this.preprocessImage(file.buffer);
//       const { data } = await Tesseract.recognize(processed, 'eng+ara');
//       return data.text;
//     }

    //  if (ext === 'pdf') {
    //   try {
    //     const parsed = await pdfParse(file.buffer);
    //     const text = parsed.text?.trim() || "";

    //     const isTextPDF =
    //       text.length > 30 &&
    //       !/[\u0000-\u001F]/.test(text);

    //     if (isTextPDF) {
    //       console.log("📄 PDF has text → using parsed text");
    //       return text;
    //     }

    //     console.log("🖼 PDF is scanned → converting to image");
    //     const imgBuffer = await this.extractImageFromPDF(file.buffer);
    //     const processed = await this.preprocessImage(imgBuffer);

    //     const { data } = await Tesseract.recognize(processed, 'eng+ara');
    //     return data.text;

    //   } catch (err) {
    //     console.log("⚠ pdf-parse failed → fallback OCR");
    //     const imgBuffer = await this.extractImageFromPDF(file.buffer);
    //     const processed = await this.preprocessImage(imgBuffer);

    //     const { data } = await Tesseract.recognize(processed, 'eng+ara');
    //     return data.text;
    //   }
    // }

//     if (['xls', 'xlsx'].includes(ext)) {
//       const workbook = XLSX.read(file.buffer, { type: 'buffer' });
//       let text = '';
//       workbook.SheetNames.forEach(sheetName => {
//         const sheet = workbook.Sheets[sheetName];
//         text += XLSX.utils.sheet_to_csv(sheet) + '\n';
//       });
//       return text;
//     }

//     throw new Error('Unsupported file type');
//   }

//   detectDocumentType(text: string): 'Supplier Invoice' | 'Delivery Note' | 'unknown' {
//     const lower = text.toLowerCase();
//     const supplierKeywords = ['invoice', 'فاتورة', 'ضريبية', 'bill', 'vat', 'payment'];
//     const deliveryKeywords = ['delivery', 'إشعار', 'توريد', 'استلام', 'goods received', 'سند تسليم'];
//     if (supplierKeywords.some(k => lower.includes(k))) return 'Supplier Invoice';
//     if (deliveryKeywords.some(k => lower.includes(k))) return 'Delivery Note';
//     return 'unknown';
//   }

//   async extractDataByType(text: string): Promise<any> {
//     const docType = this.detectDocumentType(text);
//     console.log('📄 Detected document type:', docType);

//     let prompt = '';

//     if (docType === 'Supplier Invoice') {
//       prompt = `
//         النص قد يكون عربي او انجليزي
//         Analyze this supplier invoice text and extract:
//         - invoice_number
//         - invoice_date
//         - received_date
//         - subtotal
//         - vat
//         - discount
//         - total_amount
//         - payment_method
//         - notes
//         - supplier_email
//         - supplier_name
//         - supplier_phone
//         - supplier_address
//         - po_number
//         - items
//         - currency
//         - bank_name
//         - bank_account
//         - to_name
//         - to_email
//         - to_phone
//         - to_address
//         Return JSON only.
//         """${text}"""
//       `;
//     } else if (docType === 'Delivery Note') {
//       prompt = `
//         النص قد يكون عربي او انجليزي
//         Extract delivery note fields:
//         - po_number
//         - dn_number
//         - supplier info
//         - dn_date
//         - items
//         - notes
//         - to info
//         Return JSON only.
//         """${text}"""
//       `;
//     } else {
//       prompt = `
//         Attempt to detect invoice type and extract structured fields.
//         Return JSON only.
//         """${text}"""
//       `;
//     }

//     const completion = await this.client.chat.completions.create({
//       model: 'openai/gpt-oss-safeguard-20b:groq',
//       messages: [{ role: 'user', content: prompt }],
//     });

//     const reply = completion.choices[0].message?.content?.trim() || '';
//     try {
//       return JSON.parse(reply);
//     } catch {
//       const jsonMatch = reply.match(/\{[\s\S]*\}/);
//       if (jsonMatch) return JSON.parse(jsonMatch[0]);
//       return { type: docType, error: 'Invalid JSON', raw: reply };
//     }
//   }

//   async processFile(file: Express.Multer.File): Promise<any> {
//     const text = await this.extractText(file);
//     return this.extractDataByType(text);
//   }
// }
