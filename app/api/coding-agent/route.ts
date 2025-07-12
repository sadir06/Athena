import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { applyChangesToRepo } from '../../lib/githubApplyChange';

interface RequestBody {
  repoId: string;
  finalPrompt: string;
  githubToken: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RequestBody;
    const { repoId, finalPrompt, githubToken } = body;

    // Use Groq for code generation if GROQ_API_KEY is set
    let generatedFiles = [];
    const groqApiKey = process.env.GROQ_API_KEY;
    const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;
    let codegenContent: string = '';

    if (groqApiKey) {
      const groq = new Groq({ apiKey: groqApiKey });
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a code generation agent. Generate TypeScript code for the following prompt.' },
          { role: 'user', content: finalPrompt }
        ],
        model: 'llama3-8b-8192',
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 1,
        stream: false
      });
      codegenContent = chatCompletion.choices[0]?.message?.content || '';
      if (typeof codegenContent !== 'string') codegenContent = '';
    } else if (geminiApiKey) {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(finalPrompt);
      let geminiText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || result.response.text || '';
      codegenContent = typeof geminiText === 'string' ? geminiText : '';
    } else {
      codegenContent = '// No LLM API key configured. Please set GROQ_API_KEY or GOOGLE_GEMINI_API_KEY.';
    }

    generatedFiles = [
      {
        path: 'src/generatedFeature.ts',
        content: `// Generated code based on prompt: ${finalPrompt}\n${codegenContent as string}`
      }
    ];

    // Construct repo URL from repoId
    const repoUrl = `https://github.com/athena-service-account/${repoId}`;

    // Apply changes to repo using existing function
    await applyChangesToRepo({
      repoUrl,
      changes: generatedFiles,
      commitMessage: `Add generated feature based on prompt`,
      githubToken
    });

    return NextResponse.json({ success: true, message: 'Code generated and committed successfully', changes: generatedFiles });
  } catch (error) {
    console.error('Error in coding agent:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Unknown error' }, { status: 500 });
  }
}
