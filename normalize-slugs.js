const { createClient } = require('@supabase/supabase-js');
const url = 'https://skhypygfbvzfkjkfjlej.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNraHlweWdmYnZ6Zmtqa2ZqbGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk3MzEyMiwiZXhwIjoyMDg0NTQ5MTIyfQ.u-rCvA7twWD5YCRlv1o3eJ2WcQLKV9D_GH9AV7YbPyU';
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
