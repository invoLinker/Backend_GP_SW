import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class HuggingFaceService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      baseURL: 'https://router.huggingface.co/v1',
      apiKey: "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",
    });
  }

  async parseInstallments(notes: string, totalAmount: number, invoiceDate: Date) {
    const prompt = `
            Analyze the following text and extract the number of installments, the amount of each payment, and their due dates.  
        Return the result **only** in JSON format with no explanation.  
        Use the invoice date "${invoiceDate}" as the starting point for the due dates.  
        If a specific date is not mentioned, schedule each payment one month apart.  
        The total sum of all installments must equal ${totalAmount}.  

        Text: "${notes}"

        Expected format:
        {
        "total_installments": number,
        "installments": [
            { "amount": number, "due_date": "yyyy-mm-dd" }
        ]
        }

    `;

    const completion = await this.client.chat.completions.create({
      model: 'MiniMaxAI/MiniMax-M2:novita',
      messages: [{ role: 'user', content: prompt }],
    });

    const reply = completion.choices[0].message?.content?.trim() || '';

    try {
      return JSON.parse(reply);
    } catch {
      // إذا النموذج أرجع كلام زيادة، نحاول نقتطع JSON فقط
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return { error: 'Invalid JSON format', raw: reply };
    }
  }
}
