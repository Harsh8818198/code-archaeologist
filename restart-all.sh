#!/bin/bash

echo "🔄 RESTARTING CODE ARCHAEOLOGIST"
echo "================================"

# Stop all services
echo -e "\n[1/4] Stopping all services..."
pkill -f "node.*dist/server.js" 2>/dev/null && echo "  ✅ Backend stopped"
pkill -f "next dev" 2>/dev/null && echo "  ✅ Frontend stopped"
pkill -f "tsx.*server.ts" 2>/dev/null && echo "  ✅ Dev servers stopped"

sleep 2

# Start backend
echo -e "\n[2/4] Starting Backend (port 3001)..."
cd backend
npm start > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"
sleep 3

# Check backend
if curl -s http://localhost:3001/health > /dev/null; then
    echo "  ✅ Backend running"
else
    echo "  ❌ Backend failed to start"
    tail -20 /tmp/backend.log
    exit 1
fi

# Start frontend
echo -e "\n[3/4] Starting Frontend (port 3000)..."
cd ../frontend
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"
sleep 5

# Check frontend
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "  ✅ Frontend running"
else
    echo "  ❌ Frontend failed to start"
    tail -20 /tmp/frontend.log
    exit 1
fi

cd ..

# Verify integrations
echo -e "\n[4/4] Verifying Integrations..."

# Check Oumi
if grep -q "Oumi model available" /tmp/backend.log 2>/dev/null; then
    echo "  ✅ Oumi model detected"
elif grep -q "Oumi model not found" /tmp/backend.log 2>/dev/null; then
    echo "  ⚠️  Oumi model not found (will use Gemini)"
fi

# Check Kestra
if curl -s http://localhost:8080/api/v1/ping > /dev/null; then
    echo "  ✅ Kestra running"
else
    echo "  ⚠️  Kestra not running (optional)"
fi

echo -e "\n================================"
echo "✅ ALL SERVICES RUNNING!"
echo "================================"
echo ""
echo "🌐 Frontend:  http://localhost:3000"
echo "🔧 Backend:   http://localhost:3001"
echo "📊 Kestra:    http://localhost:8080"
echo ""
echo "📝 Logs:"
echo "  Backend:  tail -f /tmp/backend.log"
echo "  Frontend: tail -f /tmp/frontend.log"
echo ""
echo "🛑 Stop all: pkill -f 'node.*dist/server.js' && pkill -f 'next dev'"
