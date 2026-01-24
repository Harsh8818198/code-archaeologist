import { supabase } from './src/lib/supabase.js';

async function check() {
  const { data, error } = await supabase
    .from('code_embeddings')
    .select('id, file_path, job_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('\n📊 Recent Embeddings in Database:\n');
    data?.forEach((e, i) => {
      console.log(`${i + 1}. ${e.file_path}`);
      console.log(`   Job: ${e.job_id.slice(0, 8)}...`);
      console.log(`   Created: ${new Date(e.created_at).toLocaleString()}\n`);
    });
  }
}

check();
