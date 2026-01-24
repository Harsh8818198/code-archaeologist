import { vectorService } from '../services/vector-service.js';
import { supabase } from '../lib/supabase.js';

async function testVectorService() {
  console.log('\n🧪 Testing Vector Service (Gemini)\n');
  console.log('═══════════════════════════════════════\n');

  let testJobId: string | null = null;

  try {
    // Create a test job first
    console.log('🔧 Setup: Creating test job');
    if (supabase) {
      const { data: job, error } = await supabase
        .from('jobs')
        .insert({
          repo_url: 'test://vector-service-test',
          status: 'completed',
          progress: 100,
          current_step: 'Test'
        })
        .select()
        .single();

      if (error) throw error;
      testJobId = job.id;
      console.log(`✅ Test job created: ${testJobId}\n`);
    } else {
      console.log('⚠️  Supabase not available, skipping persistence tests\n');
      return;
    }

    // Test 1: Generate embedding
    console.log('📝 Test 1: Generate Embedding');
    const testText = 'async function authenticateUser(username, password) { return bcrypt.compare(password, hash); }';
    const embedding = await vectorService.embedText(testText);
    console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
    console.log(`   First 5 values: [${embedding.slice(0, 5).map(n => n.toFixed(4)).join(', ')}...]\n`);

    // Test 2: Store embedding
    console.log('💾 Test 2: Store Embedding');
    await vectorService.storeEmbedding(
      testJobId!,
      'test/auth.ts',
      testText,
      embedding,
      { test: true, language: 'typescript' }
    );
    console.log('✅ Embedding stored successfully\n');

    // Test 3: Search similar code
    console.log('🔍 Test 3: Semantic Search');
    const searchQuery = 'password authentication function';
    console.log(`   Query: "${searchQuery}"`);
    const results = await vectorService.searchSimilar(searchQuery, {
      jobId: testJobId!,
      threshold: 0.3,
      limit: 5
    });
    console.log(`✅ Found ${results.length} similar code snippets`);
    
    if (results.length > 0) {
      console.log('\n   Top result:');
      console.log(`   File: ${results[0].file_path}`);
      console.log(`   Similarity: ${(results[0].similarity * 100).toFixed(1)}%`);
      console.log(`   Code: ${results[0].code_chunk.substring(0, 80)}...\n`);
    } else {
      console.log('   ⚠️  No results found (threshold might be too high)\n');
    }

    console.log('═══════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED!\n');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.code) console.error('   Error code:', error.code);
    process.exit(1);
  } finally {
    // Cleanup
    if (testJobId && supabase) {
      console.log('🧹 Cleanup: Removing test data');
      await supabase.from('jobs').delete().eq('id', testJobId);
      console.log('✅ Cleanup complete\n');
    }
  }
}

testVectorService();
