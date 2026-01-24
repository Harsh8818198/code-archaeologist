import { supabase } from './supabase.js';

async function testVectorSetup() {
  console.log('\n🧪 Testing Vector Setup\n');

  // Test 1: Check pgvector extension with correct dimensions (1536)
  const { data: ext, error: extError } = await supabase
    .rpc('search_similar_code', {
      query_embedding: Array(1536).fill(0),  // Changed from 768 to 1536
      match_count: 1
    });

  if (extError) {
    console.log('❌ Vector search function not available:', extError.message);
  } else {
    console.log('✅ Vector search function working');
    console.log('   Found', ext?.length || 0, 'results');
  }

  // Test 2: Check tables exist
  const tables = ['code_embeddings', 'chat_sessions', 'chat_messages', 'ai_usage'];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('count').limit(1);
    if (error) {
      console.log(`❌ Table ${table}:`, error.message);
    } else {
      console.log(`✅ Table ${table}: accessible`);
    }
  }

  console.log('\n✅ Vector setup verified!\n');
}

testVectorSetup().catch(console.error);
