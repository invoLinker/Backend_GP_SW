import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class HuggingFaceService {
private readonly apiUrl = 'https://huggingface.co/google-t5/t5-small';

  private readonly apiKey = process.env.HUGGINGFACE_API_KEY;

  async extractInstallments(note: string, totalAmount: number) {
    try {
      console.log("🧠 Sending request to Hugging Face:", this.apiUrl);
      console.log("🔑 Using key:", this.apiKey ? "Loaded ✅" : "Missing ❌");


      const prompt = `
        Analyze the following payment description and return JSON only.
        The JSON should contain: total_installments, and for each installment:
        number, due_in_days (if mentioned), and amount (if specified).
        If amount is not specified, set it to null.

        Example:
        {
          "total_installments": 3,
          "installments": [
            { "number": 1, "amount": null, "due_in_days": 0 },
            { "number": 2, "amount": null, "due_in_days": 30 },
            { "number": 3, "amount": null, "due_in_days": 60 }
          ]
        }

        Text: "${note}"
      `;

      const response = await axios.post(
        this.apiUrl,
        { inputs: prompt },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 40000,
        },
      );

      const textOutput = response.data[0]?.generated_text || '';
      const jsonStart = textOutput.indexOf('{');
      const jsonEnd = textOutput.lastIndexOf('}');
      const jsonText = textOutput.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonText);

      if (!parsed?.total_installments || !parsed.installments?.length) {
        throw new Error('Installment data missing or malformed');
      }

      const perInstallment = Number((totalAmount / parsed.total_installments).toFixed(2));
      parsed.installments = parsed.installments.map((inst) => ({
        ...inst,
        amount: inst.amount ? Number(inst.amount) : perInstallment,
      }));

      const totalFromInstallments = parsed.installments.reduce((sum, i) => sum + i.amount, 0);
      const diff = Number((totalAmount - totalFromInstallments).toFixed(2));

      if (Math.abs(diff) >= 0.01) {
        parsed.installments[parsed.installments.length - 1].amount += diff;
      }

      return parsed;
    } catch (error) {
      console.error('❌ Error extracting installments:', error.message);
      throw new InternalServerErrorException('Failed to analyze installments from note');
    }
  }
  
}
