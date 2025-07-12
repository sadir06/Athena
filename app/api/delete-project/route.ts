import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

interface DeleteProjectRequest {
    projectId: string;
}

export async function POST(request: Request) {
    console.log('🗑️ Project deletion API called - time to clean up!');
    
    try {
        const body = await request.json() as DeleteProjectRequest;
        const { projectId } = body;
        
        if (!projectId) {
            return new Response(JSON.stringify({
                error: 'Missing projectId parameter'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('🎯 Deleting project:', projectId);

        // Get environment variables
        const { env } = getRequestContext();
        const githubToken = (env as any).GITHUB_SERVICE_ACCOUNT_PAT as string;
        const kvStore = env.ATHENA_AI_PROJECTS;

        if (!githubToken) {
            return new Response(JSON.stringify({
                error: 'Missing GitHub service account token'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Delete from GitHub
        console.log('🔗 Deleting GitHub repository...');
        const githubResponse = await fetch(`https://api.github.com/repos/athena-service-account/${projectId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Athena-AI-Platform'
            }
        });

        if (!githubResponse.ok && githubResponse.status !== 404) {
            const errorText = await githubResponse.text();
            console.error('❌ Failed to delete GitHub repository:', errorText);
            return new Response(JSON.stringify({
                error: 'Failed to delete GitHub repository',
                details: errorText
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Delete from KV store
        console.log('💾 Deleting from KV store...');
        await kvStore.delete(projectId);

        console.log('✅ Project deleted successfully!');
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Project deleted successfully'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('🚨 Error in project deletion:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete project';
        
        return new Response(JSON.stringify({
            success: false,
            error: errorMessage
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
} 