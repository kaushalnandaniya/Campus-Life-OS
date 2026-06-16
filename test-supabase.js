require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("❌ Keys missing in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  const { data, error } = await supabase.from('tasks').select('*').limit(1);
  if (error) {
    console.log("❌ Database error:", error.message);
  } else {
    console.log("✅ Supabase is connected successfully!");
    console.log("Table 'tasks' exists. Current row count:", data.length);
  }
}

testConnection();
