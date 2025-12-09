#!/bin/bash

echo "🧪 Day 2 Integration Tests"
echo "=========================="
echo ""

cd ~/projects/code-archaeologist

# Test 1: Utils
echo "📝 Test 1: Checking utils..."
if [ -f "src/lib/utils.ts" ]; then
    echo "   ✓ utils.ts exists"
else
    echo "   ✗ utils.ts missing"
fi

# Test 2: Excavator
echo "📝 Test 2: Testing excavator (no AI)..."
timeout 30 pnpm run excavate . --skip-ai --max-files=2 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✓ Excavator works"
else
    echo "   ✗ Excavator failed"
fi

# Test 3: Check report
echo "📝 Test 3: Checking report..."
if [ -f "archaeological-report.json" ]; then
    echo "   ✓ Report generated"
    FILES=$(cat archaeological-report.json | grep -c '"path"')
    echo "   ✓ Analyzed files: $FILES"
else
    echo "   ✗ Report not found"
fi

# Test 4: API server
echo "📝 Test 4: Testing API..."
pnpm run start &
SERVER_PID=$!
sleep 3

HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null)
if echo "$HEALTH" | grep -q "healthy"; then
    echo "   ✓ API server works"
else
    echo "   ✗ API server failed"
fi

kill $SERVER_PID 2>/dev/null

echo ""
echo "=========================="
echo "Day 2 Tests Complete!"
echo ""
