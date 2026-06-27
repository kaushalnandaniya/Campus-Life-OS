// Gmail API Service
// Fetches and filters academic emails from the user's inbox

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  body: string;
}

// Patterns to identify academic emails
const ACADEMIC_SENDERS = [
  ".ac.in",
  "@classroom.google.com",
  "moodle",
  "noreply@google.com", // Classroom notifications
];

const ACADEMIC_KEYWORDS = [
  "assignment",
  "deadline",
  "submission",
  "quiz",
  "exam",
  "test",
  "lecture",
  "attendance",
  "project",
  "lab",
  "practical",
  "seminar",
  "meeting",
  "review",
  "presentation",
  "marks",
  "grade",
  "result",
  "notice",
  "circular",
  "schedule",
  "timetable",
];

/**
 * Fetch recent emails from Gmail API
 */
export async function fetchGmailEmails(
  accessToken: string,
  maxResults: number = 20,
  lastSyncTimestamp: number | null = null
): Promise<EmailMessage[]> {
  // Build query: emails from academic sources since last sync (or last 7 days)
  const query = buildSearchQuery(lastSyncTimestamp);

  // Step 1: List message IDs
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!listRes.ok) {
    const errorData = await listRes.json();
    throw new Error(`Gmail API error: ${JSON.stringify(errorData)}`);
  }

  const listData = await listRes.json();

  if (!listData.messages || listData.messages.length === 0) {
    return [];
  }

  // Step 2: Fetch full content for each message
  const emails: EmailMessage[] = [];

  for (const msg of listData.messages.slice(0, maxResults)) {
    try {
      const email = await fetchSingleEmail(accessToken, msg.id);
      if (email) {
        emails.push(email);
      }
    } catch (err) {
      console.error(`Failed to fetch email ${msg.id}:`, err);
    }
  }

  return emails;
}

/**
 * Build Gmail search query for academic emails
 */
function buildSearchQuery(lastSyncTimestamp: number | null): string {
  const parts: string[] = [];

  if (lastSyncTimestamp) {
    // If we have a previous sync time, only fetch emails after it
    parts.push(`after:${lastSyncTimestamp}`);
  } else {
    // Otherwise default to the last 7 days
    parts.push("newer_than:7d");
  }

  // Exclude sent mail, drafts, and junk categories (Promotions, Social)
  // We use negative filters instead of `category:primary` because institutional Google Workspace 
  // accounts often have inbox tabs disabled, which makes `category:primary` return 0 results.
  parts.push("-in:sent -in:drafts -category:promotions -category:social");

  return parts.join(" ");
}

/**
 * Fetch a single email by ID with full body
 */
async function fetchSingleEmail(
  accessToken: string,
  messageId: string
): Promise<EmailMessage | null> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();

  // Extract headers
  const headers = data.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
      ?.value || "";

  const subject = getHeader("Subject");
  const from = getHeader("From");
  const date = getHeader("Date");

  // Extract body text and strip excessive whitespace
  let body = extractBodyText(data.payload);
  body = body.replace(/\s+/g, " ").trim();

  return {
    id: data.id,
    threadId: data.threadId,
    subject,
    from,
    date,
    snippet: data.snippet || "",
    body: body.slice(0, 800), // Severely cap body length to save tokens (first 800 chars usually contains the task)
  };
}

/**
 * Recursively extract plain text from email payload
 */
function extractBodyText(payload: any): string {
  if (!payload) return "";

  // Direct body
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Multipart — look for text/plain first, then text/html
  if (payload.parts) {
    // Try text/plain first
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Fallback to text/html
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        const html = decodeBase64Url(part.body.data);
        return stripHtml(html);
      }
    }
    // Recurse into nested parts
    for (const part of payload.parts) {
      const text = extractBodyText(part);
      if (text) return text;
    }
  }

  return "";
}

/**
 * Decode base64url-encoded string
 */
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

/**
 * Simple HTML tag stripper
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Filter emails to only academic/relevant ones
 */
export function filterAcademicEmails(emails: EmailMessage[]): EmailMessage[] {
  return emails.filter((email) => {
    const text = `${email.subject} ${email.from} ${email.snippet}`.toLowerCase();

    // Check sender patterns
    const isAcademicSender = ACADEMIC_SENDERS.some((pattern) =>
      text.includes(pattern.toLowerCase())
    );

    // Check for academic keywords
    const hasAcademicKeyword = ACADEMIC_KEYWORDS.some((kw) =>
      text.includes(kw)
    );

    return isAcademicSender || hasAcademicKeyword;
  });
}
