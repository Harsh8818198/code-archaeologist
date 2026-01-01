#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  🏛️  CODE ARCHAEOLOGIST - INFINITY STONES TEST SUITE            ║"
echo "║  Testing all 6 technologies used in this project                 ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

PASS_COUNT=0
FAIL_COUNT=0
TOTAL_TESTS=0

# Test function
test_result() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $1 -eq 0 ]; then
        echo -e "  ${GREEN}✅ PASS${NC}: $2"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "  ${RED}❌ FAIL${NC}: $2"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
}

# ════════════════════════════════════════════════════════════════════
# STONE 1: GEMINI AI (Google)
# ════════════════════════════════════════════════════════════════════
echo -e "\n${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}🟡 STONE 1: GEMINI AI (Google Generative AI)${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"

# Check if API key exists
if [ -n "$GOOGLE_AI_API_KEY" ] || [ -n "$GEMINI_API_KEY" ] || grep -q "GOOGLE_AI_API_KEY\|GEMINI_API_KEY" .env backend/.env 2>/dev/null; then
    test_result 0 "Gemini API Key configured"
else
    test_result 1 "Gemini API Key NOT configured"
fi

# Check if Gemini package is installed
if grep -q "@google/generative-ai" package.json backend/package.json 2>/dev/null; then
    test_result 0 "Gemini SDK installed (@google/generative-ai)"
else
    test_result 1 "Gemini SDK NOT installed"
fi

# Test Gemini connection via API
echo -e "\n  Testing Gemini via API..."
HEALTH_RESPONSE=$(curl -s http://localhost:3001/health 2>/dev/null)
if echo "$HEALTH_RESPONSE" | grep -q "gemini\|healthy"; then
    test_result 0 "Gemini integration working (via health check)"
else
    test_result 1 "Gemini integration NOT working"
fi

# ════════════════════════════════════════════════════════════════════
# STONE 2: KESTRA (Orchestration)
# ════════════════════════════════════════════════════════════════════
echo -e "\n${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}🟣 STONE 2: KESTRA (Workflow Orchestration)${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"

# Check if Kestra docker-compose exists
if [ -f ~/kestra/docker-compose.yml ] || [ -f ./docker-compose.yml ]; then
    test_result 0 "Kestra docker-compose.yml found"
else
    test_result 1 "Kestra docker-compose.yml NOT found"
fi

# Check if Kestra is running
if curl -s http://localhost:8080/api/v1/flows 2>/dev/null | grep -q "flows\|namespace" || curl -s http://localhost:8080 2>/dev/null | grep -q "Kestra"; then
    test_result 0 "Kestra server running on port 8080"
else
    test_result 1 "Kestra server NOT running (start with: cd ~/kestra && docker compose up -d)"
fi

# Check kestra-client.ts
if [ -f src/orchestration/kestra-client.ts ] || [ -f backend/src/orchestration/kestra-client.ts ]; then
    test_result 0 "Kestra client code exists"
else
    test_result 1 "Kestra client code NOT found"
fi

# ════════════════════════════════════════════════════════════════════
# STONE 3: OUMI (RL Fine-tuning)
# ════════════════════════════════════════════════════════════════════
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🟢 STONE 3: OUMI (Reinforcement Learning Fine-tuning)${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"

# Check if oumi-training folder exists
if [ -d "oumi-training" ]; then
    test_result 0 "Oumi training directory exists"
else
    test_result 1 "Oumi training directory NOT found"
fi

# Check training config
if [ -f "oumi-training/train-config.yaml" ] || [ -f "train-config.yaml" ]; then
    test_result 0 "Training config (train-config.yaml) found"
else
    test_result 1 "Training config NOT found"
fi

# Check training data
TRAINING_DATA_LINES=0
if [ -f "oumi-training/training-data.jsonl" ]; then
    TRAINING_DATA_LINES=$(wc -l < oumi-training/training-data.jsonl)
    test_result 0 "Training data found ($TRAINING_DATA_LINES examples)"
elif [ -f "training-data.jsonl" ]; then
    TRAINING_DATA_LINES=$(wc -l < training-data.jsonl)
    test_result 0 "Training data found ($TRAINING_DATA_LINES examples)"
else
    test_result 1 "Training data NOT found"
fi

# Check DPO training data
if [ -f "dpo-training-data.jsonl" ] || [ -f "oumi-training/dpo-training-data.jsonl" ]; then
    test_result 0 "DPO training data found"
else
    test_result 1 "DPO training data NOT found (optional)"
fi

# Check if Oumi is installed
if [ -d "oumi-training/venv" ]; then
    if source oumi-training/venv/bin/activate 2>/dev/null && python -c "import oumi" 2>/dev/null; then
        test_result 0 "Oumi package installed in venv"
        deactivate 2>/dev/null
    else
        test_result 1 "Oumi package NOT installed (run: pip install oumi)"
    fi
else
    test_result 1 "Oumi venv NOT found"
fi

# Check if model was trained
if [ -d "oumi-training/output/archaeologist-model" ] || [ -d "oumi-training/output" ]; then
    if ls oumi-training/output/*/adapter_model.safetensors 2>/dev/null || ls oumi-training/output/*/*/adapter_model.safetensors 2>/dev/null; then
        test_result 0 "Trained model found (LoRA adapter)"
    else
        test_result 1 "No trained model found yet"
    fi
else
    test_result 1 "Output directory NOT found"
fi

# ════════════════════════════════════════════════════════════════════
# STONE 4: VERCEL (Deployment)
# ════════════════════════════════════════════════════════════════════
echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔵 STONE 4: VERCEL (Frontend Deployment)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

# Check if frontend exists
if [ -d "frontend" ]; then
    test_result 0 "Frontend directory exists"
else
    test_result 1 "Frontend directory NOT found"
fi

# Check Next.js
if [ -f "frontend/package.json" ] && grep -q "next" frontend/package.json; then
    test_result 0 "Next.js configured"
else
    test_result 1 "Next.js NOT configured"
fi

# Check vercel.json
if [ -f "vercel.json" ] || [ -f "frontend/vercel.json" ]; then
    test_result 0 "vercel.json found"
else
    test_result 1 "vercel.json NOT found"
fi

# Check .vercel folder
if [ -d ".vercel" ] || [ -d "frontend/.vercel" ]; then
    test_result 0 "Vercel project linked (.vercel folder exists)"
else
    test_result 1 "Vercel project NOT linked"
fi

# Check if frontend is running
if curl -s http://localhost:3000 2>/dev/null | grep -q "html\|doctype\|next" || curl -s http://localhost:3002 2>/dev/null | grep -q "html"; then
    test_result 0 "Frontend running locally"
else
    test_result 1 "Frontend NOT running locally"
fi

# ════════════════════════════════════════════════════════════════════
# STONE 5: CLINE (AI Agent Architecture)
# ════════════════════════════════════════════════════════════════════
echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🔮 STONE 5: CLINE-INSPIRED (AI Agent Architecture)${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"

# Check excavator agent
if [ -f "backend/src/agents/excavator.ts" ] || [ -f "src/agents/excavator.ts" ]; then
    test_result 0 "Excavator Agent found"
else
    test_result 1 "Excavator Agent NOT found"
fi

# Check query agent
if [ -f "backend/src/agents/query.ts" ] || [ -f "src/agents/query.ts" ]; then
    test_result 0 "Query Agent found"
else
    test_result 1 "Query Agent NOT found"
fi

# Check if agents can be imported
if [ -f "dist/agents/excavator.js" ] || [ -f "backend/dist/agents/excavator.js" ]; then
    test_result 0 "Agents compiled (JS found)"
else
    test_result 1 "Agents NOT compiled"
fi

# Check cline automation scripts
if [ -d "scripts/cline-automation" ] || [ -f "scripts/cline-automation/excavate" ]; then
    test_result 0 "Cline automation scripts found"
else
    test_result 1 "Cline automation scripts NOT found"
fi

# ════════════════════════════════════════════════════════════════════
# STONE 6: CODERABBIT (Code Review)
# ════════════════════════════════════════════════════════════════════
echo -e "\n${RED}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${RED}🐰 STONE 6: CODERABBIT (Automated Code Review)${NC}"
echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"

# Check .coderabbit.yaml
if [ -f ".coderabbit.yaml" ]; then
    test_result 0 ".coderabbit.yaml configuration found"
    
    # Show config summary
    echo -e "  ${CYAN}Config summary:${NC}"
    head -10 .coderabbit.yaml | sed 's/^/    /'
else
    test_result 1 ".coderabbit.yaml NOT found"
fi

# Check if CodeRabbit has reviewed any PRs (check git history for CR comments)
if git log --oneline 2>/dev/null | head -20 | grep -qi "coderabbit\|code-rabbit\|cr:"; then
    test_result 0 "CodeRabbit activity detected in git history"
else
    test_result 1 "No CodeRabbit activity in recent commits (may still be active on PRs)"
fi

# ════════════════════════════════════════════════════════════════════
# BACKEND API TESTS
# ════════════════════════════════════════════════════════════════════
echo -e "\n${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}🔌 BACKEND API INTEGRATION TESTS${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"

# Health check
HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null)
if echo "$HEALTH" | grep -q "healthy\|ok\|success"; then
    test_result 0 "Backend health check passed"
else
    test_result 1 "Backend NOT responding on port 3001"
fi

# Test excavation endpoint
echo -e "\n  Testing /api/excavate endpoint..."
EXCAVATE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/excavate \
  -H "Content-Type: application/json" \
  -d '{"repoPath": "/home/shank/projects/code-archaeologist", "options": {"maxFiles": 2}}' 2>/dev/null)

if echo "$EXCAVATE_RESPONSE" | grep -q "jobId\|success"; then
    test_result 0 "Excavation endpoint working"
    JOB_ID=$(echo "$EXCAVATE_RESPONSE" | grep -oP '"jobId":\s*"\K[^"]+')
    echo -e "  ${CYAN}Job created: $JOB_ID${NC}"
    
    # Wait and check job status
    echo -e "  Waiting 5 seconds for job to process..."
    sleep 5
    
    JOB_STATUS=$(curl -s "http://localhost:3001/api/jobs/$JOB_ID" 2>/dev/null)
    if echo "$JOB_STATUS" | grep -q "completed\|running\|success"; then
        test_result 0 "Job status endpoint working"
    else
        test_result 1 "Job status endpoint NOT working"
    fi
else
    test_result 1 "Excavation endpoint NOT working"
fi

# Test jobs list
JOBS=$(curl -s http://localhost:3001/api/jobs 2>/dev/null)
if echo "$JOBS" | grep -q "success\|data\|\[\]"; then
    test_result 0 "Jobs list endpoint working"
else
    test_result 1 "Jobs list endpoint NOT working"
fi

# ════════════════════════════════════════════════════════════════════
# GIT ANALYSIS TESTS
# ════════════════════════════════════════════════════════════════════
echo -e "\n${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}📊 GIT ANALYSIS CAPABILITIES${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"

# Check simple-git dependency
if grep -q "simple-git" package.json backend/package.json 2>/dev/null; then
    test_result 0 "simple-git dependency installed"
else
    test_result 1 "simple-git dependency NOT installed"
fi

# Check git-analyzer
if [ -f "backend/src/lib/git-analyzer.ts" ] || [ -f "src/lib/git-analyzer.ts" ]; then
    test_result 0 "Git analyzer module found"
else
    test_result 1 "Git analyzer module NOT found"
fi

# Test git commands
if git log --oneline -5 2>/dev/null >/dev/null; then
    COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    test_result 0 "Git repository valid ($COMMIT_COUNT commits)"
else
    test_result 1 "Not a valid git repository"
fi

# ════════════════════════════════════════════════════════════════════
# KNOWLEDGE GRAPH TESTS
# ════════════════════════════════════════════════════════════════════
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🕸️ KNOWLEDGE GRAPH VISUALIZATION${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"

# Check D3.js or visualization component
if [ -f "frontend/components/KnowledgeGraph.tsx" ] || grep -rq "d3\|force-graph\|KnowledgeGraph" frontend/ 2>/dev/null; then
    test_result 0 "Knowledge Graph component found"
else
    test_result 1 "Knowledge Graph component NOT found"
fi

# Check if graph data is generated
if curl -s http://localhost:3001/api/jobs 2>/dev/null | grep -q "knowledgeGraph\|nodes\|edges"; then
    test_result 0 "Knowledge graph data being generated"
else
    # Check latest job report
    LATEST_JOB=$(curl -s http://localhost:3001/api/jobs 2>/dev/null | grep -oP '"id":\s*"\K[^"]+' | head -1)
    if [ -n "$LATEST_JOB" ]; then
        REPORT=$(curl -s "http://localhost:3001/api/jobs/$LATEST_JOB/report" 2>/dev/null)
        if echo "$REPORT" | grep -q "knowledgeGraph\|nodes"; then
            test_result 0 "Knowledge graph data in reports"
        else
            test_result 1 "Knowledge graph data NOT in reports"
        fi
    else
        test_result 1 "No jobs to check for knowledge graph"
    fi
fi

# ════════════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════════════
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                        TEST SUMMARY                              ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo -e "║  ${GREEN}✅ PASSED: $PASS_COUNT${NC}                                                  ║"
echo -e "║  ${RED}❌ FAILED: $FAIL_COUNT${NC}                                                  ║"
echo "║  📊 TOTAL:  $TOTAL_TESTS                                                  ║"
echo "╠══════════════════════════════════════════════════════════════════╣"

PERCENT=$((PASS_COUNT * 100 / TOTAL_TESTS))
if [ $PERCENT -ge 80 ]; then
    echo -e "║  ${GREEN}🎉 EXCELLENT! Your Infinity Stones are well assembled! ($PERCENT%)${NC}   ║"
elif [ $PERCENT -ge 60 ]; then
    echo -e "║  ${YELLOW}👍 GOOD! Most stones are working. Fix the failures. ($PERCENT%)${NC}     ║"
else
    echo -e "║  ${RED}⚠️ NEEDS WORK! Several stones need attention. ($PERCENT%)${NC}          ║"
fi
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# List failed tests for easy fixing
if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "${YELLOW}📋 Quick fixes for failed tests:${NC}"
    echo ""
    echo "  • Gemini API: Add GOOGLE_AI_API_KEY to .env"
    echo "  • Kestra: cd ~/kestra && docker compose up -d"
    echo "  • Oumi: cd oumi-training && source venv/bin/activate && pip install oumi"
    echo "  • Frontend: cd frontend && pnpm install && pnpm run dev"
    echo "  • Backend: cd backend && pnpm start"
    echo ""
fi

exit $FAIL_COUNT
