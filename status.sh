#!/bin/bash

echo ""
echo "🏛️ CODE ARCHAEOLOGIST - STATUS CHECK"
echo "====================================="
echo ""

# Backend
echo -n "🔌 Backend (3001): "
if curl -s http://localhost:3001/health 2>/dev/null | grep -q "ok\|healthy\|success"; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

# Frontend
echo -n "🎨 Frontend: "
for PORT in 3000 3002 3003; do
    if curl -s "http://localhost:$PORT" 2>/dev/null | grep -q -i "html\|doctype\|next"; then
        echo "✅ Running on $PORT"
        break
    fi
done 2>/dev/null || echo "❌ Not running"

# Kestra - Fixed check
echo -n "🟣 Kestra (8080): "
KESTRA_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/v1/flows 2>/dev/null)
if [ "$KESTRA_CHECK" = "200" ]; then
    echo "✅ Running (API accessible)"
elif [ "$KESTRA_CHECK" = "401" ]; then
    echo "⚠️ Running (needs auth)"
elif curl -s http://localhost:8080 2>/dev/null | grep -q -i "kestra\|html"; then
    echo "✅ Running (UI accessible)"
else
    echo "❌ Not running (HTTP: $KESTRA_CHECK)"
fi

# Oumi
echo -n "🟢 Oumi Model: "
if [ -f "oumi-training/output/archaeologist-model/adapter_model.safetensors" ]; then
    SIZE=$(du -h oumi-training/output/archaeologist-model/adapter_model.safetensors 2>/dev/null | cut -f1)
    echo "✅ Trained ($SIZE)"
else
    echo "❌ Not trained"
fi

# CodeRabbit
echo -n "🐰 CodeRabbit: "
if [ -f ".coderabbit.yaml" ]; then
    echo "✅ Configured"
else
    echo "❌ Not configured"
fi

# Cline
echo -n "🔮 Cline CLI: "
if [ -f "scripts/cline-automation/excavate" ]; then
    echo "✅ Ready"
else
    echo "⚠️ Not configured"
fi

echo ""
echo "====================================="
echo ""

# Summary
echo "📊 Quick Links:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:3001/health"
echo "   Kestra:    http://localhost:8080"
echo ""
