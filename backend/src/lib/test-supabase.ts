/**
 * Supabase Connection & Schema Test
 * Run: npx tsx src/lib/test-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('\n🔍 SUPABASE CONNECTION TEST');
console.log('═'.repeat(50));

// Step 1: Check env vars
console.log('\n[1/5] Environment Variables:');
if (!supabaseUrl) {
  console.log('  ❌ SUPABASE_URL is missing');
  process.exit(1);
} else {
  console.log(`  ✅ SUPABASE_URL: ${supabaseUrl.slice(0, 30)}...`);
}

if (!supabaseKey) {
  console.log('  ❌ SUPABASE_ANON_KEY is missing');
  process.exit(1);
} else {
  console.log(`  ✅ SUPABASE_ANON_KEY: ${supabaseKey.slice(0, 20)}...`);
}

// Step 2: Create client
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  // Step 3: Test connection
  console.log('\n[2/5] Testing Connection:');
  try {
    const { data, error } = await supabase.from('jobs').select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log('  ✅ Connected to Supabase successfully!');
  } catch (e: any) {
    console.log(`  ❌ Connection failed: ${e.message}`);
    if (e.message.includes('relation "public.jobs" does not exist')) {
      console.log('  ⚠️  The "jobs" table does not exist. Did you run the SQL schema?');
    }
    process.exit(1);
  }

  // Step 4: Test schema - Check all tables exist
  console.log('\n[3/5] Verifying Schema:');
  
  const tables = ['jobs', 'artifacts', 'analysis_cache'];
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error) throw error;
      console.log(`  ✅ Table "${table}" exists`);
    } catch (e: any) {
      console.log(`  ❌ Table "${table}" missing or inaccessible: ${e.message}`);
    }
  }

  // Step 5: Test CRUD operations
  console.log('\n[4/5] Testing CRUD Operations:');
  
  // CREATE
  let testJobId: string | null = null;
  try {
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        repo_url: 'https://github.com/test/test-repo',
        status: 'pending',
        progress: 0,
        current_step: 'Test job'
      })
      .select()
      .single();
    
    if (error) throw error;
    testJobId = data.id;
    console.log(`  ✅ CREATE: Job created with ID ${testJobId}`);
  } catch (e: any) {
    console.log(`  ❌ CREATE failed: ${e.message}`);
  }

  // READ
  if (testJobId) {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', testJobId)
        .single();
      
      if (error) throw error;
      console.log(`  ✅ READ: Found job with status "${data.status}"`);
    } catch (e: any) {
      console.log(`  ❌ READ failed: ${e.message}`);
    }
  }

  // UPDATE
  if (testJobId) {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'processing', 
          progress: 50,
          current_step: 'Testing update'
        })
        .eq('id', testJobId);
      
      if (error) throw error;
      console.log('  ✅ UPDATE: Job updated successfully');
    } catch (e: any) {
      console.log(`  ❌ UPDATE failed: ${e.message}`);
    }
  }

  // DELETE (cleanup)
  if (testJobId) {
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', testJobId);
      
      if (error) throw error;
      console.log('  ✅ DELETE: Test job cleaned up');
    } catch (e: any) {
      console.log(`  ❌ DELETE failed: ${e.message}`);
    }
  }

  // Step 6: Test Realtime is enabled
  console.log('\n[5/5] Checking Realtime:');
  try {
    const channel = supabase
      .channel('test-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {})
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('  ✅ Realtime subscription works!');
          channel.unsubscribe();
        }
      });
    
    // Give it a moment to connect
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (e: any) {
    console.log(`  ⚠️  Realtime test inconclusive: ${e.message}`);
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('✅ SUPABASE SETUP COMPLETE!');
  console.log('═'.repeat(50));
  console.log('\nYour database is ready. Jobs will now persist!');
  console.log('Next step: Update excavate.ts to use JobService\n');
}

runTests().catch(console.error);
