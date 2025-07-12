import Groq from 'groq-sdk';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { Octokit } from '@octokit/rest';

interface RepositoryAnalysisRequest {
    repoUrl: string;
}

interface RepositoryAnalysisResponse {
    analysis: {
        summary: string;
        techStack: {
            frontend: string[];
            backend: string[];
            database: string[];
            tools: string[];
        };
        architecture: {
            overview: string;
            keyComponents: string[];
            dataFlow: string;
        };
        fileStructure: {
            overview: string;
            keyFiles: Array<{
                path: string;
                purpose: string;
                importance: 'high' | 'medium' | 'low';
            }>;
        };
        setupInstructions: string[];
        developmentWorkflow: string;
    };
}

export const runtime = 'edge';

export async function POST(request: Request) {
    console.log("🔍 Repository Analysis API activated - time to decode this codebase!");
    const { env } = getRequestContext();
    
    const groq = new Groq({
        apiKey: env.GROQ_API_KEY
    });

    const octokit = new Octokit({
        auth: env.GITHUB_SERVICE_ACCOUNT_PAT
    });

    try {
        const body = await request.json() as RepositoryAnalysisRequest;
        console.log("📝 Received repository URL:", body.repoUrl);
        
        // Validate request
        if (!body.repoUrl?.trim()) {
            console.log("❌ No repository URL provided");
            return new Response(JSON.stringify({
                error: 'Missing required field: repoUrl is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Extract owner and repo from GitHub URL
        const urlMatch = body.repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!urlMatch) {
            console.log("❌ Invalid GitHub URL format");
            return new Response(JSON.stringify({
                error: 'Invalid GitHub repository URL format'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const [, owner, repo] = urlMatch;
        console.log("🔍 Analyzing repository:", `${owner}/${repo}`);

        // Get repository information
        const repoInfo = await octokit.repos.get({
            owner,
            repo
        });

        console.log("📊 Repository info retrieved - now let's dive into the files!");

        // Get repository contents (recursive)
        const contents = await octokit.repos.getContent({
            owner,
            repo,
            path: '',
            ref: repoInfo.data.default_branch
        });

        // Collect all files recursively
        const allFiles = await collectAllFiles(octokit, owner, repo, Array.isArray(contents.data) ? contents.data : [contents.data]);
        console.log("📁 Found", allFiles.length, "files in repository");

        // Read important files
        const importantFiles = await readImportantFiles(octokit, owner, repo, allFiles);
        console.log("📖 Read", Object.keys(importantFiles).length, "important files");

        // Create comprehensive prompt for analysis
        const analysisPrompt = createAnalysisPrompt(repoInfo.data, importantFiles);
        console.log("🤖 Sending analysis prompt to GROQ...");

        // Use GROQ to analyze the repository
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an expert software architect and codebase analyst. Your job is to analyze GitHub repositories and provide comprehensive insights about their structure, tech stack, architecture, and development workflow. 

IMPORTANT: You must respond with ONLY valid JSON in the exact format specified. Do not include any markdown formatting, explanations, or additional text outside the JSON structure. The response must be parseable JSON.`
                },
                {
                    role: "user",
                    content: analysisPrompt
                }
            ],
            model: "llama3-8b-8192",
            temperature: 0.1,
            max_tokens: 4096,
            top_p: 1,
            stream: false
        });

        const analysisText = completion.choices[0]?.message?.content || '';
        console.log("✨ GROQ analysis complete - parsing results...");

        // Parse the AI response into structured format
        const analysis = parseAnalysisResponse(analysisText);
        
        console.log("🎉 Repository analysis completed successfully!");

        return new Response(JSON.stringify({
            success: true,
            analysis
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('🚨 Error in Repository Analysis API:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to analyze repository',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function collectAllFiles(octokit: Octokit, owner: string, repo: string, contents: any[]): Promise<any[]> {
    const allFiles: any[] = [];
    
    for (const item of contents) {
        if (item.type === 'file') {
            allFiles.push(item);
        } else if (item.type === 'dir') {
            try {
                const subContents = await octokit.repos.getContent({
                    owner,
                    repo,
                    path: item.path
                });
                const subFiles = await collectAllFiles(octokit, owner, repo, Array.isArray(subContents.data) ? subContents.data : [subContents.data]);
                allFiles.push(...subFiles);
            } catch (error) {
                console.log("⚠️ Could not read directory:", item.path);
            }
        }
    }
    
    return allFiles;
}

async function readImportantFiles(octokit: Octokit, owner: string, repo: string, files: any[]): Promise<Record<string, string>> {
    const importantFilePatterns = [
        /package\.json$/,
        /package-lock\.json$/,
        /yarn\.lock$/,
        /pnpm-lock\.yaml$/,
        /requirements\.txt$/,
        /Pipfile$/,
        /poetry\.lock$/,
        /Cargo\.toml$/,
        /go\.mod$/,
        /composer\.json$/,
        /Gemfile$/,
        /Dockerfile$/,
        /docker-compose\.yml$/,
        /docker-compose\.yaml$/,
        /\.env\.example$/,
        /README\.md$/,
        /README\.txt$/,
        /\.gitignore$/,
        /tsconfig\.json$/,
        /next\.config\.(js|ts|mjs)$/,
        /vite\.config\.(js|ts)$/,
        /webpack\.config\.(js|ts)$/,
        /tailwind\.config\.(js|ts)$/,
        /\.eslintrc/,
        /\.prettierrc/,
        /jest\.config\.(js|ts)$/,
        /cypress\.config\.(js|ts)$/,
        /\.github\/workflows\/.*\.yml$/,
        /app\.(js|ts|jsx|tsx)$/,
        /index\.(js|ts|jsx|tsx)$/,
        /main\.(js|ts|jsx|tsx)$/,
        /server\.(js|ts)$/,
        /client\.(js|ts|jsx|tsx)$/,
        /wrangler\.toml$/,
        /wrangler\.jsonc$/,
        /vercel\.json$/,
        /netlify\.toml$/,
        /\.env$/,
        /\.env\.local$/,
        /\.env\.development$/,
        /\.env\.production$/
    ];

    const importantFiles: Record<string, string> = {};
    
    for (const file of files) {
        const isImportant = importantFilePatterns.some(pattern => pattern.test(file.path));
        if (isImportant && file.size < 100000) { // Skip files larger than 100KB
            try {
                const response = await octokit.repos.getContent({
                    owner,
                    repo,
                    path: file.path
                });
                
                if ('content' in response.data) {
                    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
                    importantFiles[file.path] = content;
                }
            } catch (error) {
                console.log("⚠️ Could not read file:", file.path);
            }
        }
    }
    
    return importantFiles;
}

function createAnalysisPrompt(repoInfo: any, importantFiles: Record<string, string>): string {
    const filesContent = Object.entries(importantFiles)
        .map(([path, content]) => `\n--- ${path} ---\n${content}`)
        .join('\n');

    return `
Please analyze this GitHub repository and provide a comprehensive breakdown:

REPOSITORY INFORMATION:
- Name: ${repoInfo.name}
- Description: ${repoInfo.description || 'No description provided'}
- Language: ${repoInfo.language || 'Unknown'}
- Stars: ${repoInfo.stargazers_count}
- Forks: ${repoInfo.forks_count}
- Created: ${repoInfo.created_at}
- Last Updated: ${repoInfo.updated_at}
- Default Branch: ${repoInfo.default_branch}

IMPORTANT FILES CONTENT:
${filesContent}

Please provide a detailed analysis in the following EXACT JSON format (no markdown, no additional text, just pure JSON):

{
  "summary": "A comprehensive overview of what this application does, its main purpose, and key features",
  "techStack": {
    "frontend": ["list of frontend technologies and frameworks"],
    "backend": ["list of backend technologies and frameworks"],
    "database": ["list of databases and data storage solutions"],
    "tools": ["list of development tools, build tools, deployment tools, etc."]
  },
  "architecture": {
    "overview": "High-level architecture description",
    "keyComponents": ["list of main architectural components"],
    "dataFlow": "Description of how data flows through the application"
  },
  "fileStructure": {
    "overview": "Description of the overall file organization",
    "keyFiles": [
      {
        "path": "file path",
        "purpose": "what this file does",
        "importance": "high|medium|low"
      }
    ]
  },
  "setupInstructions": [
    "step 1: clone the repository",
    "step 2: install dependencies",
    "step 3: configure environment variables",
    "step 4: run the application"
  ],
  "developmentWorkflow": "Description of the development process, branching strategy, and deployment workflow"
}

CRITICAL: Respond with ONLY the JSON object above. Do not include any markdown formatting, explanations, or text outside the JSON structure.

Focus on being accurate, comprehensive, and providing actionable insights for developers who want to understand and contribute to this codebase.
`;
}

function parseAnalysisResponse(text: string): RepositoryAnalysisResponse['analysis'] {
    console.log("🔍 Parsing analysis response:", text.substring(0, 200) + "...");
    
    try {
        // Clean the text - remove any markdown formatting and extract just the JSON
        let cleanedText = text.trim();
        
        // Remove markdown code blocks if present
        cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Try to find JSON object
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const jsonString = jsonMatch[0];
            console.log("📋 Found JSON structure, parsing...");
            const parsed = JSON.parse(jsonString);
            
            // Clean and validate the parsed data
            return {
                summary: cleanText(parsed.summary) || 'Repository analysis completed',
                techStack: {
                    frontend: Array.isArray(parsed.techStack?.frontend) ? parsed.techStack.frontend.map(cleanText) : [],
                    backend: Array.isArray(parsed.techStack?.backend) ? parsed.techStack.backend.map(cleanText) : [],
                    database: Array.isArray(parsed.techStack?.database) ? parsed.techStack.database.map(cleanText) : [],
                    tools: Array.isArray(parsed.techStack?.tools) ? parsed.techStack.tools.map(cleanText) : []
                },
                architecture: {
                    overview: cleanText(parsed.architecture?.overview) || 'Architecture analysis completed',
                    keyComponents: Array.isArray(parsed.architecture?.keyComponents) ? parsed.architecture.keyComponents.map(cleanText) : [],
                    dataFlow: cleanText(parsed.architecture?.dataFlow) || 'Data flow analysis completed'
                },
                fileStructure: {
                    overview: cleanText(parsed.fileStructure?.overview) || 'File structure analysis completed',
                    keyFiles: Array.isArray(parsed.fileStructure?.keyFiles) ? parsed.fileStructure.keyFiles.map((file: any) => ({
                        path: cleanText(file.path) || '',
                        purpose: cleanText(file.purpose) || '',
                        importance: (file.importance === 'high' || file.importance === 'medium' || file.importance === 'low') ? file.importance : 'medium'
                    })) : []
                },
                setupInstructions: Array.isArray(parsed.setupInstructions) ? parsed.setupInstructions.map(cleanText) : [],
                developmentWorkflow: cleanText(parsed.developmentWorkflow) || 'Development workflow analysis completed'
            };
        }
    } catch (error) {
        console.log("⚠️ Failed to parse JSON response:", error);
    }

    // Fallback parsing if JSON extraction fails
    console.log("🔄 Using fallback parsing...");
    return {
        summary: extractSection(text, 'summary') || 'Repository analysis completed',
        techStack: {
            frontend: extractList(text, 'frontend'),
            backend: extractList(text, 'backend'),
            database: extractList(text, 'database'),
            tools: extractList(text, 'tools')
        },
        architecture: {
            overview: extractSection(text, 'overview') || 'Architecture analysis completed',
            keyComponents: extractList(text, 'keyComponents'),
            dataFlow: extractSection(text, 'dataFlow') || 'Data flow analysis completed'
        },
        fileStructure: {
            overview: extractSection(text, 'fileStructure') || 'File structure analysis completed',
            keyFiles: []
        },
        setupInstructions: extractList(text, 'setupInstructions'),
        developmentWorkflow: extractSection(text, 'developmentWorkflow') || 'Development workflow analysis completed'
    };
}

function cleanText(text: string): string {
    if (!text) return '';
    return text
        .replace(/\*\*/g, '') // Remove bold markdown
        .replace(/\*/g, '') // Remove italic markdown
        .replace(/`/g, '') // Remove code markdown
        .replace(/\n\s*\n/g, '\n') // Remove extra line breaks
        .trim();
}

function extractSection(text: string, sectionName: string): string {
    const regex = new RegExp(`${sectionName}["\\s]*:["\\s]*["']?([^"']+)["']?`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
}

function extractList(text: string, listName: string): string[] {
    const regex = new RegExp(`${listName}["\\s]*:["\\s]*\\[([^\\]]+)\\]`, 'i');
    const match = text.match(regex);
    if (match) {
        return match[1].split(',').map(item => item.trim().replace(/["']/g, '')).filter(Boolean);
    }
    return [];
} 