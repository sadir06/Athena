'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface RepositoryAnalyzerProps {
    onAnalysisComplete: (data: any) => void;
    projectId?: string;
}

interface RepoAnalysis {
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
}

export default function RepositoryAnalyzer({ onAnalysisComplete, projectId }: RepositoryAnalyzerProps) {
    const [repoUrl, setRepoUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [analysis, setAnalysis] = useState<RepoAnalysis | null>(null);
    const [error, setError] = useState('');

    // Auto-analyze when projectId is provided
    useEffect(() => {
        if (projectId) {
            const repoUrl = `https://github.com/athena-service-account/${projectId}`;
            setRepoUrl(repoUrl);
            handleAnalyzeWithUrl(repoUrl);
        }
    }, [projectId]);

    const handleAnalyzeWithUrl = async (url: string) => {
        setIsLoading(true);
        setError('');
        setAnalysis(null);

        try {
            console.log("🔍 Starting repository analysis for:", url);
            const response = await fetch('/api/repository-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    repoUrl: url,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to analyze repository');
            }

            const data = await response.json() as { analysis: RepoAnalysis };
            console.log("✨ Repository analysis complete!");
            setAnalysis(data.analysis);
            onAnalysisComplete(data.analysis);
        } catch (err) {
            console.error("🚨 Repository analysis failed:", err);
            setError(err instanceof Error ? err.message : 'An error occurred during analysis');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnalyze = async () => {
        if (!repoUrl.trim()) {
            setError('Please enter a GitHub repository URL');
            return;
        }

        // Validate GitHub URL format
        const githubRegex = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+/;
        if (!githubRegex.test(repoUrl)) {
            setError('Please enter a valid GitHub repository URL (e.g., https://github.com/username/repo)');
            return;
        }

        setIsLoading(true);
        setError('');
        setAnalysis(null);

        try {
            console.log("🔍 Starting repository analysis - let's decode this codebase mystery!");
            const response = await fetch('/api/repository-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    repoUrl: repoUrl.trim(),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to analyze repository');
            }

            const data = await response.json() as { analysis: RepoAnalysis };
            console.log("✨ Repository analysis complete - the codebase secrets are revealed!");
            setAnalysis(data.analysis);
            onAnalysisComplete(data.analysis);
        } catch (err) {
            console.error("🚨 Repository analysis failed:", err);
            setError(err instanceof Error ? err.message : 'An error occurred during analysis');
        } finally {
            setIsLoading(false);
        }
    };

    const getImportanceColor = (importance: string) => {
        switch (importance) {
            case 'high':
                return 'text-red-400 border-red-400/20 bg-red-500/10';
            case 'medium':
                return 'text-yellow-400 border-yellow-400/20 bg-yellow-500/10';
            case 'low':
                return 'text-green-400 border-green-400/20 bg-green-500/10';
            default:
                return 'text-gray-400 border-gray-400/20 bg-gray-500/10';
        }
    };

    return (
        <div className="space-y-8">
            {/* Input Section - Only show if no projectId provided */}
            {!projectId && (
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-yellow-400 mb-2">Repository Analysis</h2>
                        <p className="text-gray-400">Enter a GitHub repository URL to get a comprehensive analysis</p>
                    </div>
                    
                    <div className="flex gap-4">
                        <input
                            type="url"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            placeholder="https://github.com/username/repository"
                            className="flex-1 bg-gray-900/60 backdrop-blur-xl border border-yellow-400/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all duration-200"
                        />
                        <motion.button
                            onClick={handleAnalyze}
                            disabled={isLoading || !repoUrl.trim()}
                            className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 disabled:from-gray-600 disabled:to-gray-700 text-black font-bold rounded-xl transition-all duration-200 disabled:cursor-not-allowed shadow-lg hover:shadow-yellow-500/25 backdrop-blur-sm border border-yellow-400/20"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
                                    Analyzing...
                                </div>
                            ) : (
                                '🔍 Analyze Repository'
                            )}
                        </motion.button>
                    </div>
                </div>
            )}

            {/* Project Info when projectId is provided */}
            {projectId && (
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-yellow-400 mb-2">Repository Analysis</h2>
                    <motion.p 
                        className="text-gray-300 font-medium"
                        animate={{
                            color: ['#FCD34D', '#9CA3AF', '#FCD34D'],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    >
                        Analyzing repository...
                    </motion.p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-400/20 rounded-xl text-red-400">
                    {error}
                </div>
            )}

            {/* Analysis Results */}
            {analysis && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    {/* Summary */}
                    <div className="p-6 bg-gray-900/40 backdrop-blur-xl border border-yellow-400/20 rounded-xl">
                        <h3 className="text-xl font-bold text-yellow-400 mb-4">📋 Project Summary</h3>
                        <div className="prose prose-invert prose-yellow max-w-none">
                            <p className="text-gray-300 leading-relaxed">{analysis.summary}</p>
                        </div>
                    </div>

                    {/* Tech Stack */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="p-6 bg-gray-900/40 backdrop-blur-xl border border-blue-400/20 rounded-xl">
                            <h3 className="text-xl font-bold text-blue-400 mb-4">⚡ Tech Stack</h3>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-medium text-blue-300 mb-2">Frontend</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.techStack.frontend.map((tech, index) => (
                                            <span key={index} className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-sm">
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium text-blue-300 mb-2">Backend</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.techStack.backend.map((tech, index) => (
                                            <span key={index} className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-sm">
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium text-blue-300 mb-2">Database</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.techStack.database.map((tech, index) => (
                                            <span key={index} className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-sm">
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium text-blue-300 mb-2">Tools & Services</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.techStack.tools.map((tech, index) => (
                                            <span key={index} className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-sm">
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Architecture */}
                        <div className="p-6 bg-gray-900/40 backdrop-blur-xl border border-yellow-400/20 rounded-xl">
                            <h3 className="text-xl font-bold text-yellow-400 mb-4">🏗️ Architecture</h3>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-medium text-yellow-300 mb-2">Overview</h4>
                                    <div className="prose prose-invert prose-yellow max-w-none">
                                        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{analysis.architecture.overview}</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium text-yellow-300 mb-2">Key Components</h4>
                                    <ul className="space-y-2">
                                        {analysis.architecture.keyComponents.map((component, index) => (
                                            <li key={index} className="text-gray-300 leading-relaxed flex items-start gap-2">
                                                <span className="text-yellow-400 mt-1">•</span>
                                                <span>{component}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-medium text-yellow-300 mb-2">Data Flow</h4>
                                    <div className="prose prose-invert prose-yellow max-w-none">
                                        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{analysis.architecture.dataFlow}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* File Structure */}
                    <div className="p-6 bg-gray-900/40 backdrop-blur-xl border border-purple-400/20 rounded-xl">
                        <h3 className="text-xl font-bold text-purple-400 mb-4">📁 File Structure</h3>
                        <p className="text-gray-300 mb-4">{analysis.fileStructure.overview}</p>
                        <div className="grid gap-3">
                            {analysis.fileStructure.keyFiles.map((file, index) => (
                                <div
                                    key={index}
                                    className={`p-3 border rounded-lg backdrop-blur-xl ${getImportanceColor(file.importance)}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <code className="font-mono text-sm">{file.path}</code>
                                            <p className="text-sm mt-1">{file.purpose}</p>
                                        </div>
                                        <span className="text-xs px-2 py-1 rounded-full border capitalize">
                                            {file.importance}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Setup Instructions */}
                    <div className="p-6 bg-gray-900/40 backdrop-blur-xl border border-orange-400/20 rounded-xl">
                        <h3 className="text-xl font-bold text-orange-400 mb-4">🚀 Setup Instructions</h3>
                        <ol className="space-y-2">
                            {analysis.setupInstructions.map((instruction, index) => (
                                <li key={index} className="text-gray-300 flex items-start gap-3">
                                    <span className="text-orange-400 font-bold">{index + 1}.</span>
                                    <span>{instruction}</span>
                                </li>
                            ))}
                        </ol>
                    </div>

                    {/* Development Workflow */}
                    <div className="p-6 bg-gray-900/40 backdrop-blur-xl border border-teal-400/20 rounded-xl">
                        <h3 className="text-xl font-bold text-teal-400 mb-4">🔄 Development Workflow</h3>
                        <p className="text-gray-300 leading-relaxed">{analysis.developmentWorkflow}</p>
                    </div>
                </motion.div>
            )}
        </div>
    );
} 