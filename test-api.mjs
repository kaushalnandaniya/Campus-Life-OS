import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
  const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
  const apiKey = process.env.GEMINI_API_KEY;
  
  const EXTRACTION_PROMPT = `Extract academic tasks from emails into a JSON array:
[{
  "title": "short name",
  "description": "1 sentence summary",
  "subjectCourse": "Course name or 'General'",
  "taskType": "assignment|quiz|exam|meeting|lecture|event|announcement",
  "deadline": "ISO 8601 or null",
  "estimatedEffortHours": number,
  "priority": "low|medium|high|critical",
  "confidence": number (0-1)
}]
Priority: critical(<24h), high(<3d), medium(<1w), low(other).
Return ONLY the JSON array (no markdown). Empty array [] if no tasks.`;

  const emailContents = `
--- EMAIL 1 ---
ID: 1
SUBJECT: Deadline is tommorw
FROM: kaushalnandania086@gmail.com
BODY:
submit the assignment of DSA by tomorrow
`;

  console.log("Fetching...");
  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: EXTRACTION_PROMPT },
          { text: `\n\nAnalyze the following emails and extract ALL tasks across all of them into a single JSON array:\n${emailContents}` },
        ],
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
    }),
  });

  const data = await res.json();
  console.log("FULL DATA:", JSON.stringify(data, null, 2));
}

test();
