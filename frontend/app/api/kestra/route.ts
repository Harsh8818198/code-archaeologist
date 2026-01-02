import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📥 Kestra webhook:', body.executionId);

    // Forward to backend
    await fetch(`${BACKEND_URL}/api/kestra/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Kestra Webhook Endpoint',
    status: 'ready' 
  });
}
