import ProjectManageClient from './ProjectManageClient';

export const runtime = 'edge';

export default async function ProjectManagePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    return <ProjectManageClient projectId={id} />;
} 