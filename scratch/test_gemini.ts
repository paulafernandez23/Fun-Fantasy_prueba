import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error('No API key found in .env');
  process.exit(1);
}

try {
  const genAI = new GoogleGenAI({ apiKey });
  console.log('GenAI initialized with @google/genai');
  
  // Try to generate content
  const response = await genAI.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [{ role: 'user', parts: [{ text: 'Hola' }] }],
    config: {
      temperature: 0.7,
      maxOutputTokens: 100,
    },
  });
  
  console.log('Response:', response.text);
} catch (error) {
  console.error('Error with @google/genai:', error);
}
