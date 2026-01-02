#!/bin/bash

echo "🧪 TESTING COMPLETE AI FLOW"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Check backend
echo -e "\n${YELLOW}[1/5] Checking backend...${NC}"
if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${GREEN}✓ Backend running${NC}"
else
    echo -e "${RED}✗ Backend not running${NC}"
    echo "Starting backend..."
    cd backend
    npm run dev > /tmp/backend-test.log 2>&1 &
    sleep 5
    cd ..
fi

# Step 2: Test without AI
echo -e "\n${YELLOW}[2/5] Testing WITHOUT AI (should be fast)...${NC}"
NO_AI_JOB=$(curl -s -X POST http://localhost:3001/api/excavate \
  -H "Content-Type: application/json" \
  -d '{"repoPath": ".", "options": {"maxFiles": 3, "skipAnalysis": true}}' | jq -r '.jobId')

echo "Job ID: $NO_AI_JOB"
sleep 3

STATUS=$(curl -s "http://localhost:3001/api/excavate/$NO_AI_JOB" | jq -r '.status')
if [ "$STATUS" == "completed" ]; then
    echo -e "${GREEN}✓ Completed in ~3 seconds${NC}"
else
    echo -e "${YELLOW}⚠ Status: $STATUS${NC}"
fi

# Step 3: Test WITH AI (1 file)
echo -e "\n${YELLOW}[3/5] Testing WITH AI (1 file, may be slow)...${NC}"
WITH_AI_JOB=$(curl -s -X POST http://localhost:3001/api/excavate \
  -H "Content-Type: application/json" \
  -d '{"repoPath": ".", "options": {"maxFiles": 1, "skipAnalysis": false}}' | jq -r '.jobId')

echo "Job ID: $WITH_AI_JOB"

# Wait up to 20 seconds
for i in {1..20}; do
    echo -n "."
    sleep 1
    STATUS=$(curl -s "http://localhost:3001/api/excavate/$WITH_AI_JOB" | jq -r '.status')
    if [ "$STATUS" == "completed" ] || [ "$STATUS" == "failed" ]; then
        echo ""
        break
    fi
done

echo ""
FINAL_STATUS=$(curl -s "http://localhost:3001/api/excavate/$WITH_AI_JOB")
STATUS=$(echo "$FINAL_STATUS" | jq -r '.status')
PROGRESS=$(echo "$FINAL_STATUS" | jq -r '.progress')
STEP=$(echo "$FINAL_STATUS" | jq -r '.currentStep')

echo "Status: $STATUS"
echo "Progress: $PROGRESS%"
echo "Step: $STEP"

if [ "$STATUS" == "completed" ]; then
    echo -e "${GREEN}✓ AI analysis completed!${NC}"
    
    # Check if analysis exists
    REPORT=$(curl -s "http://localhost:3001/api/excavate/$WITH_AI_JOB/report")
    HAS_ANALYSIS=$(echo "$REPORT" | jq -r '.data.files[0].analysis != null')
    
    if [ "$HAS_ANALYSIS" == "true" ]; then
        echo -e "${GREEN}✓ Analysis data present${NC}"
        echo "$REPORT" | jq '.data.files[0].analysis | {summary, businessContext}' | head -20
    else
        echo -e "${RED}✗ No analysis in report${NC}"
    fi
else
    echo -e "${RED}✗ AI analysis ${STATUS}${NC}"
    echo "$FINAL_STATUS" | jq '{status, progress, currentStep, error}'
fi

# Step 4: Check logs
echo -e "\n${YELLOW}[4/5] Recent logs:${NC}"
tail -20 /tmp/backend-test.log 2>/dev/null || tail -20 /tmp/backend-live.log 2>/dev/null || echo "No logs found"

# Step 5: Summary
echo -e "\n${YELLOW}[5/5] SUMMARY${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Without AI: $NO_AI_JOB → $([[ $(curl -s "http://localhost:3001/api/excavate/$NO_AI_JOB" | jq -r '.status') == "completed" ]] && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}")"
echo "With AI:    $WITH_AI_JOB → $([[ $STATUS == "completed" ]] && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}")"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

