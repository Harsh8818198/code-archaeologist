#!/bin/bash

echo "🏛️ Code Archaeologist - Quick Start"
echo "===================================="

cd ~/projects/code-archaeologist

# Load environment
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

# Check Gemini key
if [ -z "$GOOGLE_AI_API_KEY" ]; then
    echo "⚠️  GOOGLE_AI_API_KEY not set in .env"
    echo "   Get your key at: https://aistudio.google.com/"
    exit 1
fi

echo "✅ Gemini API key found"

# Start Docker if needed
if command -v docker &> /dev/null; then
    sudo service docker start 2>/dev/null || true
    echo "✅ Docker service started"
fi

# Test Gemini connection
echo ""
echo "🧪 Testing Gemini connection..."
pnpm run test:gemini

echo ""
echo "===================================="
echo "Quick Start Complete!"
echo ""
echo "Next steps:"
echo "  1. Excavate current directory:"
echo "     pnpm run excavate ."
echo ""
echo "  2. Excavate a GitHub repo:"
echo "     git clone https://github.com/user/repo /tmp/repo"
echo "     pnpm run excavate /tmp/repo"
echo ""
echo "  3. Start Kestra orchestration:"
echo "     cd ~/kestra && docker compose up -d"
echo "     pnpm run orchestrate init"
echo ""
