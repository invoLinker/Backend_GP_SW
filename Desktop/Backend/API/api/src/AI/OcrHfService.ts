// ocr-hf.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import Tesseract from 'tesseract.js';
import axios from 'axios';

@Injectable()
export class OcrHfService {
  private HF_API_TOKEN = process.env.HF_TOKEN; 
  private HF_MODEL = 'google/t5-small-qa-qg-hl'; 

  // 1️⃣ استخراج النص من الصورة
  async extractText(filePath: string): Promise<string> {
    try {
      const { data } = await Tesseract.recognize(filePath, 'ara+eng', {
        logger: (m) => console.log(m),
      });
      return data.text;
    } catch (error) {
      throw new BadRequestException('Failed to process image');
    }
  }

  // 2️⃣ تحليل النص باستخدام Hugging Face
  async analyzeTextWithHF(text: string) {
    try {
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${this.HF_MODEL}`,
        { inputs: text },
        {
          headers: {
            Authorization: `Bearer ${this.HF_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      return response.data; 
    } catch (error) {
      throw new BadRequestException('Hugging Face inference failed');
    }
  }

  async extractAndAnalyze(filePath: string) {
    const text = await this.extractText(filePath);
    const analysis = await this.analyzeTextWithHF(text);
    return { rawText: text, analysis };
  }
}
