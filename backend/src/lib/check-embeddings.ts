import { supabase } from './supabase.js';

async function checkEmbeddings() {
  const { data, error } = await supabase
    .from('code_embeddings')
    .select('id, file_path, embedding')
    .limit(1);
  
  if (data && data.length > 0) {
    // Parse the embedding to check dimensions
    const embeddingStr = data[0].embedding as unknown as string;
    const embedding = JSON.parse(`[${embeddingStr}]`);
    console.log('Existing embedding dimensions:', embedding.length);
    console.log('We need to use dimension:', embedding.length);
  } else {
    console.log('No embeddings found');
  }
}

checkEmbeddings();
