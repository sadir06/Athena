import Groq from 'groq-sdk';
import { getRequestContext } from '@cloudflare/next-on-pages';

interface RepoChatRequest {
    message: string;
    repoData: any;
    conversationHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
}

interface RepoChatResponse {
    response: string;
}

export const runtime = 'edge';

export async function POST(request: Request) {
    console.log("💬 Repository Chat API activated - let's have a codebase conversation!");
    const { env } = getRequestContext();
    
    const groq = new Groq({
        apiKey: env.GROQ_API_KEY
    });

    try {
        const body = await request.json() as RepoChatRequest;
        console.log("📝 Received chat message:", body.message.substring(0, 50) + "...");
        
        // Validate request
        if (!body.message?.trim()) {
            console.log("❌ No message provided");
            return new Response(JSON.stringify({
                error: 'Missing required field: message is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!body.repoData) {
            console.log("❌ No repository data provided");
            return new Response(JSON.stringify({
                error: 'Repository data is required for chat functionality'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Create conversation context
        const conversationContext = createConversationContext(body.repoData, body.conversationHistory);
        console.log("🤖 Preparing chat context with repository knowledge...");

        // Use GROQ to generate response
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an expert software developer and codebase analyst. You have deep knowledge of the repository that was just analyzed. Your role is to help users understand the codebase, answer questions about the tech stack, architecture, setup process, and any other aspects of the project.

Key guidelines:
- Be helpful, accurate, and concise
- Use the repository analysis data to provide informed answers
- If you don't know something specific, say so rather than guessing
- Provide practical, actionable advice
- Use a friendly, conversational tone
- Include relevant technical details when appropriate
- Suggest next steps or related topics when helpful

Repository Analysis Summary:
${JSON.stringify(body.repoData, null, 2)}

Remember: You have access to the complete repository analysis, so you can reference specific details about the tech stack, architecture, file structure, and setup instructions.`
                },
                ...body.conversationHistory.slice(-10).map(msg => ({
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content
                })),
                {
                    role: "user",
                    content: body.message
                }
            ],
            model: "llama3-8b-8192",
            temperature: 0.7,
            max_tokens: 2048,
            top_p: 1,
            stream: false
        });

        const response = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try asking your question again.';
        console.log("✨ Chat response generated successfully!");

        return new Response(JSON.stringify({
            success: true,
            response
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('🚨 Error in Repository Chat API:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to process chat message',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

function createConversationContext(repoData: any, conversationHistory: Array<{role: string, content: string}>) {
    // Create a summary of the conversation context
    const context = {
        repository: {
            summary: repoData.summary,
            techStack: repoData.techStack,
            architecture: repoData.architecture,
            fileStructure: repoData.fileStructure,
            setupInstructions: repoData.setupInstructions,
            developmentWorkflow: repoData.developmentWorkflow
        },
        conversationLength: conversationHistory.length,
        recentMessages: conversationHistory.slice(-5) // Last 5 messages for context
    };

    return context;
} 