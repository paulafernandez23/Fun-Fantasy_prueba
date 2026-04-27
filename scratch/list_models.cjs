const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

async function test() {
  try {
    const genAI = new GoogleGenAI({ apiKey });
    console.log('Listing models...');
    
    // According to the docs for the newer SDK, it might be genAI.models.list()
    // Let's try to find the method.
    const models = await genAI.models.list();
    console.log('Available models:', JSON.stringify(models, null, 2));
  } catch (error) {
    console.error('Error listing models:', error.message);
  }
}

test();
