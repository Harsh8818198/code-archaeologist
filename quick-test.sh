#!/bin/bash

echo ""
echo "🏛️ CODE ARCHAEOLOGIST - QUICK TECH TEST"
echo "========================================"
echo ""

PASS=0
FAIL=0

check() {
    if [ $1 -eq 0 ]; then
        echo "✅ $2"
        PASS=$((PASS + 1))
    else
        echo "❌ $2"
        FAIL=$((FAIL + 1))
    fi
}

# 1. GEMINI
echo "🟡 STONE 1: GEMINI"
curl -s http://localhost:3001/health | grep -q "healthy\|ok" && check 0 "Backend with Gemini running" || check 1 "Backend NOT running"

# 2. KESTRA
echo ""
echo "🟣 STONE 2: KESTRA"
[ -f ~/kestra/docker-compose.yml ] && check 0 "Kestra docker-compose exists" || check 1 "Kestra NOT configured"
docker ps 2>/dev/null | grep -q "kestra" && check 0 "Kestra container running" || check 1 "Kestra container NOT running"

# 3. OUMI
echo ""
echo "🟢 STONE 3: OUMI"
[ -d "oumi-training" ] && check 0 "Oumi training folder exists" || check 1 "Oumi folder missing"
[ -f "oumi-training/train-config.yaml" ] && check 0 "Training config exists" || check 1 "Training config missing"
[ -f "oumi-training/training-data.jsonl" ] && check 0 "Training data exists ($(wc -l < oumi-training/training-data.jsonl) examples)" || check 1 "Training data missing"

# 4. VERCEL
echo ""
echo "🔵 STONE 4: VERCEL"
[ -d "frontend" ] && check 0 "Frontend exists" || check 1 "Frontend missing"
[ -d ".vercel" ] || [ -d "frontend/.vercel" ] && check 0 "Vercel linked" || check 1 "Vercel NOT linked"
curl -s http://localhost:3000 2>/dev/null | grep -q "html\|doctype" && check 0 "Frontend running on 3000" || \
  curl -s http://localhost:3002 2>/dev/null | grep -q "html" && check 0 "Frontend running on 3002" || check 1 "Frontend NOT running"

# 5. CLINE (Agent Architecture)
echo ""
echo "🔮 STONE 5: CLINE-STYLE AGENTS"
[ -f "backend/src/agents/excavator.ts" ] && check 0 "Excavator Agent exists" || check 1 "Excavator missing"
[ -f "backend/src/agents/query.ts" ] || [ -f "src/agents/query.ts" ] && check 0 "Query Agent exists" || check 1 "Query agent missing"

# 6. CODERABBIT
echo ""
echo "🐰 STONE 6: CODERABBIT"
[ -f ".coderabbit.yaml" ] && check 0 "CodeRabbit config exists" || check 1 "CodeRabbit NOT configured"

# 7. FULL FLOW TEST
echo ""
echo "🔌 FULL FLOW TEST"
RESPONSE=$(curl -s -X POST http://localhost:3001/api/excavate \
  -H "Content-Type: application/json" \
  -d '{"repoPath": "/home/shank/projects/code-archaeologist", "options": {"maxFiles": 2}}' 2>/dev/null)

if echo "$RESPONSE" | grep -q "jobId"; then
    JOB_ID=$(echo "$RESPONSE" | grep -oP '"jobId":\s*"\K[^"]+' | head -1)
    check 0 "Excavation started: $JOB_ID"
    
    echo "   Waiting 5s for processing..."
    sleep 5
    
    STATUS=$(curl -s "http://localhost:3001/api/jobs/$JOB_ID" 2>/dev/null)
    echo "$STATUS" | grep -q "completed\|running" && check 0 "Job processing correctly" || check 1 "Job status unknown"
else
    check 1 "Excavation endpoint failed"
fi

# SUMMARY
echo ""
echo "========================================"
echo "📊 RESULTS: $PASS passed, $FAIL failed"
TOTAL=$((PASS + FAIL))
PERCENT=$((PASS * 100 / TOTAL))
echo "📈 Score: $PERCENT%"

if [ $PERCENT -ge 80 ]; then
    echo "🎉 EXCELLENT! Ready for hackathon!"
elif [ $PERCENT -ge 60 ]; then
    echo "👍 GOOD! Minor fixes needed."
else
    echo "⚠️ NEEDS WORK!"
fi
echo ""
