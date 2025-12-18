// import { Injectable } from '@nestjs/common';
// import axios from 'axios';
// import FormData from 'form-data';

// @Injectable()
// export class TrOcrService {
//   private readonly OCR_API_URL = 'https://api.ocr.space/parse/image';
//   private readonly API_KEY = 'helloworld'; // Free API key (25,000 requests/day)

//   async recognize(file: Express.Multer.File, language: string = 'eng'): Promise<string> {
//     try {
//       if (!file || !file.buffer) {
//         throw new Error('No image file provided');
//       }

//       console.log(`📸 Processing image: ${file.originalname} (${(file.buffer.length / 1024).toFixed(2)} KB)`);

//       const formData = new FormData();
//       formData.append('file', file.buffer, {
//         filename: file.originalname,
//         contentType: file.mimetype,
//       });

//       formData.append('apikey', this.API_KEY);
//       formData.append('language', language);
//       formData.append('isOverlayRequired', 'false');
//       formData.append('detectOrientation', 'true');
//       formData.append('scale', 'true');
//       formData.append('OCREngine', '2');
//       formData.append('isCreateSearchablePdf', 'false');
//       formData.append('isSearchablePdfHideTextLayer', 'false');

//       console.log('🔍 Sending image to OCR.space API...');

//       const response = await axios.post(this.OCR_API_URL, formData, {
//         headers: {
//           ...formData.getHeaders(),
//         },
//         timeout: 60000, 
//       });

//       if (response.data.OCRExitCode !== 1) {
//         throw new Error(`OCR API error: ${response.data.ErrorMessage || 'Unknown error'}`);
//       }

//       let extractedText = '';
      
//       if (response.data.ParsedResults && response.data.ParsedResults.length > 0) {
//         extractedText = response.data.ParsedResults
//           .map((result: any) => result.ParsedText || '')
//           .join('\n')
//           .trim();
//       }

//       if (extractedText) {
//         console.log(`✅ Successfully extracted text (${extractedText.length} characters)`);
//         console.log(`📝 Text preview: ${extractedText.substring(0, 200)}${extractedText.length > 200 ? '...' : ''}`);
//       } else {
//         console.log('⚠️ No text detected in image');
//       }

//       return extractedText;
//     } catch (error) {
//       console.error('❌ Error during OCR recognition:', error);
      
//       if (axios.isAxiosError(error)) {
//         if (error.response) {
//           const errorData = error.response.data;
//           const errorMessage = errorData?.ErrorMessage || errorData?.message || error.response.statusText;
//           throw new Error(`OCR API error: ${error.response.status} - ${errorMessage}`);
//         } else if (error.request) {
//           throw new Error('OCR API request failed - no response received');
//         }
//       }
      
//       throw new Error(`OCR recognition failed: ${error.message}`);
//     }
//   }
// }

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

      // ✅ Compress image to fit OCR.space limit
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
