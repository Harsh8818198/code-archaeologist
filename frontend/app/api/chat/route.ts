import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { message, context } = await request.json();
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = context 
      ? `Context:\n${context}\n\nQuestion: ${message}`
      : message;
    
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    return NextResponse.json({
      success: true,
      data: { response },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
