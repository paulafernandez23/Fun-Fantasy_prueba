const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

async function test() {
  try {
    const genAI = new GoogleGenAI({ apiKey });
    const response = await genAI.models.list();
    console.log('Keys of response:', Object.keys(response));
    
    // In some versions it might be an async iterator
    let count = 0;
    for await (const model of response) {
      if (model.name.includes('flash')) {
        console.log('Model:', model.name);
      }
      count++;
    }
    console.log('Total models checked:', count);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
