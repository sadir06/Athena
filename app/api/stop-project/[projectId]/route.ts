export const runtime = 'edge';

interface RouteParams {
    params: Promise<{ projectId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
    console.log("🛑 Athena's Project Termination API activated - strategic shutdown initiated! ⚡");
    
    try {
        const { projectId } = await params;
        console.log("🎯 Stopping project with ID:", projectId);

        if (!projectId) {
            console.error("❌ Missing projectId parameter");
            return new Response(JSON.stringify({
                error: 'Missing projectId parameter'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log("🎯 Forwarding stop request to EC2 instance - strategic retreat in progress! 🏛️");
        
        // Forward request to EC2 instance
        const ec2Response = await fetch(`https://ec2.athenaai.lol/stop-project/${projectId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log("📡 EC2 response status:", ec2Response.status);

        if (!ec2Response.ok) {
            const errorText = await ec2Response.text();
            console.error("❌ EC2 instance responded with error:", errorText);
            throw new Error(`EC2 instance error: ${ec2Response.status} - ${errorText}`);
        }

        const responseData = await ec2Response.json();
        console.log("🎉 Project stopped successfully! Athena has executed a flawless strategic withdrawal! 🏛️");

        return new Response(JSON.stringify(responseData), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('🚨 Error in Athena Project Stop API:', error);
        console.error('🚨 Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        
        return new Response(JSON.stringify({
            error: 'Failed to stop project',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
} 