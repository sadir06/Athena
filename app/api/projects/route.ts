export const runtime = 'edge';

export async function GET() {
    console.log("📊 Athena's Project Status Check API activated - surveying the digital battlefield! 🔍");
    
    try {
        console.log("🎯 Querying EC2 instance for running projects - wisdom seeks knowledge! 📡");
        
        // Forward request to EC2 instance
        const ec2Response = await fetch('https://ec2.athenaai.lol/projects', {
            method: 'GET',
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
        console.log("🎉 Project status retrieved successfully! Athena sees all running projects! 👁️");

        return new Response(JSON.stringify(responseData), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('🚨 Error in Athena Project Status API:', error);
        console.error('🚨 Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        
        return new Response(JSON.stringify({
            error: 'Failed to get project status',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
} 