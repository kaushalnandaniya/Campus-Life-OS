// Gemini AI Service
// Extracts structured academic tasks from raw email text

import { type Task } from "./demo-data";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

const EXTRACTION_PROMPT = `Extract BOTH actionable items (tasks, events) AND non-actionable items (receipts, notices, executed orders) from emails into a JSON array:
[{
  "emailId": "The ID of the email this item came from",
  "title": "short name",
  "description": "1 sentence summary",
  "subjectCourse": "Course name, 'Personal', or 'General'",
  "taskType": "assignment|quiz|exam|meeting|lecture|event|announcement|chore|personal|notice",
  "deadline": "ISO 8601 or null",
  "estimatedEffortHours": number (use 0 for notices),
  "priority": "low|medium|high|critical",
  "confidence": number (0-1)
}]
Priority: critical(<24h), high(<3d), medium(<1w), low(other).
Note: For non-actionable informational emails (like mutual fund executions, receipts, or simple updates), use taskType "notice", estimatedEffortHours 0, and priority "low".
Return ONLY the JSON array (no markdown). Empty array [] if no items.`;

interface GeminiExtractedTask {
  emailId: string;
  title: string;
  description: string;
  subjectCourse: string;
  taskType: string;
  deadline: string | null;
  estimatedEffortHours: number;
  priority: string;
  confidence: number;
}

/**
 * Extract academic tasks from email content using Gemini AI
 */
export async function extractTasksFromEmail(
  subject: string,
  from: string,
  body: string,
  emailId: string
): Promise<Partial<Task>[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("GEMINI_API_KEY not set");
    return [];
  }

  const emailContent = `
EMAIL SUBJECT: ${subject}
FROM: ${from}
BODY:
${body}
`.trim();

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: EXTRACTION_PROMPT },
              { text: `\n\nEMAIL TO ANALYZE:\n${emailContent}` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1, // Low temperature for consistent structured output
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("Gemini API error:", errorData);
      return [];
    }

    const data = await res.json();

    // Extract text from response
    const responseText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON from response
    const tasks = parseJsonResponse(responseText);

    // Convert to our Task format
    return tasks.map((t: GeminiExtractedTask) => ({
      id: `ai-${emailId}-${Math.random().toString(36).slice(2, 8)}`,
      title: t.title,
      description: t.description,
      subjectCourse: t.subjectCourse || "General",
      taskType: validateTaskType(t.taskType),
      deadline: t.deadline || undefined,
      estimatedEffortHours: Math.max(0.5, Math.min(t.estimatedEffortHours, 20)),
      priority: validatePriority(t.priority),
      status: "pending" as const,
      source: "gmail" as const,
      aiConfidence: Math.max(0, Math.min(t.confidence, 1)),
      createdAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.error("Failed to extract tasks with Gemini:", err);
    return [];
  }
}

/**
 * Parse JSON from Gemini response (handles markdown code fences)
 */
function parseJsonResponse(text: string): GeminiExtractedTask[] {
  // Remove markdown code fences if present
  let cleaned = text.trim();

  // Remove ```json ... ``` wrapper
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    // If it's an object, check if it wraps an array (e.g. { "tasks": [...] })
    if (typeof parsed === "object" && parsed !== null) {
      const potentialArray = Object.values(parsed).find(Array.isArray);
      if (potentialArray) {
        return potentialArray as GeminiExtractedTask[];
      }
      return [parsed as GeminiExtractedTask];
    }
    
    return [];
  } catch (e) {
    // Try to find JSON array in the text
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        console.error("Failed to parse extracted JSON:", e);
        return [];
      }
    }
    return [];
  }
}

function validateTaskType(type: string): Task["taskType"] {
  const valid = [
    "assignment",
    "quiz",
    "exam",
    "meeting",
    "lecture",
    "event",
    "announcement",
    "chore",
    "personal",
    "notice"
  ] as const;
  return valid.includes(type as any) ? (type as Task["taskType"]) : "event";
}

function validatePriority(priority: string): Task["priority"] {
  const valid = ["low", "medium", "high", "critical"] as const;
  return valid.includes(priority as any)
    ? (priority as Task["priority"])
    : "medium";
}

// Standard models to try, falling back if rate limited
const FALLBACK_MODELS = [
  "gemini-3.5-flash", // Next-gen fast model available on your project
  "gemini-2.5-flash", // Stable next-gen model
  "gemini-flash-latest" // Dynamic routing fallback
];

/**
 * Batch extract tasks from multiple emails in a SINGLE request to avoid rate limits
 */
export async function extractTasksFromEmails(
  emails: { id: string; subject: string; from: string; body: string; _sourceAccount?: string }[]
): Promise<Partial<Task>[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || emails.length === 0) {
    return [];
  }

  // Combine all emails into a single prompt block
  const emailContents = emails
    .map(
      (e, index) => `
--- EMAIL ${index + 1} ---
ID: ${e.id}
SUBJECT: ${e.subject}
FROM: ${e.from}
BODY:
${e.body}
`
    )
    .join("\n\n");

  let lastError = null;

  for (const model of FALLBACK_MODELS) {
    const modelUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    try {
      const res = await fetch(`${modelUrl}?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: EXTRACTION_PROMPT },
                {
                  text: `\n\nAnalyze the following emails and extract ALL tasks across all of them into a single JSON array:\n${emailContents}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        
        // If 429 Rate Limit, 404 Model Not Found, or 503 High Demand, log and try next model
        if (res.status === 429 || res.status === 404 || res.status === 503) {
          console.warn(`[Gemini] Model ${model} failed (${res.status}). Trying fallback...`);
          lastError = errorData;
          continue; // Try next model in the array
        }

        // For other unrecoverable errors, just fail
        console.error(`Gemini API error on model ${model}:`, errorData);
        return [];
      }

      // Success! Parse and return tasks
      const data = await res.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const tasks = parseJsonResponse(responseText);

      const allTasks = tasks.map((t: GeminiExtractedTask) => {
        // Find the original email to get its source account
        const originalEmail = emails.find(e => e.id === t.emailId);
        const sourceLabel = originalEmail?._sourceAccount ? `Gmail (${originalEmail._sourceAccount})` : "Gmail";

        return {
          id: `ai-${Math.random().toString(36).slice(2, 8)}`,
          title: t.title,
          description: t.description,
          subjectCourse: t.subjectCourse || "General",
          taskType: validateTaskType(t.taskType),
          deadline: t.deadline || undefined,
          estimatedEffortHours: Math.max(0.5, Math.min(t.estimatedEffortHours, 20)),
          priority: validatePriority(t.priority),
          status: "pending" as const,
          source: sourceLabel as any, // Cast as any because the Task type strictly enforces "gmail" | "moodle", we'll update that next
          aiConfidence: Math.max(0, Math.min(t.confidence, 1)),
          createdAt: new Date().toISOString(),
        };
      });

      return deduplicateTasks(allTasks);

    } catch (err) {
      console.warn(`[Gemini] Request failed for model ${model}:`, err);
      lastError = err;
    }
  }

  // CROSS-PROVIDER FALLBACK: If Gemini fails entirely, try Groq (Llama 3)
  const groqApiKey = process.env.GROQ_API_KEY;
  if (groqApiKey) {
    console.warn("All Gemini models failed. Rerouting to Groq (Llama 3) fallback...");
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", // Fast and free Llama 3.3
          messages: [
            { role: "system", content: EXTRACTION_PROMPT },
            { role: "user", content: `Analyze the following emails and extract ALL tasks into a single JSON array:\n${emailContents}` }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" }
        })
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        const responseText = groqData.choices?.[0]?.message?.content || "";
        // Groq response_format json_object requires returning an object, so the prompt might wrap it in {"tasks": []}
        // Our parseJsonResponse is robust enough to pull out arrays.
        let tasks = parseJsonResponse(responseText);
        
        // If it wrapped it in an object like { tasks: [...] }
        if (!Array.isArray(tasks) && typeof tasks === "object" && tasks !== null) {
           const potentialArray = Object.values(tasks).find(Array.isArray);
           if (potentialArray) tasks = potentialArray;
        }

        if (Array.isArray(tasks)) {
           const allTasks = tasks.map((t: any) => {
            const originalEmail = emails.find(e => e.id === t.emailId);
            const sourceLabel = originalEmail?._sourceAccount ? `Gmail (${originalEmail._sourceAccount})` : "Gmail";

            return {
              id: `groq-${Math.random().toString(36).slice(2, 8)}`,
              title: t.title || "Untitled",
              description: t.description || "",
              subjectCourse: t.subjectCourse || "General",
              taskType: validateTaskType(t.taskType),
              deadline: t.deadline || undefined,
              estimatedEffortHours: Math.max(0.5, Math.min(t.estimatedEffortHours || 1, 20)),
              priority: validatePriority(t.priority),
              status: "pending" as const,
              source: sourceLabel as any,
              aiConfidence: Math.max(0, Math.min(t.confidence || 0.8, 1)),
              createdAt: new Date().toISOString(),
            };
          });
          console.log("[Groq] Fallback extraction successful!");
          return deduplicateTasks(allTasks);
        }
      } else {
        const groqErr = await groqRes.text();
        console.error("Groq API error:", groqErr);
      }
    } catch (err) {
      console.error("Groq fallback failed:", err);
    }
  }

  // If we reach here, all fallback models failed
  console.error("All AI providers failed. Last Gemini error:", lastError);
  return [];
}

/**
 * Simple deduplication: remove tasks with very similar titles
 */
function deduplicateTasks(tasks: Partial<Task>[]): Partial<Task>[] {
  const seen = new Set<string>();
  return tasks.filter((task) => {
    const key = (task.title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
