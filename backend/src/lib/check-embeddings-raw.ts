import { supabase } from './supabase.js';

async function checkEmbeddings() {
  const { data, error } = await supabase
    .from('code_embeddings')
    .select('id, file_path, embedding')
    .limit(1);
  
  if (data && data.length > 0) {
    const embedding = data[0].embedding;
    console.log('Type:', typeof embedding);
    console.log('Value (first 200 chars):', JSON.stringify(embedding).substring(0, 200));
    
    // Try to determine dimension
    if (typeof embedding === 'string') {
      const matches = embedding.match(/,/g);
      console.log('Comma count (approx dimensions):', matches ? matches.length + 1 : 0);
    } else if (Array.isArray(embedding)) {
      console.log('Array length:', embedding.length);
    }
  } else {
    console.log('No embeddings found');
  }
}

checkEmbeddings();
