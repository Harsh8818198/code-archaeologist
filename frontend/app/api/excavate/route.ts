import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoUrl, repoPath, options } = body;

    // Forward request to backend
    const response = await fetch(`${BACKEND_URL}/api/excavate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repoUrl: repoUrl || repoPath,
        repoPath: repoPath || repoUrl,
        options: options || { maxFiles: 10 }
      }),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Excavate proxy error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'jobId required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/excavate/${jobId}`);
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
