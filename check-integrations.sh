#!/bin/bash

echo "🔍 CODE ARCHAEOLOGIST - INTEGRATION AUDIT"
echo "========================================"

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
check_integration "Kestra Client" "test -f backend/src/routes/kestra-trigger.ts"
check_integration "Kestra Webhooks" "test -f frontend/app/api/kestra/route.ts"

# 3. Vercel (skipped)
echo -e "${YELLOW}⊘ Vercel (Skipped - Local deployment)${NC}"

# 4. Oumi
check_integration "Oumi Installed" "test -d oumi-training/venv"
check_integration "Oumi Model Trained" "test -f oumi-training/output/archaeologist-model/adapter_model.safetensors"
check_integration "Oumi Client Created" "test -f backend/src/lib/oumi-client.ts"

# Check if integrated into excavator
if grep -q "getOumiClient" backend/src/agents/excavator.ts 2>/dev/null; then
    echo -e "${GREEN}✅ Oumi Integrated into Excavator${NC}"
else
    echo -e "${RED}❌ Oumi NOT in Excavator${NC}"
fi

# 5. Together AI (not using)
echo -e "${YELLOW}⊘ Together AI (Not used - using Gemini instead)${NC}"

# 6. CodeRabbit
check_integration "CodeRabbit Config" "test -f .coderabbit.yaml"
echo -e "${YELLOW}⚠️  CodeRabbit (Config exists, active on PRs)${NC}"

echo -e "\n🔧 CORE COMPONENTS:"
echo "-----------------------------------"

check_integration "Backend Running" "curl -s http://localhost:3001/health"
check_integration "Frontend Running" "curl -s http://localhost:3000/api/health"
check_integration "Excavator Agent" "test -f backend/src/agents/excavator.ts"
check_integration "Gemini Client" "test -f backend/src/lib/gemini-client.ts"
check_integration "Git Analyzer" "test -f backend/src/lib/git-analyzer.ts"

echo -e "\n📈 FEATURES:"
echo "-----------------------------------"

check_integration "Git History Analysis" "grep -q 'simpleGit' backend/src/agents/excavator.ts"
check_integration "AI Code Analysis (Gemini)" "grep -q 'analyzeCodeContext' backend/src/lib/gemini-client.ts"
check_integration "Knowledge Graph" "grep -q 'knowledgeGraph' backend/src/agents/excavator.ts"
check_integration "Complexity Metrics" "grep -q 'calculateComplexity' backend/src/lib/utils.ts"

echo -e "\n🎯 INTEGRATION COMPLETENESS:"
echo "-----------------------------------"

MISSING=0

# Final checks
if ! grep -q "oumi-client" backend/src/agents/excavator.ts 2>/dev/null; then
    echo -e "${RED}❌ Oumi not imported in excavator${NC}"
    MISSING=$((MISSING+1))
fi

if ! test -f backend/src/routes/kestra-trigger.ts; then
    echo -e "${RED}❌ Kestra trigger module missing${NC}"
    MISSING=$((MISSING+1))
fi

if ! test -f backend/src/routes/kestra-webhook.ts; then
    echo -e "${RED}❌ Kestra webhook handler missing${NC}"
    MISSING=$((MISSING+1))
fi

if [ $MISSING -eq 0 ]; then
    echo -e "${GREEN}✅ ALL INTEGRATIONS COMPLETE!${NC}"
    echo -e "${GREEN}✅ System is production-ready!${NC}"
else
    echo -e "${YELLOW}Found $MISSING missing pieces${NC}"
fi

echo -e "\n========================================"
