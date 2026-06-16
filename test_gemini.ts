import { extractTasksFromEmails } from "./src/lib/gemini";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function run() {
  console.log("Testing Gemini extraction...");
  const tasks = await extractTasksFromEmails([
    {
      id: "test1",
      subject: "Fwd: Mutual Fund - Sumarry",
      from: "2023 03036 <202303036@dau.ac.in>",
      body: "do the total summary and investment thing of Mutual fund by this sunday"
    }
  ]);
  
  console.log("Extracted tasks:", JSON.stringify(tasks, null, 2));
}

run().catch(console.error);
