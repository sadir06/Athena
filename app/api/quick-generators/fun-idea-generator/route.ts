import { Groq } from 'groq-sdk';

export const runtime = 'edge';

// System prompt for concise MVP idea generation
const CONCISE_IDEA_SYSTEM_PROMPT = `You are Athena, the strategic AI idea generator. Generate concise, actionable, and MVP-sized business ideas.

Guidelines:
- The idea must fit in 2-3 sentences total.
- Focus on a single, simple, innovative concept that could be built as a first version (MVP).
- Avoid multi-part, overly detailed, or complex ideas.
- Make it practical, modern, and exciting, but keep it short and sweet.
- Do NOT use section headers or bullet points. Just a short, clear description.
- Example: "A web app that lets remote teams vote on lunch options in real time. Users create a poll, share a link, and see live results. Simple, fast, and fun for distributed teams."
`;

// Simple function to generate a random seed without relying on crypto
function generateRandomSeed(length = 12) {
    const characters = 'abcdef0123456789'; // Hexadecimal characters
    const timestamp = Date.now().toString();
    let result = '';

    // Use the current timestamp as part of the seed
    const timestampPart = timestamp.slice(-6);

    // Generate random characters for the rest of the seed
    for (let i = 0; i < length - timestampPart.length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }

    // Combine timestamp and random parts
    return result + timestampPart;
}

export async function GET() {
    console.log("🎲 Athena's Fun Idea Generator API route called - channeling strategic wisdom! 🏛️");

    try {
        // Generate random seed using our simple function
        const randomSeed = generateRandomSeed();
        console.log("🌱 Generated random seed for Athena:", randomSeed);

        // Get environment variables
        const { env } = process.env;
        console.log("🔑 Environment context retrieved");
        
        // Check if API key exists
        if (!env.GROQ_API_KEY) {
            console.error("❌ GROQ_API_KEY not found in environment");
            throw new Error("GROQ_API_KEY not configured");
        }
        
        console.log("🔑 GROQ_API_KEY found, initializing client");

        // Initialize Groq client with API key from environment
        const groq = new Groq({
            apiKey: env.GROQ_API_KEY
        });

        const prompt = `Generate a concise, MVP-sized business idea in 2-3 sentences. Keep it short, actionable, and avoid long lists or sections. seed ${randomSeed}`;
        console.log("💬 Sending concise MVP prompt to Groq:", prompt);

        // Create chat completion with Groq using llama-3.1-70b-versatile
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: CONCISE_IDEA_SYSTEM_PROMPT
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.8,
            max_tokens: 400,
            top_p: 0.9,
            stream: false
        });

        console.log("🤖 Groq API response received");
        
        const response = chatCompletion.choices[0]?.message?.content;
        
        if (!response) {
            console.error("❌ No content in Groq API response");
            throw new Error("Empty response from Groq API");
        }
        
        console.log("💡 Athena generated idea:", response);
        console.log("🤣 Athena's new ideas are so short, even a goldfish could remember them! 🐟");

        return new Response(JSON.stringify({
            idea: response.trim()
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('🚨 Error in Athena Fun Idea Generator API route:', error);
        console.error('🚨 Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        
        return new Response(JSON.stringify({
            error: 'Failed to generate idea',
            idea: `**CONCEPT:** Strategic SaaS Suite - A comprehensive platform that generates innovative business ideas using AI and strategic thinking principles.

**UNIQUE SELLING PROPOSITION:** Unlike generic idea generators, this platform combines market analysis, user experience design, and strategic planning to create fully-formed business concepts with clear implementation paths.

**SELLABILITY:** Target audience includes entrepreneurs, startups, and product managers seeking validated business opportunities. Revenue model includes freemium tier with premium features for detailed market analysis and implementation roadmaps.

**EXACT PAGE DESIGN:** Modern dark theme with gold accents, hero section featuring AI-generated idea preview, interactive idea builder with drag-and-drop components, real-time collaboration features, and integrated analytics dashboard showing market trends and competitor analysis.

**ASK USER:** What specific industry or market segment are you most passionate about disrupting?`
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}