#!/bin/bash

echo "🧪 Testing Full Excavation + Embedding Flow"
echo "=========================================="

# Start backend in background
npm run dev > /tmp/backend-embed-test.log 2>&1 &
BACKEND_PID=$!

sleep 5

# Trigger excavation
echo "1. Starting excavation..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/excavate \
  -H "Content-Type: application/json" \
  -d '{"repoPath":".", "options":{"maxFiles":2}}')

JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
echo "   Job ID: $JOB_ID"

# Wait for completion
echo "2. Waiting for excavation to complete..."
sleep 15

# Check if embeddings were created
echo "3. Checking embeddings..."
cat > /tmp/check-embeddings.ts << INNER_EOF
import { supabase } from './src/lib/supabase.js';

async function check() {
  const { data } = await supabase.from('code_embeddings').select('file_path').eq('job_id', '$JOB_ID');
  console.log('   Embeddings created:', data?.length || 0);
  if (data && data.length > 0) {
    data.forEach(e => console.log('   - ' + e.file_path));
  }
}
check();
INNER_EOF

npx tsx /tmp/check-embeddings.ts

# Check backend logs
echo -e "\n4. Backend logs (last 20 lines):"
tail -20 /tmp/backend-embed-test.log

# Kill backend
kill $BACKEND_PID 2>/dev/null

echo "=========================================="
echo "✅ Test complete!"
