const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

async function test() {
  try {
    const genAI = new GoogleGenAI({ apiKey });
    console.log('Testing with gemini-2.0-flash...');
    
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: 'Hola, ¿quién eres?' }] }],
    });
    
    console.log('Response:', response.text);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
