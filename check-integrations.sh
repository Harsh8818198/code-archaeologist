#!/bin/bash

echo "🔍 CODE ARCHAEOLOGIST - INTEGRATION AUDIT"
echo "========================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_integration() {
    local name=$1
    local check=$2
    if eval $check > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $name${NC}"
        return 0
    else
        echo -e "${RED}❌ $name${NC}"
        return 1
    fi
}

echo -e "\n📦 INFINITY STONES INTEGRATION:"
echo "-----------------------------------"

# 1. Cline
check_integration "Cline CLI" "which cline"
check_integration "Cline Automation Scripts" "test -f scripts/cline-automation/excavate"

# 2. Kestra
check_integration "Kestra Running" "curl -s http://localhost:8080/api/v1/ping"
check_integration "Kestra Flows Exist" "test -f ~/kestra/flows/excavation-workflow.yaml"
check_integration "Kestra Called from Backend" "grep -q 'kestra' backend/src/orchestration/kestra-client.ts"

# 3. Vercel (skipped per user request)
echo -e "${YELLOW}⊘ Vercel (Skipped - Local deployment)${NC}"

# 4. Oumi
check_integration "Oumi Installed" "test -d oumi-training/venv"
check_integration "Oumi Model Trained" "test -f oumi-training/output/archaeologist-model/adapter_model.safetensors"
OUMI_INTEGRATED=$(grep -q "oumi" backend/src/lib/oumi-client.ts 2>/dev/null && echo $?)
if [ "$OUMI_INTEGRATED" = "0" ]; then
    echo -e "${YELLOW}⚠️  Oumi Model (Trained but NOT integrated into backend)${NC}"
else
    echo -e "${RED}❌ Oumi Integration${NC}"
fi

# 5. Together AI (not using per requirements)
echo -e "${YELLOW}⊘ Together AI (Not used - using Gemini instead)${NC}"

# 6. CodeRabbit
check_integration "CodeRabbit Config" "test -f .coderabbit.yaml"
echo -e "${YELLOW}⚠️  CodeRabbit (Config exists, requires GitHub integration)${NC}"

echo -e "\n🔧 CORE COMPONENTS:"
echo "-----------------------------------"

# Backend
check_integration "Backend Running" "curl -s http://localhost:3001/health"
check_integration "Excavator Agent" "test -f backend/src/agents/excavator.ts"
check_integration "Gemini Client" "test -f backend/src/lib/gemini-client.ts"
check_integration "Git Analyzer" "test -f backend/src/lib/git-analyzer.ts"

# Frontend
check_integration "Frontend Running" "curl -s http://localhost:3000/api/health"
check_integration "Frontend API Routes" "test -f frontend/app/api/excavate/route.ts"
check_integration "Results Page" "test -f frontend/app/results/[jobId]/page.tsx"

# Database/Storage
check_integration "In-Memory Job Store" "grep -q 'jobs.set' backend/src/routes/excavate.ts"

echo -e "\n📈 FEATURES:"
echo "-----------------------------------"

# Check if features work
check_integration "Git History Analysis" "grep -q 'simpleGit' backend/src/agents/excavator.ts"
check_integration "AI Code Analysis (Gemini)" "grep -q 'analyzeCodeContext' backend/src/lib/gemini-client.ts"
check_integration "Knowledge Graph Generation" "grep -q 'knowledgeGraph' backend/src/agents/excavator.ts"
check_integration "Complexity Metrics" "grep -q 'calculateComplexity' backend/src/lib/utils.ts"

echo -e "\n🎯 MISSING INTEGRATIONS:"
echo "-----------------------------------"

MISSING=0

# Check what's missing
if ! grep -q "oumi" backend/src/agents/excavator.ts 2>/dev/null; then
    echo -e "${RED}❌ Oumi model not integrated into excavator${NC}"
    MISSING=$((MISSING+1))
fi

if ! grep -q "kestra" backend/src/routes/excavate.ts 2>/dev/null; then
    echo -e "${RED}❌ Kestra not triggered from API routes${NC}"
    MISSING=$((MISSING+1))
fi

if ! test -f frontend/app/api/kestra/route.ts 2>/dev/null; then
    echo -e "${RED}❌ No Kestra webhook endpoint in frontend${NC}"
    MISSING=$((MISSING+1))
fi

if [ $MISSING -eq 0 ]; then
    echo -e "${GREEN}✅ All core integrations complete!${NC}"
else
    echo -e "${YELLOW}Found $MISSING missing integrations to complete${NC}"
fi

echo -e "\n========================================"
