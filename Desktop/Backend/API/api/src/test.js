import 'dotenv/config';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HF_API_KEY);

async function test() {
  try {
    const result = await hf.chatCompletion({
      model: 'moonshotai/Kimi-K2-Instruct-0905',
      messages: [
        { role: 'system', content: 'انت مساعد ذكي' },
        { role: 'user', content: 'اكتب لي جملة جميلة عن الذكاء الاصطناعي بالعربية' },
      ],
      max_tokens: 100,
    });

    console.log('✅ الرد:', result.choices[0].message.content);
  } catch (err) {
    console.error('❌ Failed to connect:', err);
  }
}

test();
