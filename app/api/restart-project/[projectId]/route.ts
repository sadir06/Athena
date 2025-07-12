import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    console.log("🔄 Athena restart project endpoint called! Time to breathe new life into this creation! 🏛️");
    
    try {
        const { projectId } = await params;
        console.log(`🚀 Restarting project: ${projectId} - May the gods of code be with us!`);
        
        if (!projectId) {
            console.log("❌ No project ID provided - even Athena needs a target! 🎯");
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        // Get the project data from KV to get the port
        const env = process.env as any;
        const projectData = await env.ATHENA_AI_PROJECTS.get(projectId);
        
        if (!projectData) {
            console.log(`❌ Project ${projectId} not found in KV - like searching for wisdom in chaos!`);
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        const project = JSON.parse(projectData);
        const port = project.port;

        console.log(`🔌 Using port ${port} for project ${projectId} - connectivity is key!`);

        // Call the EC2 restart endpoint
        const ec2Response = await fetch(`http://54.145.223.187:3000/restart-project/${projectId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ port }),
        });

        if (!ec2Response.ok) {
            const errorData = await ec2Response.text();
            console.error(`💥 EC2 restart failed: ${errorData} - the servers are rebelling!`);
            return NextResponse.json(
                { error: 'Failed to restart project on EC2', details: errorData },
                { status: 500 }
            );
        }

        const ec2Data = await ec2Response.json();
        console.log(`✅ Project ${projectId} restarted successfully! Wisdom flows through the servers once more! 🌟`);

        // Update the project timestamp in KV for the 60-second delay
        const updatedProject = {
            ...project,
            status: 'restarting',
            lastRestarted: new Date().toISOString(),
            restartTimestamp: Date.now()
        };

        await env.ATHENA_AI_PROJECTS.put(projectId, JSON.stringify(updatedProject));
        console.log(`📝 Updated project ${projectId} in KV with restart timestamp - timing is everything!`);

        return NextResponse.json({
            success: true,
            message: `Project ${projectId} restarted successfully`,
            data: ec2Data
        });

    } catch (error) {
        console.error("🚨 Restart project error:", error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
} 