const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

async function test() {
  try {
    const genAI = new GoogleGenAI({ apiKey });
    console.log('Listing models...');
    const models = await genAI.models.list();
    const flashModels = models.filter(m => m.name.includes('flash'));
    console.log('Flash models:', JSON.stringify(flashModels, null, 2));
  } catch (error) {
    console.error('Error listing models:', error.message);
  }
}

test();
