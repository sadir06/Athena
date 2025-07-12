import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
    console.log("🔍 Athena's Project Data Retrieval API activated - fetching strategic intelligence! 📊");
    
    try {
        const { id: projectId } = await params;
        console.log("🎯 Fetching project data for ID:", projectId);

        if (!projectId) {
            console.error("❌ Missing projectId parameter");
            return new Response(JSON.stringify({
                error: 'Missing projectId parameter'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get KV binding
        const { env } = getRequestContext();
        const kvStore = env.ATHENA_AI_PROJECTS;

        console.log("💾 Retrieving project data from KV store...");
        const projectDataJson = await kvStore.get(projectId);

        if (!projectDataJson) {
            console.error("❌ Project not found in KV store");
            return new Response(JSON.stringify({
                error: 'Project not found',
                message: `No project found with ID: ${projectId}`
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const projectData = JSON.parse(projectDataJson);
        console.log("✅ Project data retrieved successfully:", {
            id: projectData.id,
            title: projectData.title,
            status: projectData.status,
            port: projectData.port
        });

        return new Response(JSON.stringify({
            success: true,
            project: projectData
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('🚨 Error in Athena Project Data Retrieval API:', error);
        console.error('🚨 Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        
        return new Response(JSON.stringify({
            error: 'Failed to retrieve project data',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function DELETE(request: Request, { params }: RouteParams) {
    console.log("🗑️ Athena's Project Deletion API activated - cleaning up strategic data! 🧹");
    
    try {
        const { id: projectId } = await params;
        console.log("🎯 Deleting project data for ID:", projectId);

        if (!projectId) {
            console.error("❌ Missing projectId parameter");
            return new Response(JSON.stringify({
                error: 'Missing projectId parameter'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get KV binding
        const { env } = getRequestContext();
        const kvStore = env.ATHENA_AI_PROJECTS;

        console.log("💾 Deleting project data from KV store...");
        await kvStore.delete(projectId);

        console.log("✅ Project data deleted successfully");

        return new Response(JSON.stringify({
            success: true,
            message: 'Project deleted successfully'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('🚨 Error in Athena Project Deletion API:', error);
        console.error('🚨 Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        
        return new Response(JSON.stringify({
            error: 'Failed to delete project data',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
} 