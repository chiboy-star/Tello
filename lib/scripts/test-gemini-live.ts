import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Testing with API key present:', !!apiKey, 'length:', apiKey?.length);

  try {
    const ai = new GoogleGenAI();
    const res = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Reply strictly with the word: WORKING',
    });
    console.log('GEMINI_OUTPUT:', res.text?.trim());
  } catch (err: any) {
    console.error('GEMINI_CALL_FAILED:', err.message || err);
  }
}

testGemini();
