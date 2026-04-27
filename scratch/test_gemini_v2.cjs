const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

async function test() {
  try {
    const genAI = new GoogleGenAI({ apiKey, apiVersion: 'v1' });
    console.log('GenAI initialized with @google/genai (v1)');
    
    const response = await genAI.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: 'Hola' }] }],
    });
    
    console.log('Response:', response.text);
  } catch (error) {
    console.error('Error with v1:', error.message);
    
    try {
      const genAI2 = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
      console.log('GenAI initialized with @google/genai (v1beta)');
      const response2 = await genAI2.models.generateContent({
        model: 'gemini-1.5-flash-latest',
        contents: [{ role: 'user', parts: [{ text: 'Hola' }] }],
      });
      console.log('Response with v1beta + latest:', response2.text);
    } catch (err2) {
      console.error('Error with v1beta + latest:', err2.message);
    }
  }
}

test();
