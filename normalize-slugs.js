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

async function normalizeSlugs() {
    console.log('Fetching courses...');
    const { data: courses, error } = await supabase.from('courses').select('id, slug');
    if (error) {
        console.error('Fetch error:', error);
        return;
    }

    console.log(`Processing ${courses.length} courses...`);
    for (const course of courses) {
        const newSlug = course.slug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
        if (newSlug !== course.slug) {
            console.log(`Updating slug: "${course.slug}" -> "${newSlug}"`);
            const { error: updateError } = await supabase
                .from('courses')
                .update({ slug: newSlug })
                .eq('id', course.id);
            
            if (updateError) console.error(`Failed to update ${course.id}:`, updateError);
            else console.log(`Successfully updated ${course.id}`);
        } else {
            console.log(`Slug "${course.slug}" is already normalized.`);
        }
    }
}

normalizeSlugs();
