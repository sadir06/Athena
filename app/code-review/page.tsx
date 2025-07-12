'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import RepositoryAnalyzer from '@/components/RepositoryAnalyzer';
import RepoChatbot from '@/components/RepoChatbot';

async function validateProjectId(projectId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.github.com/repos/athena-service-account/${projectId}`);
    return response.ok;
  } catch {
    return false;
  }
}

export default function CodeReviewPage() {
    const [analysisMode, setAnalysisMode] = useState<'analyze' | 'chat'>('analyze');
    const [repoData, setRepoData] = useState<any>(null);
    const [projectId, setProjectId] = useState<string>('');
    const [inputId, setInputId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [idError, setIdError] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleProjectIdSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setIdError('');
        
        try {
            const isValid = await validateProjectId(inputId);
            if (isValid) {
                setProjectId(inputId);
                console.log('✅ Project ID validated successfully for Code Review!');
            } else {
                setIdError('Invalid Project ID. Please check the repository exists under athena-service-account.');
                console.log('❌ Project ID validation failed for Code Review');
            }
        } catch (err) {
            setIdError('Error validating Project ID. Please try again.');
            console.error('🚨 Error validating project ID for Code Review:', err);
        } finally {
            setIsLoading(false);
        }
    };

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

            <div className="relative z-10 container mx-auto px-6 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 
                        className="text-4xl md:text-5xl font-bold mb-4"
                        style={{
                            background: "linear-gradient(45deg, #FFD700, #FFA500, #FFD700)",
                            backgroundSize: "200% 200%",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            animation: "gradientShift 4s ease infinite",
                        }}
                    >
                        Code Review
                    </h1>
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
                        Analyze your repository's architecture, tech stack, and codebase structure. 
                        Perfect for code reviews, onboarding teammates, or understanding your project.
                    </p>
                </div>

                {/* Main Content */}
                <div className="max-w-6xl mx-auto">
                    {!projectId ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center min-h-[60vh]"
                        >
                            <motion.div
                                className="relative"
                                whileHover={{ scale: 1.02 }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* Animated background glow */}
                                <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400/20 via-amber-400/20 to-yellow-400/20 rounded-3xl blur-xl animate-pulse"></div>
                                
                                <form onSubmit={handleProjectIdSubmit} className="relative bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 p-10 rounded-3xl shadow-2xl flex flex-col items-center gap-6 border border-yellow-400/30 max-w-lg w-full backdrop-blur-xl">
                                    {/* Decorative elements - all 4 corners */}
                                    <div className="absolute top-4 left-4 w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full opacity-20 animate-bounce"></div>
                                    <div className="absolute top-4 right-4 w-6 h-6 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full opacity-30 animate-pulse"></div>
                                    <div className="absolute bottom-4 left-4 w-6 h-6 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full opacity-25 animate-bounce" style={{ animationDelay: '0.5s' }}></div>
                                    <div className="absolute bottom-4 right-4 w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
                                    
                                    {/* Icon and title */}
                                    <div className="flex flex-col items-center gap-3 mb-4">
                                        <motion.div
                                            className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg"
                                            whileHover={{ rotate: 360 }}
                                            transition={{ duration: 0.6 }}
                                        >
                                            <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
                                            </svg>
                                        </motion.div>
                                        <div className="text-center">
                                            <h3 className="text-2xl font-bold text-yellow-300 mb-2">Repository Access</h3>
                                            <p className="text-gray-400 text-sm">Enter your project ID to analyze</p>
                                        </div>
                                    </div>
                                    
                                    {/* Input field with enhanced styling */}
                                    <div className="w-full relative">
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-amber-400/20 rounded-xl blur-sm"
                                            animate={{
                                                opacity: [0.3, 0.6, 0.3],
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                        />
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={inputId}
                                            onChange={e => setInputId(e.target.value)}
                                            className="relative px-6 py-4 rounded-xl bg-gray-800/80 text-white border-2 border-yellow-400/40 focus:outline-none focus:ring-4 focus:ring-yellow-400/30 focus:border-yellow-400/60 text-lg w-full backdrop-blur-xl transition-all duration-300 placeholder-gray-500"
                                            placeholder="Enter your project ID..."
                                            disabled={isLoading}
                                        />
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            <motion.div
                                                className="w-2 h-2 bg-yellow-400 rounded-full"
                                                animate={{ scale: [1, 1.5, 1] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                            />
                                        </div>
                                    </div>
                                    
                                    {idError && (
                                        <motion.div 
                                            className="text-red-400 font-medium bg-red-500/10 px-4 py-2 rounded-lg border border-red-400/30"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                        >
                                            {idError}
                                        </motion.div>
                                    )}
                                    
                                    {/* Enhanced button */}
                                    <motion.button
                                        type="submit"
                                        disabled={isLoading || !inputId.trim()}
                                        className="relative px-8 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold rounded-xl mt-2 hover:from-yellow-400 hover:to-amber-400 transition-all duration-200 text-lg w-full shadow-lg hover:shadow-yellow-500/25 overflow-hidden group"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {/* Button shine effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                        
                                        <span className="relative flex items-center justify-center gap-2">
                                            {isLoading ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent" />
                                                    <span>Checking...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
                                                    </svg>
                                                    <span>Analyze Repository</span>
                                                </>
                                            )}
                                        </span>
                                    </motion.button>
                                    
                                    {/* Helpful hint */}
                                    <div className="text-center text-gray-500 text-sm mt-2">
                                        <p>🔍 Your project ID can be found in your project management dashboard</p>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    ) : (
                        <div>
                            {/* Project Info */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gray-900/60 p-6 rounded-2xl shadow-2xl border border-yellow-400/20 backdrop-blur-xl mb-8"
                            >
                                <div className="mb-2 text-yellow-300 font-semibold">Project ID: {projectId}</div>
                                <div className="text-gray-400 text-sm">
                                    Repository analysis and AI chat assistant are now available for this project.
                                </div>
                            </motion.div>

                            {/* Mode Toggle */}
                            <div className="flex justify-center gap-4 mb-8">
                                <motion.button
                                    onClick={() => setAnalysisMode('analyze')}
                                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                                        analysisMode === 'analyze' 
                                            ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-lg' 
                                            : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60'
                                    }`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    📊 Repository Analysis
                                </motion.button>
                                <motion.button
                                    onClick={() => setAnalysisMode('chat')}
                                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                                        analysisMode === 'chat' 
                                            ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-lg' 
                                            : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60'
                                    }`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    💬 AI Chat Assistant
                                </motion.button>
                            </div>

                            {/* Analysis/Chat Content */}
                            {analysisMode === 'analyze' ? (
                                <RepositoryAnalyzer 
                                    onAnalysisComplete={setRepoData} 
                                    projectId={projectId}
                                />
                            ) : (
                                <RepoChatbot 
                                    repoData={repoData} 
                                    projectId={projectId}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Custom CSS for animations */}
            <style jsx>{`
                @keyframes gridMove {
                    0% { transform: translate(0, 0); }
                    100% { transform: translate(60px, 60px); }
                }

                @keyframes gradientShift {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
            `}</style>
        </div>
    );
}
