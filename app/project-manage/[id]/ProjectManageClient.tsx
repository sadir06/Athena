'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaRocket, FaRedo, FaEdit, FaStop, FaCog, FaClock, FaCheckCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

interface Project {
    id: string;
    title: string;
    overview: string;
    port: number;
    status: string;
    createdAt: string;
    createdTimestamp?: number;
    restartTimestamp?: number;
}

interface ProjectManageClientProps {
    projectId: string;
}

interface ProjectApiResponse {
    success: boolean;
    project: Project;
}

interface RestartApiResponse {
    success: boolean;
    message: string;
    data: any;
}

interface RestartErrorResponse {
    error: string;
    details?: string;
}

export default function ProjectManageClient({ projectId }: ProjectManageClientProps) {
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRestarting, setIsRestarting] = useState(false);
    const [timeUntilReady, setTimeUntilReady] = useState(0);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [showRestartModal, setShowRestartModal] = useState(false);

    useEffect(() => {
        console.log(`🏛️ Loading project management for: ${projectId} - Athena's wisdom flows through the data streams!`);
        fetchProject();
    }, [projectId]);

    // Timer effect to update the countdown
    useEffect(() => {
        const interval = setInterval(() => {
            if (project) {
                const now = Date.now();
                const targetTimestamp = project.restartTimestamp || project.createdTimestamp;
                
                if (targetTimestamp) {
                    const timeSinceEvent = now - targetTimestamp;
                    const remainingTime = Math.max(0, 60000 - timeSinceEvent); // 60 seconds in milliseconds
                    setTimeUntilReady(Math.ceil(remainingTime / 1000));
                } else {
                    setTimeUntilReady(0);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [project]);

    const fetchProject = async () => {
        try {
            // First try to get project data from local API
            const response = await fetch(`/api/projects/${projectId}`);
            if (response.ok) {
                const data = await response.json() as ProjectApiResponse;
                setProject(data.project);
                console.log(`✅ Project data loaded from local API: ${data.project.title} - strategic intelligence acquired!`);
                return;
            }
            
            // If local API fails, try to get data from GitHub
            console.log('🔍 Local project data not found, checking GitHub repository...');
            const githubResponse = await fetch(`https://api.github.com/repos/athena-service-account/${projectId}`);
            
            if (githubResponse.ok) {
                const repoData = await githubResponse.json() as {
                    name: string;
                    description?: string;
                    html_url: string;
                    created_at: string;
                    updated_at: string;
                };
                
                // Create project object from GitHub data
                const projectData: Project = {
                    id: repoData.name,
                    title: repoData.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    overview: repoData.description || 'Project created with Athena AI',
                    port: 3001, // Default port
                    status: 'active',
                    createdAt: repoData.created_at,
                    createdTimestamp: new Date(repoData.created_at).getTime()
                };
                
                setProject(projectData);
                console.log(`✅ Project data loaded from GitHub: ${projectData.title} - strategic intelligence acquired!`);
            } else {
                throw new Error('Project not found in local storage or GitHub');
            }
        } catch (error) {
            console.error('💥 Error fetching project:', error);
            setError(error instanceof Error ? error.message : 'Failed to load project');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestart = () => {
        if (!project) return;
        setShowRestartModal(true);
    };

    const confirmRestart = async () => {
        if (!project) return;

        setIsRestarting(true);
        setShowRestartModal(false);
        console.log(`🔄 Restarting project ${project.id} - channeling the power of renewal!`);

        try {
            // Try to restart via local API first
            const response = await fetch(`/api/restart-project/${project.id}`, {
                method: 'POST',
            });

            if (response.ok) {
                const data = await response.json() as RestartApiResponse;
                console.log(`✅ Project restarted successfully via local API: ${data.message} - rebirth achieved!`);
                toast.success(`Project "${project.title}" restarted successfully! 🚀`);
                await fetchProject();
                return;
            }

            // If local API fails, try to restart via EC2 server
            console.log('🔍 Local restart failed, trying EC2 server...');
            const ec2Response = await fetch(`https://ec2.athenaai.lol/restart-project/${project.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port: project.port })
            });

            if (ec2Response.ok) {
                const ec2Data = await ec2Response.json() as { message?: string };
                console.log(`✅ Project restarted successfully via EC2: ${ec2Data.message || 'Success'} - rebirth achieved!`);
                toast.success(`Project "${project.title}" restarted successfully! 🚀`);
                
                // Update project with new restart timestamp
                setProject(prev => prev ? {
                    ...prev,
                    restartTimestamp: Date.now()
                } : null);
            } else {
                const errorData = await ec2Response.json() as RestartErrorResponse;
                throw new Error(errorData.error || 'Failed to restart project');
            }
            
        } catch (error) {
            console.error('💥 Error restarting project:', error);
            toast.error(`Failed to restart project: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsRestarting(false);
        }
    };

    const cancelRestart = () => {
        setShowRestartModal(false);
    };

    const handleDeleteProject = () => {
        if (!project) return;
        setShowDeleteModal(true);
        setDeleteConfirmation('');
    };

    const confirmDelete = async () => {
        if (!project || deleteConfirmation !== 'DELETE') {
            toast.error('Please type "DELETE" exactly to confirm deletion.');
            return;
        }

        setIsDeleting(true);
        console.log(`🗑️ Deleting project ${project.id} - this is the end of an era!`);

        try {
            // Delete from local KV store first
            const localResponse = await fetch(`/api/projects/${project.id}`, {
                method: 'DELETE',
            });

            // Delete from GitHub
            const githubResponse = await fetch('/api/delete-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.id
                })
            });

            if (githubResponse.ok) {
                console.log(`✅ Project deleted successfully: ${project.title} - farewell, old friend!`);
                toast.success(`Project "${project.title}" deleted successfully! 🗑️`);
                
                // Close modal and redirect to home page
                setShowDeleteModal(false);
                router.push('/');
            } else {
                const errorData = await githubResponse.json() as { error?: string };
                throw new Error(errorData.error || 'Failed to delete project');
            }
        } catch (error) {
            console.error('💥 Error deleting project:', error);
            toast.error(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
        setDeleteConfirmation('');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <div className="text-center">
                    <motion.div 
                        className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-6"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <p className="text-gray-300 text-lg">Loading project...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <div className="text-center bg-gray-900/40 backdrop-blur-xl p-8 rounded-2xl border border-red-400/20">
                    <FaExclamationTriangle className="text-red-400 text-4xl mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-red-400 mb-4">Error</h1>
                    <p className="text-gray-300 mb-6">{error}</p>
                    <Link href="/" className="text-yellow-400 hover:text-yellow-300 transition-colors flex items-center justify-center gap-2">
                        <FaArrowLeft />
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <div className="text-center bg-gray-900/40 backdrop-blur-xl p-8 rounded-2xl border border-gray-400/20">
                    <FaInfoCircle className="text-gray-400 text-4xl mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-300 mb-4">Project Not Found</h1>
                    <Link href="/" className="text-yellow-400 hover:text-yellow-300 transition-colors flex items-center justify-center gap-2">
                        <FaArrowLeft />
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    const isReady = timeUntilReady <= 0;

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden relative">
            {/* Professional Gradient Layers */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,215,0,0.05),transparent_60%)]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,215,0,0.03),transparent_60%)]"></div>
            </div>

            {/* Animated Grid Pattern */}
            <div
                className="fixed inset-0 opacity-20 z-0"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFD700' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    animation: "gridMove 15s linear infinite",
                }}
            ></div>

            <div className="relative z-10">
            {/* Header */}
                <motion.header 
                    className="border-b border-yellow-400/20 p-6 backdrop-blur-xl bg-black/40"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <div className="flex items-center">
                            <Link href="/" className="text-yellow-400 hover:text-yellow-300 mr-6 transition-colors flex items-center gap-2">
                                <FaArrowLeft />
                                Back to Home
                            </Link>
                            <motion.h1 
                                className="text-3xl font-bold"
                                style={{
                                    background: "linear-gradient(45deg, #FFD700, #FFA500, #FFD700)",
                                    backgroundSize: "200% 200%",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                }}
                                animate={{
                                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                                }}
                                transition={{
                                    duration: 4,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            >
                                Project Management
                            </motion.h1>
                        </div>
                    </div>
                </motion.header>

            {/* Main Content */}
                <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Project Info */}
                        <motion.div 
                            className="lg:col-span-2"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-yellow-400/20 p-8">
                                <div className="flex items-start justify-between mb-8">
                                    <div className="flex-1">
                                        <h2 className="text-3xl font-bold text-white mb-4">{project.title}</h2>
                                        <div className="space-y-2 text-gray-300">
                                            <p className="flex items-center gap-2">
                                                <span className="text-yellow-400 font-medium">Project ID:</span> 
                                                <code className="bg-gray-800/50 px-2 py-1 rounded text-sm">{project.id}</code>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <span className="text-yellow-400 font-medium">Status:</span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                    project.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-400/30' :
                                                    project.status === 'creating' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30' :
                                                    project.status === 'restarting' ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30' :
                                                    'bg-gray-500/20 text-gray-400 border border-gray-400/30'
                                        }`}>
                                            {project.status}
                                        </span>
                                    </p>
                                            <p className="flex items-center gap-2">
                                                <span className="text-yellow-400 font-medium">Created:</span> 
                                                {new Date(project.createdAt).toLocaleString()}
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <span className="text-yellow-400 font-medium">Port:</span> 
                                                <code className="bg-gray-800/50 px-2 py-1 rounded text-sm">{project.port}</code>
                                            </p>
                                        </div>
                                    </div>
                            </div>

                            <div className="mb-6">
                                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                        <FaInfoCircle className="text-yellow-400" />
                                        Project Overview
                                    </h3>
                                    <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-xl border border-gray-600/30">
                                        <div className="prose prose-invert prose-yellow max-w-none">
                                            <ReactMarkdown 
                                                components={{
                                                    h1: ({children}) => <h1 className="text-2xl font-bold text-yellow-400 mb-4">{children}</h1>,
                                                    h2: ({children}) => <h2 className="text-xl font-bold text-yellow-300 mb-3">{children}</h2>,
                                                    h3: ({children}) => <h3 className="text-lg font-bold text-yellow-200 mb-2">{children}</h3>,
                                                    p: ({children}) => <p className="text-gray-200 leading-relaxed mb-4">{children}</p>,
                                                    ul: ({children}) => <ul className="list-disc list-inside text-gray-200 mb-4 space-y-1">{children}</ul>,
                                                    ol: ({children}) => <ol className="list-decimal list-inside text-gray-200 mb-4 space-y-1">{children}</ol>,
                                                    li: ({children}) => <li className="text-gray-200">{children}</li>,
                                                    strong: ({children}) => <strong className="font-bold text-yellow-300">{children}</strong>,
                                                    em: ({children}) => <em className="italic text-yellow-200">{children}</em>,
                                                    code: ({children}) => <code className="bg-gray-700/50 px-2 py-1 rounded text-sm text-yellow-200 font-mono">{children}</code>,
                                                    pre: ({children}) => <pre className="bg-gray-700/50 p-4 rounded-lg text-sm text-yellow-200 font-mono overflow-x-auto mb-4">{children}</pre>,
                                                    blockquote: ({children}) => <blockquote className="border-l-4 border-yellow-400/50 pl-4 italic text-gray-300 mb-4">{children}</blockquote>,
                                                }}
                                            >
                                                {project.overview}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                            </div>

                            {/* GitHub Repository Link Card */}
                            {/* Removed the GitHub repository link card as requested */}
                    </div>
                        </motion.div>

                    {/* Actions Panel */}
                        <motion.div 
                            className="lg:col-span-1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                        >
                            <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-yellow-400/20 p-6">
                                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                                    <FaCog className="text-yellow-400" />
                                    Actions
                                </h3>
                                <div className="space-y-4">
                                {/* View Live Project */}
                                    <motion.button
                                    onClick={() => window.open(`http://54.145.223.187:${project.port}`, '_blank')}
                                    disabled={!isReady}
                                        className={`w-full flex items-center justify-center px-6 py-4 border border-transparent rounded-xl shadow-lg text-sm font-bold transition-all duration-200 ${
                                        isReady 
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white shadow-green-500/25 hover:shadow-green-500/40' 
                                                : 'bg-gray-700/50 text-gray-400 cursor-not-allowed border-gray-600/30'
                                    }`}
                                        whileHover={isReady ? { scale: 1.02, y: -1 } : {}}
                                        whileTap={isReady ? { scale: 0.98 } : {}}
                                >
                                        <FaRocket className="mr-2" />
                                    {isReady ? (
                                            '🚀 View Live Project'
                                    ) : (
                                            `⏱️ Ready in ${timeUntilReady}s`
                                    )}
                                    </motion.button>

                                {/* Restart Project */}
                                    <motion.button
                                    onClick={handleRestart}
                                    disabled={!isReady || isRestarting}
                                        className={`w-full flex items-center justify-center px-6 py-4 border border-transparent rounded-xl shadow-lg text-sm font-bold transition-all duration-200 ${
                                        isReady && !isRestarting
                                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white shadow-blue-500/25 hover:shadow-blue-500/40' 
                                                : 'bg-gray-700/50 text-gray-400 cursor-not-allowed border-gray-600/30'
                                    }`}
                                        whileHover={isReady && !isRestarting ? { scale: 1.02, y: -1 } : {}}
                                        whileTap={isReady && !isRestarting ? { scale: 0.98 } : {}}
                                >
                                    {isRestarting ? (
                                        <>
                                                <motion.div 
                                                    className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white mr-2"
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                />
                                            Restarting...
                                        </>
                                    ) : !isReady ? (
                                        <>
                                                <FaClock className="mr-2" />
                                            ⏱️ Ready in {timeUntilReady}s
                                        </>
                                    ) : (
                                        <>
                                                <FaRedo className="mr-2" />
                                            🔄 Restart Project
                                        </>
                                    )}
                                    </motion.button>

                                {/* Edit Project Button */}
                                    <motion.button
                                    onClick={() => router.push(`/change-request?projectId=${projectId}`)}
                                        className="w-full flex items-center justify-center px-6 py-4 border border-blue-600/30 rounded-xl text-sm font-medium text-blue-300 bg-blue-700/30 hover:bg-blue-600/40 hover:text-blue-200 transition-all duration-200 backdrop-blur-sm"
                                        whileHover={{ scale: 1.02, y: -1 }}
                                        whileTap={{ scale: 0.98 }}
                                >
                                        <FaEdit className="mr-2" />
                                    ✏️ Edit Project
                                    </motion.button>

                                {/* View on GitHub Button */}
                                    <a
                                        href={`https://github.com/athena-service-account/${project.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center px-6 py-4 border border-blue-400/30 rounded-xl text-sm font-medium text-blue-300 bg-blue-700/30 hover:bg-blue-600/40 hover:text-blue-200 transition-all duration-200 backdrop-blur-sm mb-2"
                                        style={{ textDecoration: 'none' }}
                                    >
                                        <svg className="mr-2 w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                        </svg>
                                        View on GitHub →
                                    </a>

                                    <motion.button
                                    onClick={handleDeleteProject}
                                        className="w-full flex items-center justify-center px-6 py-4 border border-red-600/30 rounded-xl text-sm font-medium text-red-300 bg-red-700/30 hover:bg-red-600/40 hover:text-red-200 transition-all duration-200 backdrop-blur-sm mt-4"
                                        whileHover={{ scale: 1.02, y: -1 }}
                                        whileTap={{ scale: 0.98 }}
                                >
                                        <FaStop className="mr-2" />
                                    🗑️ Delete Project
                                    </motion.button>


                            </div>

                            {!isReady && (
                                    <motion.div 
                                        className="mt-6 p-4 bg-yellow-500/10 border border-yellow-400/30 rounded-xl backdrop-blur-sm"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                                <FaClock className="w-5 h-5 text-yellow-400 mt-0.5" />
                                        </div>
                                        <div className="ml-3">
                                                <p className="text-sm text-yellow-200">
                                                    Project is starting up. Please wait <span className="font-bold">{timeUntilReady}</span> seconds before accessing.
                                            </p>
                                        </div>
                                    </div>
                                    </motion.div>
                            )}
                        </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Custom Restart Confirmation Modal */}
            {showRestartModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <motion.div 
                        className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full border border-blue-400/30"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        <div className="p-6">
                            <div className="flex items-center mb-6">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-400/30">
                                        <FaRedo className="w-6 h-6 text-blue-400" />
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-xl font-bold text-white">
                                        Restart Project
                                    </h3>
                                    <p className="text-sm text-gray-400">
                                        This will restart the development server
                                    </p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <p className="text-gray-300 mb-4">
                                    Are you sure you want to restart <span className="font-semibold text-white">"{project?.title}"</span>?
                                </p>
                                <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4 mb-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <FaRedo className="w-5 h-5 text-blue-400 mt-0.5" />
                                        </div>
                                        <div className="ml-3">
                                            <h4 className="text-sm font-medium text-blue-300">This will:</h4>
                                            <ul className="mt-1 text-sm text-blue-200 space-y-1">
                                                <li>• Stop the current development server</li>
                                                <li>• Pull latest changes from GitHub</li>
                                                <li>• Restart the server with fresh code</li>
                                                <li>• Take about 30-60 seconds to complete</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <motion.button
                                    type="button"
                                    onClick={cancelRestart}
                                    disabled={isRestarting}
                                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800/50 border border-gray-600/50 rounded-xl hover:bg-gray-700/50 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    type="button"
                                    onClick={confirmRestart}
                                    disabled={isRestarting}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center backdrop-blur-sm"
                                    whileHover={!isRestarting ? { scale: 1.02 } : {}}
                                    whileTap={!isRestarting ? { scale: 0.98 } : {}}
                                >
                                    {isRestarting ? (
                                        <>
                                            <motion.div 
                                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            >
                                                <svg fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            </motion.div>
                                            Restarting...
                                        </>
                                    ) : (
                                        'Restart Project'
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <motion.div 
                        className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full border border-red-400/30"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        <div className="p-6">
                            <div className="flex items-center mb-6">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center border border-red-400/30">
                                        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-xl font-bold text-white">
                                        Delete Project
                                    </h3>
                                    <p className="text-sm text-gray-400">
                                        This action cannot be undone
                                    </p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <p className="text-gray-300 mb-4">
                                    Are you sure you want to delete <span className="font-semibold text-white">"{project?.title}"</span>?
                                </p>
                                <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-4 mb-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h4 className="text-sm font-medium text-red-300">This will:</h4>
                                            <ul className="mt-1 text-sm text-red-200 space-y-1">
                                                <li>• Delete the GitHub repository</li>
                                                <li>• Remove all project data</li>
                                                <li>• Cannot be undone</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label htmlFor="delete-confirmation" className="block text-sm font-medium text-gray-300 mb-2">
                                        Type "DELETE" to confirm:
                                    </label>
                                    <input
                                        type="text"
                                        id="delete-confirmation"
                                        value={deleteConfirmation}
                                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 backdrop-blur-sm"
                                        placeholder="DELETE"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <motion.button
                                    type="button"
                                    onClick={cancelDelete}
                                    disabled={isDeleting}
                                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800/50 border border-gray-600/50 rounded-xl hover:bg-gray-700/50 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    type="button"
                                    onClick={confirmDelete}
                                    disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center backdrop-blur-sm"
                                    whileHover={deleteConfirmation === 'DELETE' && !isDeleting ? { scale: 1.02 } : {}}
                                    whileTap={deleteConfirmation === 'DELETE' && !isDeleting ? { scale: 0.98 } : {}}
                                >
                                    {isDeleting ? (
                                        <>
                                            <motion.div 
                                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            >
                                                <svg fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            </motion.div>
                                            Deleting...
                                        </>
                                    ) : (
                                        'Delete Project'
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Custom CSS for animations */}
            <style jsx>{`
                @keyframes gridMove {
                    0% { transform: translate(0, 0); }
                    100% { transform: translate(60px, 60px); }
                }
            `}</style>
        </div>
    );
} 