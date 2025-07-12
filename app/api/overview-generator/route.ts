import { getRequestContext } from '@cloudflare/next-on-pages';
import { Groq } from 'groq-sdk';
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { OVERVIEW_SYSTEM_PROMPT, OVERVIEW_TRAINING_HISTORY } from '@/lib/prompt';

export const runtime = 'edge';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    tags?: Record<string, string[]>;
}

export async function POST(request: Request) {
    console.log("🎬 Athena Overview Generator API activated - channeling strategic wisdom! 🏛️");
    
    try {
        const { input, history } = await request.json() as {
            input: string,
            history: ChatMessage[]
        };
        
        console.log("📜 Received input:", input.substring(0, 100) + "...");
        console.log("📚 Received history length:", history.length);

        // Get environment variables
        const { env } = getRequestContext();
        
        if (!env.GROQ_API_KEY) {
            console.error("❌ GROQ_API_KEY not found in environment");
            throw new Error("GROQ_API_KEY not configured");
        }

        // Initialize Groq client
        const groq = new Groq({
            apiKey: env.GROQ_API_KEY
        });

        // Convert history to Groq format and combine with training history
        const conversationHistory = [
            // Add system message
            {
                role: "system" as const,
                content: OVERVIEW_SYSTEM_PROMPT
            },
            // Add training history
            ...OVERVIEW_TRAINING_HISTORY.map(msg => ({
                role: msg.role === "model" ? "assistant" as const : msg.role,
                content: msg.parts[0].text
            })),
            // Add user conversation history
            ...history.map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            // Add current input
            {
                role: "user" as const,
                content: input
            }
        ];

        console.log("💬 Sending conversation to Groq with", conversationHistory.length, "messages");

        // Create chat completion
        const chatCompletion = await groq.chat.completions.create({
            messages: conversationHistory as ChatCompletionMessageParam[],
            // model: "llama-3.1-8b-instant",
            model: "llama-3.3-70b-versatile", 	// 131,072 context // 32,768 max completion
            temperature: 0.9,
            max_tokens: 4000,
            top_p: 0.95,
            stream: false
        });

        console.log("🤖 Groq API response received");
        
        const response = chatCompletion.choices[0]?.message?.content;
        
        if (!response) {
            console.error("❌ No content in Groq API response");
            throw new Error("Empty response from Groq API");
        }

        console.log("🔍 Raw response length:", response.length);

        // Extract tags from response
        const tagContent = extractTags(response);
        console.log("📦 Extracted tags:", Object.entries(tagContent).map(([k, v]) => `${k}: ${v.length}`).join(', '));

        return new Response(JSON.stringify({
            text: response,
            tags: tagContent
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('🚨 Error in Athena Overview Generator API:', error);
        console.error('🚨 Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        
        return new Response(JSON.stringify({
            error: 'Failed to generate overview',
            text: "I apologize, but I'm having trouble generating your project overview right now. Please try again with your project idea, and I'll help you create a comprehensive plan with the wisdom of Athena! 🏛️"
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

function extractTags(text: string) {
    const tags: Record<string, string[]> = {
        reasoning: [],
        analysis: [],
        quiz: [],
        projectoverview: [],
        project: [],
        stack: []
    };

    console.log("🔍 Starting tag extraction from response");

    // Use regex for more reliable tag extraction
    const tagRegex = /<(analysis|reasoning|quiz|project|stack)>([\s\S]*?)<\/\1>/g;
    let match;

    while ((match = tagRegex.exec(text)) !== null) {
        const tagName = match[1];
        const content = match[2].trim();

        console.log(`📌 Found <${tagName}> tag with ${content.length} characters`);

        // Add the content to the appropriate tag array
        tags[tagName].push(content);

        // If this is a project tag, also add to projectoverview for compatibility
        if (tagName === 'project') {
            tags.projectoverview.push(content);
            console.log("📋 Added project content to projectoverview for compatibility");

            // Extract stack tags from project content
            const stackRegex = /<stack>([\s\S]*?)<\/stack>/g;
            let stackMatch;

            while ((stackMatch = stackRegex.exec(content)) !== null) {
                tags.stack.push(stackMatch[1].trim());
                console.log(`🧩 Extracted stack tag: ${stackMatch[1].trim()}`);
            }
        }
    }

    console.log("📦 Final extracted tags:", Object.entries(tags).map(([k, v]) => 
        `${k}: ${v.length} items`).join(', '));

    return tags;
} 