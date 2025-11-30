import { Injectable } from "@nestjs/common";
import OpenAI from "openai";

@Injectable()
export class HfLlamaService {
  private client = new OpenAI({
    baseURL: "https://router.huggingface.co/v1",
    apiKey: process.env.HF_TOKEN,
  });

  async ask(prompt: string): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: "meta-llama/Llama-3.1-8B-Instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    return completion.choices[0].message.content || "";
  }
}
