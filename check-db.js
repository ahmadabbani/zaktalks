
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim().replace(/"/g, '').replace(/'/g, '');
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log('--- Inspecting Columns via RPC/SQL ---');
  
  // Since we don't have a direct SQL tool, we try to use a common RPC if it exists, 
  // or we just try a very basic query that might fail but give us info in error.
  // Actually, let's try to fetch from information_schema via a trick if RLS allows service role.
  // Wait, Supabase client doesn't easily allow arbitrary SQL unless defined as RPC.
  
  // Let's try to insert a fake row with many columns to see what's allowed? No, too messy.
  // Let's try to use the 'rest' api via fetch to get the OpenAPI spec which has schema.
  
  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  
  const schema = await response.json();
  
  const tables = ['courses', 'course_faqs', 'course_images'];
  tables.forEach(table => {
    const tableInfo = schema.definitions[table];
    if (tableInfo) {
      console.log(`\nTable: ${table}`);
      console.log('Columns:', Object.keys(tableInfo.properties));
    } else {
      console.log(`\nTable: ${table} NOT FOUND in schema definitions`);
    }
  });
}

check();
