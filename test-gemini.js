require('dotenv').config({ path: '.env.local' });
const { fetchGmailEmails, filterAcademicEmails } = require('./src/lib/gmail.ts');
const { extractTasksFromEmails } = require('./src/lib/gemini.ts');

// We need to compile TypeScript, so let's just write a plain JS fetch directly here
async function test() {
  const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
  const apiKey = process.env.GEMINI_API_KEY;
  
  const emailContents = `
--- EMAIL 1 ---
ID: 1
SUBJECT: Assignment 1 Due Tomorrow
FROM: professor@dau.ac.in
BODY:
Please submit Assignment 1 by tomorrow 11:59 PM.
`;

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

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: EXTRACTION_PROMPT },
            { text: `\n\nAnalyze the following emails and extract ALL tasks across all of them into a single JSON array:\n${emailContents}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    }),
  });

  const data = await res.json();
  if (data.error) {
     console.log("Error:", JSON.stringify(data.error, null, 2));
  } else {
     const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
     console.log("Raw Response:", responseText);
  }
}
test();
