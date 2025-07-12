import { Groq } from 'groq-sdk';
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';

export const runtime = 'edge';

const CR_OVERVIEW_SYSTEM_PROMPT = `You are Athena, the Change Request Overview Generator Agent. Your job is to help users refine and clarify their change requests for a Next.js frontend project. Use quizzes and clarifying questions to ensure the change request is well-defined and actionable. Only generate frontend code (no backend). Output should be a quiz or a project overview for the change request. Use a friendly, strategic, and modern tone.`;

async function callGroqLlama(messages: ChatCompletionMessageParam[], apiKey: string) {
  const groq = new Groq({ apiKey });
  const chatCompletion = await groq.chat.completions.create({
    messages,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.9,
    max_tokens: 4000,
    top_p: 0.95,
    stream: false
  });
  return chatCompletion.choices[0]?.message?.content || '';
}

export async function POST(request: Request) {
  console.log('🟥 Change Request Overview Generator API called! Time to get strategic with Llama (Groq)!');
  try {
    const body = (await request.json()) as { projectData: string; changeRequest: string; history?: { role: string; content: string }[] };
    console.log('[DEBUG] Incoming request body:', body);
    const { projectData, changeRequest, history } = body;
    const apiKey = process.env.GROQ_API_KEY as string;
    console.log('[DEBUG] GROQ_API_KEY present:', !!apiKey);
    if (!apiKey) throw new Error('Missing GROQ API key');

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: CR_OVERVIEW_SYSTEM_PROMPT },
      ...(Array.isArray(history)
        ? history.map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content }) as ChatCompletionMessageParam)
        : []),
      { role: 'user', content: `Project Data: ${projectData}\nChange Request: ${changeRequest}` },
    ];
    console.log('💬 Sending messages to Llama (Groq):', messages.map(m => m.role).join(','));
    const result = await callGroqLlama(messages, apiKey);
    console.log('🤖 Llama (Groq) response:', result.substring(0, 200));
    return new Response(JSON.stringify({ text: result }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('🚨 Error in CR Overview Generator:', error);
    // Return the error message in the response for easier debugging (in development)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
} 