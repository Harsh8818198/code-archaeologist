#!/bin/bash

echo "🧪 Code Archaeologist - Setup Test"
echo "=================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Prerequisites
echo "📦 Prerequisites:"

if command -v node &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} Node.js $(node --version)"
else
    echo -e "  ${RED}✗${NC} Node.js not installed"
fi

if command -v pnpm &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} pnpm $(pnpm --version)"
else
    echo -e "  ${RED}✗${NC} pnpm not installed"
fi

if command -v git &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} Git $(git --version | cut -d' ' -f3)"
else
    echo -e "  ${RED}✗${NC} Git not installed"
fi

# Environment
echo ""
echo "🔑 Environment:"

if [ -f .env ]; then
    echo -e "  ${GREEN}✓${NC} .env file exists"
    
    if grep -q "GOOGLE_AI_API_KEY=." .env && ! grep -q "GOOGLE_AI_API_KEY=$" .env && ! grep -q "GOOGLE_AI_API_KEY=your-" .env; then
        echo -e "  ${GREEN}✓${NC} Gemini API key configured"
    else
        echo -e "  ${YELLOW}⚠${NC} Gemini API key not set (edit .env)"
    fi
else
    echo -e "  ${RED}✗${NC} .env file not found"
fi

# Project files
echo ""
echo "📄 Core Files:"

for file in src/lib/gemini-client.ts src/agents/excavator.ts; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file missing"
    fi
done

# Dependencies
echo ""
echo "📦 Dependencies:"

if [ -d "node_modules" ]; then
    echo -e "  ${GREEN}✓${NC} node_modules installed"
else
    echo -e "  ${YELLOW}⚠${NC} Run: pnpm install"
fi

echo ""
echo "=================================="
echo "Next: Run 'pnpm run test:gemini' to test Gemini"
echo ""
