import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testModel(modelName) {
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
  const apiKey = process.env.GEMINI_API_KEY;
  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Hello" }] }]
    }),
  });
  const data = await res.json();
  if (data.error) {
     console.log(`[${modelName}] Error: ${data.error.code} ${data.error.message.split('\n')[0]}`);
  } else {
     console.log(`[${modelName}] Success!`);
  }
}

async function run() {
  await testModel("gemini-1.5-flash");
  await testModel("gemini-1.5-pro");
  await testModel("gemini-2.0-flash");
  await testModel("gemini-3.5-flash");
  await testModel("gemini-pro");
}
run();
