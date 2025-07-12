import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai'; // Replace with llama/groq client import if applicable
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

    // TODO: Replace OpenAI with llama/groq AI call for code generation
    // For now, placeholder code generation logic
    // Example: call AI to generate code files based on finalPrompt

    // Mock generated files
    const generatedFiles = [
      {
        path: 'src/generatedFeature.ts',
        content: `// Generated code based on prompt: ${finalPrompt}\n\nexport function generatedFeature() {\n  console.log('Feature generated');\n}\n`
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
