import { aiRouter } from './src/services/ai-router.js';

async function testRouter() {
  console.log('\n🧪 Testing AI Router\n');
  console.log('═══════════════════════════════════════\n');

  const testQueries = [
    { query: 'bug fix', expectedModel: 'oumi' },
    { query: 'feature implementation for user dashboard', expectedModel: 'oumi' },
    { query: 'why does this authentication use bcrypt instead of argon2?', expectedModel: 'gemini' },
    { query: 'how should we refactor this architecture for better scalability?', expectedModel: 'gemini' },
    { query: 'add new button', expectedModel: 'oumi' }
  ];

  for (const test of testQueries) {
    console.log(`📝 Query: "${test.query}"`);
    console.log(`   Expected: ${test.expectedModel}`);
    
    const response = await aiRouter.route(test.query);
    
    console.log(`   ✅ Routed to: ${response.model}`);
    console.log(`   ⏱️  Response time: ${response.responseTimeMs}ms`);
    console.log(`   🎯 Confidence: ${(response.confidence * 100).toFixed(0)}%`);
    console.log(`   💬 Response: ${response.content.substring(0, 80)}...`);
    console.log(`   ${response.fallback ? '⚠️  Used fallback' : '✅ Primary model'}\n`);
  }

  console.log('═══════════════════════════════════════');
  console.log('✅ AI Router tests complete!\n');
}

testRouter();
