import { Groq } from 'groq-sdk';
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { applyChangesToRepo, FileChange } from '@/lib/githubApplyChange';

export const runtime = 'edge';

const CODEGEN_SYSTEM_PROMPT = `You are Athena, the Code Generator Agent. You receive a change request for a Next.js frontend project and must generate the required code changes.

Your job is to:
1. Understand the change request
2. Generate the necessary code files
3. Output the changes in this exact format:

<page><path>path/to/file.ext</path><content>
// Your code here
</content></page>

<page><path>another/file.js</path><content>
// Another file's code
</content></page>

remove(path/to/delete/file.js)

Rules:
- Only generate frontend code (HTML, CSS, JavaScript, React components)
- Be concise and practical
- Use modern web standards
- Include proper HTML structure for HTML files
- Use semantic HTML and modern CSS
- For React components, use functional components with hooks
- Output ONLY the code changes, no explanations
- Use the exact format shown above
- IMPORTANT: File paths should NOT start with a slash (e.g., use "index.html" not "/index.html")
- If creating a new file, use <page> tags
- If deleting a file, use remove(path) format`;

async function callGroqLlama(messages: ChatCompletionMessageParam[], apiKey: string) {
  try {
    const groq = new Groq({ apiKey });
    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 4000,
      top_p: 0.95,
      stream: false
    });
    const content = chatCompletion.choices[0]?.message?.content || '';
    return content;
  } catch (error) {
    throw new Error(`Groq API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseFileChanges(llmOutput: string): FileChange[] {
  const changes: FileChange[] = [];
  
  // Parse <page><path>...</path><content>...</content></page>
  const pageRegex = /<page>\s*<path>(.*?)<\/path>\s*<content>([\s\S]*?)<\/content>\s*<\/page>/g;
  let match;
  while ((match = pageRegex.exec(llmOutput)) !== null) {
    let path = match[1].trim();
    const content = match[2].trim();
    
    // Remove leading slash if present (GitHub API requirement)
    if (path.startsWith('/')) {
      path = path.substring(1);
    }
    
    changes.push({ path, content });
  }
  
  // Parse remove(path)
  const removeRegex = /remove\((.*?)\)/g;
  let rmatch;
  while ((rmatch = removeRegex.exec(llmOutput)) !== null) {
    let path = rmatch[1].trim();
    
    // Remove leading slash if present (GitHub API requirement)
    if (path.startsWith('/')) {
      path = path.substring(1);
    }
    
    changes.push({ path, remove: true });
  }
  
  return changes;
}

export async function POST(request: Request) {
  try {
    console.log('[DEBUG] [UpdateProject] Endpoint hit');
    const body = (await request.json()) as { 
      repoId: string; 
      changeRequest: string; 
      projectContext?: string;
    };
    console.log('[DEBUG] [UpdateProject] Incoming payload:', body);
    const { repoId, changeRequest, projectContext = '' } = body;
    
    const apiKey = process.env.GROQ_API_KEY as string;
    const githubToken = process.env.GITHUB_SERVICE_ACCOUNT_PAT as string;
    
    if (!apiKey) throw new Error('Missing GROQ_API_KEY');
    if (!githubToken) throw new Error('Missing GITHUB_SERVICE_ACCOUNT_PAT');

    // Create the prompt for code generation
    const userPrompt = `Change Request: ${changeRequest}\n\n${projectContext ? `Project Context: ${projectContext}` : ''}\n\nRepository: ${repoId}\n\nPlease generate the necessary code files to implement this change request. Output only the file changes in the required format.`;

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: CODEGEN_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];
    
    try {
      console.log('[DEBUG] [UpdateProject] Calling LLM/codegen agent...');
      const result = await callGroqLlama(messages, apiKey);
      console.log('[DEBUG] [UpdateProject] LLM/codegen result:', result);
      
      if (!result || result.trim() === '') {
        console.log('[ERROR] [UpdateProject] Empty response from LLM');
        throw new Error('Empty response from LLM');
      }

      // Parse file changes from LLM output
      const changes = parseFileChanges(result);
      console.log('[DEBUG] [UpdateProject] Parsed file changes:', changes);
      
      if (!changes.length) {
        console.log('[ERROR] [UpdateProject] No file changes found in LLM output.');
        throw new Error('No file changes found in LLM output. Please try a more specific change request.');
      }

      // Apply changes to GitHub repo
      const repoUrl = `https://github.com/athena-service-account/${repoId}.git`;
      console.log('[DEBUG] [UpdateProject] Applying changes to repo:', repoUrl);
      try {
        const commitResult = await applyChangesToRepo({
          repoUrl,
          branch: 'main',
          changes,
          commitMessage: `Athena: ${changeRequest.substring(0, 50)}...`,
          githubToken
        });
        console.log('[SUCCESS] [UpdateProject] Changes committed to GitHub. Commit result:', commitResult);
      } catch (commitErr) {
        console.log('[ERROR] [UpdateProject] Failed to commit changes to GitHub:', commitErr);
        throw commitErr;
      }
      
      // Pull latest changes on EC2 server
      try {
        console.log('[DEBUG] [UpdateProject] Pulling latest changes on EC2 server...');
        const ec2Response = await fetch(`https://ec2.athenaai.lol/pull-changes/${repoId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (ec2Response.ok) {
          console.log('[SUCCESS] [UpdateProject] Successfully pulled changes on EC2 server');
        } else {
          console.log('[ERROR] [UpdateProject] Failed to pull changes on EC2 server');
        }
      } catch (error) {
        console.log('[ERROR] [UpdateProject] Error pulling changes on EC2 server:', error);
      }
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Changes applied successfully!',
        changes: changes.map(c => ({ path: c.path, action: c.remove ? 'deleted' : 'created/updated' }))
      }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
      
    } catch (llmError) {
      console.log('[ERROR] [UpdateProject] Code generation failed:', llmError);
      throw new Error(`Code generation failed: ${llmError instanceof Error ? llmError.message : 'Unknown error'}`);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process change request';
    console.log('[ERROR] [UpdateProject] Final error:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
} 