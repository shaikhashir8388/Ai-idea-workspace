import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    status: 'success',
    note: 'If you see this, your API routes are working correctly'
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({
      message: 'POST request received',
      data: body,
      timestamp: new Date().toISOString(),
      status: 'success'
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Invalid JSON',
      status: 'error'
    }, { status: 400 });
  }
}
