#!/bin/bash

echo "🔧 FINAL INTEGRATION FIXES"
echo "=========================="

# Fix 1: Verify Oumi in excavator
echo -e "\n[1/3] Checking Oumi integration..."
if grep -q "oumi-client" backend/src/agents/excavator.ts; then
    echo "  ✅ Oumi already in excavator"
else
    echo "  Adding Oumi to excavator..."
    cd backend
    sed -i '/from "..\/lib\/utils.js";/a import { getOumiClient } from "../lib/oumi-client.js";' src/agents/excavator.ts
    sed -i '/private gemini: GeminiSynthesisEngine;/a \  private oumiClient = getOumiClient();' src/agents/excavator.ts
    echo "  ✅ Oumi added"
    npm run build
    cd ..
fi

# Fix 2: Verify Kestra trigger
echo -e "\n[2/3] Checking Kestra trigger..."
if test -f backend/src/routes/kestra-trigger.ts; then
    echo "  ✅ Kestra trigger module exists"
    
    # Add import to excavate.ts if missing
    if ! grep -q "kestra-trigger" backend/src/routes/excavate.ts; then
        echo "  Adding import to excavate route..."
        sed -i "1a import { triggerKestraWorkflow } from './kestra-trigger.js';" backend/src/routes/excavate.ts
        echo "  ✅ Import added"
    else
        echo "  ✅ Already imported"
    fi
else
    echo "  ❌ Kestra trigger module missing (created earlier but not found)"
fi

# Fix 3: Rebuild everything
echo -e "\n[3/3] Rebuilding..."
cd backend
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "  ✅ Backend rebuilt"
else
    echo "  ❌ Backend build failed"
    exit 1
fi

cd ../frontend
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "  ✅ Frontend rebuilt"
else
    echo "  ❌ Frontend build failed"
    exit 1
fi

cd ..

echo -e "\n=========================="
echo "✅ FIXES COMPLETE!"
echo "=========================="
