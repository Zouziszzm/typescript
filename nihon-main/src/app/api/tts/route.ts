import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text');
  
  if (!text) {
    return new NextResponse('Missing text parameter', { status: 400 });
  }

  const url = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=ja&q=${encodeURIComponent(text)}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google TTS API responded with status: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000', // Cache aggressively to save bandwidth
      },
    });
  } catch (error) {
    console.error("TTS Proxy Error:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
