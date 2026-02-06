const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Helper to load .env.local
let env = {};
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/"/g, '').replace(/'/g, '');
      env[key] = value;
    }
  });
} catch (err) {
  console.error('Error reading .env.local:', err.message);
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
    console.log('Fetching courses...');
    const { data, error } = await supabase.from('courses').select('title, slug');
    if (error) console.error('Error:', error);
    else console.log('Courses:', JSON.stringify(data, null, 2));
}

test();
