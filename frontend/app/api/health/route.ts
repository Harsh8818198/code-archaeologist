import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    status: 'healthy',
    message: 'Code Archaeologist API',
  });
}
