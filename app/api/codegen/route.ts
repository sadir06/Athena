import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'edge';

const SYSTEM_PROMPT = `You are Athena, the Codegen Agent. Given a change request overview and all files from a Next.js GitHub repo, generate the necessary code changes. Output each new or updated file as:
<file><path>app/new-page/page.tsx</path>
[code here]
</file>
To delete a file, output: remove(app/new-page/page.tsx)
If the output is too long, use a <continue> tag and wait for the next user message to continue.`;

const BufferPolyfill = typeof Buffer !== 'undefined' ? Buffer : require('buffer').Buffer;

async function fetchAllFilesFromGitHub(projectId: string, githubToken: string): Promise<{path: string, content: string}[]> {
  // Assume repo is athena-service-account/{projectId}
  const owner = 'athena-service-account';
  const repo = projectId;
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, {
    headers: { 'Authorization': `token ${githubToken}` }
  });
  if (!treeRes.ok) throw new Error('Failed to fetch repo tree');
  const treeJson = await treeRes.json();
  if (!treeJson || typeof treeJson !== 'object' || !Array.isArray((treeJson as any).tree)) throw new Error('Malformed tree response');
  const files = (treeJson as any).tree.filter((item: any) => item.type === 'blob');
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
  try {
    const body = await request.json();
    const overview = typeof body === 'object' && body && 'overview' in body ? body.overview : '';
    const projectId = typeof body === 'object' && body && 'projectId' in body ? body.projectId : '';
    const githubToken = process.env.GITHUB_SERVICE_ACCOUNT_PAT || (process.env.GITHUB_SERVICE_ACCOUNT_PAT as string);
    if (!githubToken) throw new Error('Missing GitHub token');
    const files = await fetchAllFilesFromGitHub(projectId, githubToken);
    const context = files.map(f => `File: ${f.path}\n${f.content}`).join('\n---\n');
    const prompt = `${SYSTEM_PROMPT}\n\nGitHub Files:\n${context}\n\nChange Request Overview:\n${overview}`;
    // Call Gemini 2.0 Flash (or Claude)
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || result.response.text || '';
    return new Response(JSON.stringify({ codegen: typeof text === 'string' ? text : '' }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
} 