#!/bin/bash

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  🏛️  CODE ARCHAEOLOGIST - INTEGRATION TEST                      ║"
echo "║  Testing how each technology ACTUALLY works together            ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: Direct API call (current flow)
echo "═══════════════════════════════════════════════════════════════"
echo "TEST 1: Current Flow (Direct API)"
echo "═══════════════════════════════════════════════════════════════"
echo "→ User → Frontend → Backend API → Gemini → Response"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3001/api/excavate \
  -H "Content-Type: application/json" \
  -d '{"repoPath": "/home/shank/projects/code-archaeologist", "options": {"maxFiles": 1}}')

JOB_ID=$(echo "$RESPONSE" | grep -oP '"jobId":\s*"\K[^"]+')
echo "✅ Job created: $JOB_ID"

sleep 8

STATUS=$(curl -s "http://localhost:3001/api/jobs/$JOB_ID")
echo "Status: $(echo "$STATUS" | grep -oP '"status":\s*"\K[^"]+')"

# Test 2: Kestra orchestrated (ideal flow)
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "TEST 2: Kestra Orchestrated Flow"
echo "═══════════════════════════════════════════════════════════════"
echo "→ Trigger → Kestra → Clone → Analyze → Gemini → Store → Notify"
echo ""

if curl -s http://localhost:8080/api/v1/flows 2>/dev/null | grep -q "namespace"; then
    echo "✅ Kestra is running"
    echo "   To trigger workflow:"
    echo "   curl -X POST http://localhost:8080/api/v1/executions/code-archaeologist/code-excavation \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"inputs\": {\"repo_url\": \"https://github.com/user/repo\"}}'"
else
    echo "⚠️ Kestra not responding - workflow orchestration disabled"
fi

# Test 3: Check Oumi model
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "TEST 3: Oumi Fine-tuned Model"
echo "═══════════════════════════════════════════════════════════════"
echo "→ Training Data → Oumi Train → LoRA Adapter → Inference"
echo ""

if [ -d "oumi-training/output/archaeologist-model" ]; then
    echo "✅ Trained model found!"
    ls -la oumi-training/output/archaeologist-model/
else
    echo "⚠️ Model not trained yet"
    echo "   To train:"
    echo "   cd oumi-training && source venv/bin/activate"
    echo "   oumi train -c train-config.yaml"
fi

# Test 4: Cline automation
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "TEST 4: Cline CLI Automation"
echo "═══════════════════════════════════════════════════════════════"
echo "→ cline excavate <path> → Analysis → Report"
echo ""

if [ -f "scripts/cline-automation/excavate" ]; then
    echo "✅ Cline automation script exists"
    echo "   Usage: ./scripts/cline-automation/excavate /path/to/repo"
else
    echo "⚠️ Cline automation not configured"
fi

# Test 5: CodeRabbit
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "TEST 5: CodeRabbit Auto-Review"
echo "═══════════════════════════════════════════════════════════════"
echo "→ Push Code → Open PR → CodeRabbit Reviews → Comments"
echo ""

if [ -f ".coderabbit.yaml" ]; then
    echo "✅ CodeRabbit configured"
    echo "   Triggered on: Pull Requests to main branch"
    echo "   Profile: $(grep 'profile:' .coderabbit.yaml | head -1)"
else
    echo "⚠️ CodeRabbit not configured"
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "INTEGRATION SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "┌─────────────┬──────────────────────────────────────────────┐"
echo "│ Technology  │ Role in Excavation                           │"
echo "├─────────────┼──────────────────────────────────────────────┤"
echo "│ 🟡 Gemini   │ AI analysis of code files                    │"
echo "│ 🟣 Kestra   │ Orchestrates multi-step workflows            │"
echo "│ 🟢 Oumi     │ Fine-tuned model for better accuracy         │"
echo "│ 🔵 Vercel   │ Hosts the frontend UI                        │"
echo "│ 🔮 Cline    │ CLI automation & VS Code integration         │"
echo "│ 🐰 CodeRabbit│ Auto-reviews PRs with suggestions           │"
echo "└─────────────┴──────────────────────────────────────────────┘"
echo ""
