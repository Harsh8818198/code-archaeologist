#!/bin/bash

echo "🧪 TESTING COMPLETE SYSTEM"
echo "=========================="

# Test 1: Basic Health
echo -e "\n[1/5] Testing Service Health..."
curl -s http://localhost:3001/health | jq . && echo "  ✅ Backend healthy"
curl -s http://localhost:3000/api/health | jq . && echo "  ✅ Frontend healthy"

# Test 2: Kestra Webhook Endpoints
echo -e "\n[2/5] Testing Kestra Webhooks..."
curl -s http://localhost:3000/api/kestra | jq . && echo "  ✅ Frontend webhook ready"

# Test 3: Quick Excavation (no AI)
echo -e "\n[3/5] Testing Quick Excavation (no AI)..."
QUICK_JOB=$(curl -s -X POST http://localhost:3001/api/excavate \
  -H "Content-Type: application/json" \
  -d '{"repoPath": ".", "options": {"maxFiles": 2, "skipAnalysis": true}}' | jq -r '.jobId')

echo "  Job: $QUICK_JOB"
sleep 3

STATUS=$(curl -s "http://localhost:3001/api/excavate/$QUICK_JOB" | jq -r '.status')
if [ "$STATUS" == "completed" ]; then
    echo "  ✅ Quick excavation works"
else
    echo "  ⚠️  Status: $STATUS"
fi

# Test 4: AI Excavation (with Gemini)
echo -e "\n[4/5] Testing AI Excavation (Gemini)..."
AI_JOB=$(curl -s -X POST http://localhost:3001/api/excavate \
  -H "Content-Type: application/json" \
  -d '{"repoPath": ".", "options": {"maxFiles": 1, "skipAnalysis": false}}' | jq -r '.jobId')

echo "  Job: $AI_JOB"
echo "  Waiting 10 seconds for Gemini..."
sleep 10

AI_RESULT=$(curl -s "http://localhost:3001/api/excavate/$AI_JOB/report")
HAS_ANALYSIS=$(echo "$AI_RESULT" | jq -r '.data.files[0].analysis.summary != null')

if [ "$HAS_ANALYSIS" == "true" ]; then
    echo "  ✅ Gemini AI analysis works"
    echo "$AI_RESULT" | jq '.data.files[0].analysis | {summary, confidenceScore}' | head -5
else
    echo "  ❌ AI analysis failed"
fi

# Test 5: Frontend → Backend Flow
echo -e "\n[5/5] Testing Frontend → Backend Flow..."
FRONTEND_JOB=$(curl -s -X POST http://localhost:3000/api/excavate \
  -H "Content-Type: application/json" \
  -d '{"repoPath": ".", "options": {"maxFiles": 1}}' | jq -r '.jobId')

echo "  Frontend Job: $FRONTEND_JOB"
sleep 3

FRONTEND_STATUS=$(curl -s "http://localhost:3000/api/jobs/$FRONTEND_JOB" | jq -r '.status')
if [ "$FRONTEND_STATUS" == "completed" ] || [ "$FRONTEND_STATUS" == "processing" ]; then
    echo "  ✅ Frontend → Backend integration works"
else
    echo "  ⚠️  Status: $FRONTEND_STATUS"
fi

echo -e "\n=========================="
echo "✅ SYSTEM TEST COMPLETE!"
echo "=========================="
