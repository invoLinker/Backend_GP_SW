import { Injectable } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import sharp from 'sharp';
import type { Express } from 'express';

@Injectable()
export class TrOcrService {
  private readonly OCR_API_URL = 'https://api.ocr.space/parse/image';
  private readonly API_KEY = 'helloworld';

  async recognize(
    file: Express.Multer.File,
    language: string = 'eng',
  ): Promise<string> {
    try {
      if (!file || !file.buffer) {
        throw new Error('No image file provided');
      }

      console.log(
        `📸 ORIGINAL SIZE: ${(file.buffer.length / 1024).toFixed(2)} KB`,
      );

      const compressedBuffer = await sharp(file.buffer)
        .rotate()
        .resize({
          width: 1200,
          withoutEnlargement: true,
        })
        .jpeg({ quality: 60 })
        .toBuffer();

      console.log(
        `🗜 COMPRESSED SIZE: ${(compressedBuffer.length / 1024).toFixed(2)} KB`,
      );

      if (compressedBuffer.length > 1024 * 1024) {
        throw new Error(
          'Image too large for OCR API even after compression',
        );
      }

      const formData = new FormData();
      formData.append('file', compressedBuffer, {
        filename: 'image.jpg',
        contentType: 'image/jpeg',
      });

      formData.append('apikey', this.API_KEY);
      formData.append('language', language);
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2');

      console.log('🚀 Sending compressed image to OCR.space...');

      const response = await axios.post(this.OCR_API_URL, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 60000,
      });

      if (response.data.OCRExitCode !== 1) {
        throw new Error(
          `OCR API error: ${response.data.ErrorMessage || 'Unknown error'}`,
        );
      }

      const extractedText =
        response.data.ParsedResults?.map(
          (r: any) => r.ParsedText || '',
        ).join('\n') || '';

      return extractedText.trim();
    } catch (error: any) {
      console.error('❌ OCR ERROR:', error.message);
      throw new Error(`OCR recognition failed: ${error.message}`);
    }
  }
}
