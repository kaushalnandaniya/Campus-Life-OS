require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testConnection() {
  const { data, error } = await supabase.from('activities').select('*').limit(1);
  if (error) {
    console.log("❌ DB Error Details:", JSON.stringify(error, null, 2));
  } else {
    console.log("✅ Success. Row count:", data.length);
  }
}

testConnection();
