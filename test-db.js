const { createClient } = require('@supabase/supabase-js');
const url = 'https://skhypygfbvzfkjkfjlej.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNraHlweWdmYnZ6Zmtqa2ZqbGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk3MzEyMiwiZXhwIjoyMDg0NTQ5MTIyfQ.u-rCvA7twWD5YCRlv1o3eJ2WcQLKV9D_GH9AV7YbPyU';
const supabase = createClient(url, key);

async function test() {
    console.log('Fetching courses...');
    const { data, error } = await supabase.from('courses').select('title, slug');
    if (error) console.error('Error:', error);
    else console.log('Courses:', JSON.stringify(data, null, 2));
}

test();
