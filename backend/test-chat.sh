#!/bin/bash

echo "🧪 Testing Context-Aware Chat API"
echo "=========================================="

# Kill existing processes
pkill -f "tsx watch src/server.ts"
lsof -ti:3001 | xargs kill -9 2>/dev/null
sleep 2

# Start backend
npm run dev > /tmp/chat-test.log 2>&1 &
BACKEND_PID=$!

echo "Waiting for backend..."
sleep 6

# Get a recent job ID
echo "Getting recent job..."
JOB_ID=$(npx tsx -e "
import { supabase } from './src/lib/supabase.js';
const { data } = await supabase.from('jobs').select('id').eq('status', 'completed').order('created_at', { ascending: false }).limit(1).single();
console.log(data?.id || '');
" 2>/dev/null | tail -1)

echo "Using job ID: $JOB_ID"
echo ""

# Test 1: Simple question (should use Oumi)
echo "📝 Test 1: Simple Question (no context)"
curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is a bug fix?"}' 

echo -e "\n"

# Test 2: Question with job context
if [ -n "$JOB_ID" ]; then
  echo "📝 Test 2: Question with Job Context"
  RESPONSE=$(curl -s -X POST http://localhost:3001/api/chat \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"What files are in this repository?\",\"jobId\":\"$JOB_ID\"}")
  
  SESSION_ID=$(echo "$RESPONSE" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
  echo "$RESPONSE"
  echo -e "\nSession ID: $SESSION_ID\n"
  
  # Test 3: Follow-up question
  if [ -n "$SESSION_ID" ]; then
    echo "📝 Test 3: Follow-up Question (with session)"
    curl -s -X POST http://localhost:3001/api/chat \
      -H "Content-Type: application/json" \
      -d "{\"message\":\"Tell me more about the first file\",\"sessionId\":\"$SESSION_ID\",\"jobId\":\"$JOB_ID\"}"
    echo ""
  fi
else
  echo "⚠️  No completed jobs found, skipping context tests"
fi

echo ""
echo "=========================================="
echo "Backend logs (last 25 lines):"
tail -25 /tmp/chat-test.log

kill $BACKEND_PID 2>/dev/null
echo -e "\n✅ Test complete!"
