import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  console.log("🎤 Speech-to-text API called - time to decode some wisdom! 🦉");

  try {
    const body = await request.json() as { audioData: string };
    const { audioData } = body;

    if (!audioData) {
      console.log("❌ No audio data provided - silence is golden but not helpful here!");
      return NextResponse.json({ error: 'No audio data provided' }, { status: 400 });
    }



    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');

    console.log("🔊 Audio buffer created, size:", audioBuffer.length, "bytes - that's some serious vocal power!");

    // Call Groq API for transcription
    console.log("🔑 Using GROQ API key:", process.env.GROQ_API_KEY ? "Found" : "Missing");

    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-large-v3');

    const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: formData,
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("❌ Groq API error:", errorText);
      console.error("❌ Status:", groqResponse.status);
      return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
    }

    const transcriptionData = await groqResponse.json() as { text: string };
    const transcribedText = transcriptionData.text;

    console.log("🎯 Transcription successful:", transcribedText.substring(0, 50) + "... - Athena's ears are working perfectly!");

    return NextResponse.json({
      text: transcribedText,
      success: true
    });

  } catch (error) {
    console.error("💥 Speech-to-text error:", error);
    return NextResponse.json({
      error: 'Failed to transcribe audio',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}