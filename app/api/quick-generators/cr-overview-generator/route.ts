import { GoogleGenerativeAI } from "@google/generative-ai";
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

const CR_OVERVIEW_SYSTEM_PROMPT = `You are Athena, the Change Request Overview Agent. Your job is to analyze the user's change request for a Next.js project, review all files in the provided GitHub repository, and output a <change-request-overview> tag summarizing the actionable changes needed. Ask clarifying questions if the request is vague. Use a strategic, modern, and friendly tone.`;

const BufferPolyfill = typeof Buffer !== 'undefined' ? Buffer : require('buffer').Buffer;

async function fetchAllFilesFromGitHub(repoUrl: string, githubToken: string): Promise<{path: string, content: string}[]> {
  const match = typeof repoUrl === 'string' && repoUrl.match(/github.com\/(.+?)\/(.+?)(?:$|\/)/);
  if (!match) throw new Error('Invalid GitHub repo URL');
  const owner = match[1];
  const repo = match[2];
  // Get file tree
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, {
    headers: { 'Authorization': `token ${githubToken}` }
  });
  if (!treeRes.ok) throw new Error('Failed to fetch repo tree');
  const treeJson = await treeRes.json();
  if (!treeJson || typeof treeJson !== 'object' || !Array.isArray((treeJson as any).tree)) throw new Error('Malformed tree response');
  const files = (treeJson as any).tree.filter((item: any) => item.type === 'blob');
  // Fetch file contents
  const fileContents = await Promise.all(files.map(async (file: any) => {
    const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`, {
      headers: { 'Authorization': `token ${githubToken}` }
    });
    if (!fileRes.ok) return null;
    const fileData = await fileRes.json();
    if (!fileData || typeof fileData !== 'object' || typeof (fileData as any).content !== 'string') return null;
    const contentBase64 = (fileData as any).content;
    const content = contentBase64 ? BufferPolyfill.from(String(contentBase64), 'base64').toString('utf-8') : '';
    return { path: file.path, content };
  }));
  return fileContents.filter(Boolean) as {path: string, content: string}[];
}

export async function POST(request: Request) {
  console.log('🟥 Change Request Overview Generator API called! Time to get strategic with Gemini!');
  try {
    const body = (await request.json()) as { githubRepoUrl: string; changeRequest: string };
    console.log('[DEBUG] Incoming request body:', body);
    const { githubRepoUrl, changeRequest } = body;
    const { env } = getRequestContext();
    const githubToken = env.GITHUB_SERVICE_ACCOUNT_PAT as string;
    const geminiKey = env.GOOGLE_GEMINI_API_KEY as string;
    if (!githubToken) throw new Error('Missing GitHub token');
    if (!geminiKey) throw new Error('Missing Gemini API key');
    const files = await fetchAllFilesFromGitHub(githubRepoUrl, githubToken);
    const context = files.map(f => `File: ${f.path}\n${f.content}`).join('\n---\n');
    const prompt = `${CR_OVERVIEW_SYSTEM_PROMPT}\n\nGitHub Files:\n${context}\n\nUser Change Request:\n${changeRequest}`;
    // Call Gemini 2.0 Flash
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || result.response.text || '';
    let overview = '';
    if (typeof text === 'string') {
      const match = text.match(/<change-request-overview>[\s\S]*?<\/change-request-overview>/);
      overview = match ? match[0] : text;
    } else {
      overview = '';
    }
    return new Response(JSON.stringify({ overview }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('🚨 Error in CR Overview Generator:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
} 