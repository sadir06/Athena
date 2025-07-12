import { getRequestContext } from '@cloudflare/next-on-pages';

interface CreateProjectRequest {
    projectoverview: string;
    stack?: string;
    deployment?: string;
}

interface RunningProject {
    projectId: string;
    port: number;
    startTime: string;
    pid: number;
}

interface ProjectsResponse {
    projects: RunningProject[];
}

export const runtime = 'edge';

// Generate 5-digit unique number
function generateUniqueNumber(): string {
    // Generate a 5-digit number using timestamp and random
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const uniqueNum = (parseInt(timestamp.slice(-4) + random) % 100000).toString().padStart(5, '0');
    return uniqueNum;
}

// Generate project ID from title
function generateProjectId(title: string): string {
    // Extract title from project overview (look for first line that looks like a title)
    const lines = title.split('\n');
    let projectTitle = 'athena-project';
    
    // Look for markdown title or first meaningful line
    for (const line of lines) {
        const cleaned = line.replace(/[#*\-\s]/g, '').trim();
        if (cleaned.length > 3 && cleaned.length < 50) {
            projectTitle = cleaned;
            break;
        }
    }
    
    // Clean title: alphanumeric only, spaces to hyphens, first 20 chars
    const cleanTitle = projectTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 20);
    
    // Generate 5-digit unique number
    const uniqueNumber = generateUniqueNumber();
    
    return `${cleanTitle}-${uniqueNumber}`;
}

export async function POST(request: Request) {
    console.log("🚀 Athena's Project Creation API activated - time to build something amazing! 🏗️");
    
    try {
        const body = await request.json() as CreateProjectRequest;
        console.log("📝 Project creation request received:", {
            hasOverview: !!body.projectoverview,
            stack: body.stack || 'next-on-pages',
            deployment: body.deployment || 'cloudflare'
        });

        // Validate required fields
        if (!body.projectoverview) {
            console.error("❌ Missing required field: projectoverview");
            return new Response(JSON.stringify({
                error: 'Missing required field: projectoverview is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Generate project ID and title
        const projectId = generateProjectId(body.projectoverview);
        const projectTitle = projectId.split('-')[0].replace(/_/g, ' ');
        
        console.log("🎯 Generated project ID:", projectId);
        console.log("📝 Generated project title:", projectTitle);

        // Get available port by checking running projects
        console.log("🔍 Checking running projects to find available port...");
        
        let availablePort = 3001; // Start from default port
        try {
            const projectsResponse = await fetch('https://ec2.athenaai.lol/projects');
            if (projectsResponse.ok) {
                const projectsData = await projectsResponse.json() as ProjectsResponse;
                console.log("📊 Current running projects:", projectsData);
                
                // Extract used ports
                const usedPorts = projectsData.projects?.map((p: RunningProject) => p.port) || [];
                console.log("🚫 Ports already in use:", usedPorts);
                
                // Find first available port starting from 3001
                while (usedPorts.includes(availablePort)) {
                    availablePort++;
                }
                console.log("✅ Selected available port:", availablePort);
            } else {
                console.log("⚠️ Could not fetch running projects, using default port 3001");
            }
        } catch (error) {
            console.log("⚠️ Error checking running projects, using default port 3001:", error);
        }

        // Get KV binding
        const { env } = getRequestContext();
        const kvStore = env.ATHENA_AI_PROJECTS;

        // Create KV entry with selected port
        const projectData = {
            id: projectId,
            title: projectTitle,
            overview: body.projectoverview,
            stack: body.stack || 'next-on-pages',
            deployment: body.deployment || 'cloudflare',
            status: 'creating',
            createdAt: new Date().toISOString(),
            createdTimestamp: Date.now(), // Add timestamp for 60-second delay logic
            port: availablePort // Use the dynamically selected port
        };

        console.log("💾 Storing project data in KV store with port:", availablePort);
        await kvStore.put(projectId, JSON.stringify(projectData));

        console.log("🎯 Forwarding project creation to EC2 instance - the magic begins! ✨");
        
        // Forward request to EC2 instance with our generated data and selected port
        const ec2Response = await fetch('https://ec2.athenaai.lol/create-project', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                projectId: projectId,
                projectTitle: projectTitle,
                port: availablePort, // Use the dynamically selected port
                projectOverview: body.projectoverview
            })
        });

        console.log("📡 EC2 response status:", ec2Response.status);

        if (!ec2Response.ok) {
            const errorText = await ec2Response.text();
            console.error("❌ EC2 instance responded with error:", errorText);
            
            // Update KV with error status
            await kvStore.put(projectId, JSON.stringify({
                ...projectData,
                status: 'error',
                error: errorText
            }));
            
            throw new Error(`EC2 instance error: ${ec2Response.status} - ${errorText}`);
        }

        const ec2ResponseData = await ec2Response.json();
        console.log("🎉 Project creation successful! Athena approves this strategic move! 🏛️");

        // Update KV with success status
        await kvStore.put(projectId, JSON.stringify({
            ...projectData,
            status: 'created',
            ec2Response: ec2ResponseData
        }));

        // --- AUTOMATION: Apply project overview as initial change request ---
        (async () => {
            const maxRetries = 5;
            let attempt = 0;
            let success = false;
            let lastError = null;
            console.log(`[CHANGE-REQUEST] Starting initial codegen+commit automation for projectId: ${projectId}`);
            while (attempt < maxRetries && !success) {
                attempt++;
                try {
                    await new Promise(resolve => setTimeout(resolve, 5000));

                    const payload = {
                        repoId: projectId,
                        changeRequest: `Create the initial project based on this overview: ${body.projectoverview}`,
                        projectContext: `Initial project setup for ${projectTitle}. Transform the basic Next.js template into the described project.`
                    };
                    console.log(`[CHANGE-REQUEST] Attempt ${attempt} - Calling codegen agent with:`, payload);

                    // Always use an absolute URL for Edge Runtime
                    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
                    if (!baseUrl) {
                        // Try to infer from the request headers (works in Edge API routes)
                        const { headers } = request;
                        const host = headers.get('host');
                        const protocol = headers.get('x-forwarded-proto') || 'https';
                        baseUrl = `${protocol}://${host}`;
                    }
                    const updateProjectUrl = `${baseUrl}/api/update-project`;

                    const changeRequestRes = await fetch(updateProjectUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    let responseBody = null;
                    try {
                        responseBody = await changeRequestRes.clone().json();
                        console.log(`[CHANGE-REQUEST] Attempt ${attempt} - Response body:`, responseBody);
                    } catch (parseErr) {
                        responseBody = await changeRequestRes.clone().text();
                        console.log(`[CHANGE-REQUEST] Attempt ${attempt} - Response body (text):`, responseBody);
                    }

                    if (!changeRequestRes.ok) {
                        const errorMsg = typeof responseBody === 'object' && responseBody && 'error' in responseBody ? responseBody.error : 'Change request failed';
                        console.log(`[CHANGE-REQUEST] Attempt ${attempt} - Codegen+commit failed:`, errorMsg);
                        lastError = errorMsg;
                        continue;
                    }

                    const changes = typeof responseBody === 'object' && responseBody && 'changes' in responseBody ? responseBody.changes : [];
                    console.log(`[CHANGE-REQUEST] Attempt ${attempt} - Codegen+commit succeeded! Modified files:`, Array.isArray(changes) ? changes.length : 0);
                    await kvStore.put(projectId, JSON.stringify({
                        ...projectData,
                        status: 'ready',
                        lastChange: Date.now(),
                        changes: changes
                    }));
                    success = true;
                } catch (err) {
                    console.log(`[CHANGE-REQUEST] Attempt ${attempt} - Exception:`, err);
                    lastError = err instanceof Error ? err.message : String(err);
                }
            }
            if (!success) {
                console.log(`[CHANGE-REQUEST] All attempts failed for projectId: ${projectId}. Last error:`, lastError);
                await kvStore.put(projectId, JSON.stringify({
                    ...projectData,
                    status: 'error',
                    error: lastError || 'Change request failed after retries'
                }));
            } else {
                console.log(`[CHANGE-REQUEST] ProjectId ${projectId} is now ready after codegen+commit automation.`);
            }
        })();
        // --- END AUTOMATION ---

        return new Response(JSON.stringify({
            projectId: projectId,
            title: projectTitle,
            status: 'created',
            ec2Data: ec2ResponseData
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('🚨 Error in Athena Project Creation API:', error);
        console.error('🚨 Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        
        return new Response(JSON.stringify({
            error: 'Failed to create project',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
} 