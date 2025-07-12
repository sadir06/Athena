'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { FaRocket, FaTrash, FaPaperPlane, FaLightbulb, FaBrain, FaChartLine, FaQuestionCircle, FaProjectDiagram } from 'react-icons/fa';
import MicrophoneButton from '../components/MicrophoneButton';

interface BaseMessage {
    role: 'user' | 'assistant';
    content: string;
    tags?: Record<string, string[]>;
}

interface StreamApiResponse {
    text: string;
    tags?: Record<string, string[]>;
}

interface CreateProjectResponse {
    projectId: string;
    title: string;
    status: string;
    ec2Data?: any;
}

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

interface CollapsibleCardProps extends CardProps {
    title: string;
    icon?: React.ReactNode;
}

const Card = ({ children, className = '', ...props }: CardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 rounded-2xl backdrop-blur-xl border ${className}`}
        {...props}
    >
        <div className="prose prose-invert prose-yellow max-w-none">
            {children}
        </div>
    </motion.div>
);

const CollapsibleCard = ({ children, title, icon, className = '', ...props }: CollapsibleCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl backdrop-blur-xl border ${className}`}
            {...props}
        >
            <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex justify-between items-center hover:bg-yellow-500/5 transition-all duration-200 rounded-t-2xl"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
            >
                <div className="flex items-center gap-3">
                    {icon && <span className="text-yellow-400">{icon}</span>}
                    <span className="text-sm font-medium text-gray-200">{title}</span>
                </div>
                <motion.span 
                    className="text-yellow-400"
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    ▼
                </motion.span>
            </motion.button>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        className="p-6 prose prose-invert prose-yellow max-w-none border-t border-yellow-400/20"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default function OverviewGeneratorPage() {
    const router = useRouter();
    const [messages, setMessages] = useState<BaseMessage[]>([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [conversationId, setConversationId] = useState<string>('');
    const [currentTags, setCurrentTags] = useState({
        currentTag: ''
    });
    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [hasInitialPrompt, setHasInitialPrompt] = useState(false);

    // Ref flag to ensure we send the saved prompt only once.
    const savedPromptSentRef = useRef(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Extract project overview and title from message content
    const extractProjectData = (content: string) => {
        const projectOverviewMatch = content.match(/<project-overview>([\s\S]*?)<\/project-overview>/);
        const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/);
        
        return {
            projectOverview: projectOverviewMatch ? projectOverviewMatch[1].trim() : null,
            title: titleMatch ? titleMatch[1].trim() : null
        };
    };

    const handleStream = useCallback(async (content: string) => {
        setIsStreaming(true);
        const newMessage: BaseMessage = { role: 'user', content };
        const updatedMessages = [...messages, newMessage];
        
        // Immediately add user message to display
        setMessages(updatedMessages);

        try {
            const response = await fetch('/api/overview-generator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: content,
                    history: updatedMessages.map(msg => ({
                        role: msg.role,
                        content: msg.content,
                        tags: msg.tags || {}
                    }))
                })
            });

            const data = await response.json() as StreamApiResponse;
            console.log("🔍 API response data:", data);
            console.log("📦 API response tags:", data.tags);

            const assistantMessage: BaseMessage = {
                role: 'assistant' as const,
                content: data.text,
                tags: data.tags || {}
            };

            console.log("🤖 Created assistant message:", assistantMessage);

            // Add assistant message to the conversation
            setMessages([...updatedMessages, assistantMessage]);

            if (data.tags?.projectoverview && data.tags.projectoverview.length > 0) {
                console.log("📋 Project Overview detected!");
                setCurrentTags({ currentTag: 'projectoverview' });
            }

        } catch (error) {
            console.error("❌ Error in conversation:", error);
            // Add error message to conversation
            const errorMessage: BaseMessage = {
                role: 'assistant' as const,
                content: "I apologize, but I'm having trouble processing your request right now. Please try again! 🏛️",
                tags: {}
            };
            setMessages([...updatedMessages, errorMessage]);
        } finally {
            setIsStreaming(false);
            setInput('');
        }
    }, [messages]);

    useEffect(() => {
        if (typeof window === 'undefined') return; // Check if we're on the client side
        
        const savedPrompt = localStorage.getItem('draftIdea');
        setHasInitialPrompt(!!savedPrompt);
        
        if (!savedPrompt || savedPromptSentRef.current) return;

        console.log("🎭 Athena's wisdom awakens - processing your idea:",
            savedPrompt ? `"${savedPrompt.slice(0, 50)}..."` : "none - the void speaks silence!");

        setConversationId("default");
        savedPromptSentRef.current = true;
        handleStream(savedPrompt);
    }, [handleStream]);

    // Auto-scroll to bottom when new messages are added
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleReset = async () => {
        console.log("🔄 Resetting conversation - clearing the strategic battlefield for fresh insights! 🏛️");
        setMessages([]);
        setCurrentTags({ currentTag: '' });
        savedPromptSentRef.current = false;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('draftIdea');
        }
    };

    const handleSubmit = () => {
        if (!input.trim()) return;
        handleStream(input);
    };

    const handleTranscriptionComplete = (transcribedText: string) => {
        console.log("🎤 Transcription received:", transcribedText.substring(0, 30) + "... - adding to input field!");
        setInput(prev => prev + (prev ? ' ' : '') + transcribedText);
    };

    // Handle create project from specific message
    const handleCreateProjectFromMessage = async (messageContent: string) => {
        setIsCreatingProject(true);
        console.log("🚀 Creating project from specific message - Athena's targeted wisdom! 🎯");
        
        const { projectOverview, title } = extractProjectData(messageContent);
        
        if (!projectOverview || !title) {
            console.error("❌ Missing project overview or title in message");
            setIsCreatingProject(false);
            return;
        }

        try {
            const response = await fetch('/api/create-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectoverview: projectOverview,
                    stack: "next-on-pages",
                    deployment: "cloudflare",
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create project');
            }

            const data = await response.json() as CreateProjectResponse;
            console.log("🔍 Project creation response:", data);
            console.log("🔑 Project ID:", data.projectId);

            if (typeof window !== 'undefined') {
                localStorage.removeItem('draftIdea');
            }
            console.log("🎉 Project creation successful! Athena's targeted strategy prevails! 🏛️");

            // Navigate to project management page
            router.push(`/project-manage/${data.projectId}`);

        } catch (error) {
            console.error("🚨 Error creating project:", error);
        } finally {
            setIsCreatingProject(false);
        }
    };

    // Handle general create project (for header button)
    const handleCreateProject = async () => {
        setIsCreatingProject(true);
        console.log("🚀 Athena initiates general project creation - strategic deployment commencing! 🏛️");
        
        // Find the last message with a projectoverview or project tag, or use fallback
        const lastMessageWithOverview = [...messages].reverse()
            .find(msg => {
                return msg.tags &&
                    ((Array.isArray(msg.tags.projectoverview) && msg.tags.projectoverview.length > 0) ||
                        (Array.isArray(msg.tags.project) && msg.tags.project.length > 0));
            });

        const projectOverview = lastMessageWithOverview?.tags?.projectoverview?.[0] ||
            lastMessageWithOverview?.tags?.project?.[0] ||
            "Mock Project Overview: This is a strategic application built with Athena's wisdom. Features include modern architecture, user-friendly design, and scalable infrastructure. Perfect for demonstrating the power of AI-assisted development.";

        try {
            const response = await fetch('/api/create-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectoverview: projectOverview,
                    stack: "next-on-pages",
                    deployment: "cloudflare",
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create project');
            }

            const data = await response.json() as CreateProjectResponse;
            console.log("🔍 Project creation response:", data);
            console.log("🔑 Project ID:", data.projectId);

            if (typeof window !== 'undefined') {
                localStorage.removeItem('draftIdea');
            }
            console.log("🎉 Project creation successful! Athena's strategic vision becomes reality! 🏛️");

            // Navigate to project management page
            router.push(`/project-manage/${data.projectId}`);

        } catch (error) {
            console.error("🚨 Error creating project:", error);
        } finally {
            setIsCreatingProject(false);
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

            <div className="flex-1 flex flex-col h-screen relative z-10">
                {/* Header */}
                <motion.header 
                    className="border-b border-yellow-400/20 p-6 flex justify-between items-center backdrop-blur-xl bg-black/40"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="relative group">
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
                            Athena Overview Generator
                        </motion.h1>
                        <span className="invisible group-hover:visible absolute top-full mt-2 left-0 bg-gray-900/90 backdrop-blur-xl text-yellow-200 text-xs rounded-lg py-2 px-3 border border-yellow-400/20">
                            Strategic AI wisdom for your project ideas 🏛️
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <motion.button
                            onClick={handleCreateProject}
                            disabled={isCreatingProject}
                            className="relative px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold rounded-xl
                                     transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 shadow-lg hover:shadow-yellow-500/25 backdrop-blur-sm border border-yellow-400/20 flex items-center gap-2"
                            whileHover={{ scale: 1.05, y: -1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <FaRocket className="size-4" />
                            <span className={`transition-opacity ${isCreatingProject ? 'opacity-0' : 'opacity-100'}`}>
                                Create Project
                            </span>
                            {isCreatingProject && (
                                <motion.div
                                    className="absolute inset-0 flex items-center justify-center"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
                                </motion.div>
                            )}
                        </motion.button>
                        <motion.button
                            onClick={handleReset}
                            className="px-4 py-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-all duration-200 border border-red-500/20 flex items-center gap-2 backdrop-blur-sm"
                            disabled={isStreaming}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <FaTrash className="size-4" />
                            Reset
                        </motion.button>
                    </div>
                </motion.header>
                
                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.length === 0 && !hasInitialPrompt && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gray-900/40 backdrop-blur-xl p-8 rounded-2xl border border-yellow-400/20 text-center"
                        >
                            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <FaLightbulb className="text-black text-2xl" />
                            </div>
                            <h3 className="text-2xl font-bold text-yellow-400 mb-4">
                                🏛️ Athena's Strategic Council
                            </h3>
                            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                                Share your project vision with Athena. Describe your idea, goals, and requirements. 
                                Strategic wisdom will transform your concept into a comprehensive project overview.
                            </p>
                        </motion.div>
                    )}

                    {messages.map((message, idx) => (
                        <div key={idx} className="space-y-6">
                            {message.role === 'user' && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-gray-500/10 backdrop-blur-xl p-6 rounded-2xl border border-gray-400/30"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0">
                                            <span className="text-white font-bold text-sm">U</span>
                                        </div>
                                        <pre className="whitespace-pre-wrap font-mono text-gray-200 flex-1">
                                            {message.content}
                                        </pre>
                                    </div>
                                </motion.div>
                            )}

                            {message.role === 'assistant' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        {message.tags?.reasoning?.map((content, idx) => (
                                            <CollapsibleCard
                                                key={`reasoning-${idx}`}
                                                title="Strategic Reasoning"
                                                icon={<FaBrain />}
                                                className="bg-yellow-500/5 border-yellow-400/30"
                                            >
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
                                                    {content}
                                                </ReactMarkdown>
                                            </CollapsibleCard>
                                        ))}

                                        {message.tags?.analysis?.map((content, idx) => (
                                            <Card key={`analysis-${idx}`} className="bg-gray-500/5 border-gray-400/30">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <FaChartLine className="text-gray-400" />
                                                    <span className="text-gray-400 font-medium">Technical Analysis</span>
                                                </div>
                                                <ReactMarkdown 
                                                    components={{
                                                        h1: ({children}) => <h1 className="text-2xl font-bold text-gray-300 mb-4">{children}</h1>,
                                                        h2: ({children}) => <h2 className="text-xl font-bold text-gray-200 mb-3">{children}</h2>,
                                                        h3: ({children}) => <h3 className="text-lg font-bold text-gray-100 mb-2">{children}</h3>,
                                                        p: ({children}) => <p className="text-gray-200 leading-relaxed mb-4">{children}</p>,
                                                        ul: ({children}) => <ul className="list-disc list-inside text-gray-200 mb-4 space-y-1">{children}</ul>,
                                                        ol: ({children}) => <ol className="list-decimal list-inside text-gray-200 mb-4 space-y-1">{children}</ol>,
                                                        li: ({children}) => <li className="text-gray-200">{children}</li>,
                                                        strong: ({children}) => <strong className="font-bold text-gray-100">{children}</strong>,
                                                        em: ({children}) => <em className="italic text-gray-200">{children}</em>,
                                                        code: ({children}) => <code className="bg-gray-700/50 px-2 py-1 rounded text-sm text-gray-100 font-mono">{children}</code>,
                                                        pre: ({children}) => <pre className="bg-gray-700/50 p-4 rounded-lg text-sm text-gray-100 font-mono overflow-x-auto mb-4">{children}</pre>,
                                                        blockquote: ({children}) => <blockquote className="border-l-4 border-gray-400/50 pl-4 italic text-gray-300 mb-4">{children}</blockquote>,
                                                    }}
                                                >
                                                    {content}
                                                </ReactMarkdown>
                                            </Card>
                                        ))}

                                        {message.tags?.quiz?.map((content, idx) => (
                                            <Card key={`quiz-${idx}`} className="bg-yellow-500/5 border-yellow-400/30">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <FaQuestionCircle className="text-yellow-400" />
                                                    <span className="text-yellow-400 font-medium">Clarifying Questions</span>
                                                </div>
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
                                                    {content}
                                                </ReactMarkdown>
                                            </Card>
                                        ))}

                                        {message.tags?.projectoverview?.map((content, idx) => (
                                            <Card key={`projectoverview-${idx}`} className="bg-yellow-500/5 border-yellow-400/30">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <FaProjectDiagram className="text-yellow-400" />
                                                    <span className="text-yellow-400 font-medium">Project Overview</span>
                                                </div>
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
                                                    {content}
                                                </ReactMarkdown>
                                                <div className="flex gap-2 mt-4 pt-4 border-t border-yellow-400/20">
                                                    <span className="px-3 py-1 bg-yellow-500/10 text-yellow-200 text-xs rounded-lg font-medium border border-yellow-400/20">
                                                        Stack: next-on-pages
                                                    </span>
                                                    <span className="px-3 py-1 bg-orange-500/10 text-orange-200 text-xs rounded-lg font-medium border border-orange-400/20">
                                                        Deployment: Cloudflare
                                                    </span>
                                                </div>
                                            </Card>
                                        ))}

                                        {message.tags?.project?.map((content, idx) => (
                                            <Card key={`project-${idx}`} className="bg-yellow-500/5 border-yellow-400/30">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <FaProjectDiagram className="text-yellow-400" />
                                                    <span className="text-yellow-400 font-medium">Project Specification</span>
                                                </div>
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
                                                    {content}
                                                </ReactMarkdown>
                                                <div className="flex gap-2 mt-4 pt-4 border-t border-yellow-400/20">
                                                    <span className="px-3 py-1 bg-yellow-500/10 text-yellow-200 text-xs rounded-lg font-medium border border-yellow-400/20">
                                                        Stack: next-on-pages
                                                    </span>
                                                    <span className="px-3 py-1 bg-orange-500/10 text-orange-200 text-xs rounded-lg font-medium border border-orange-400/20">
                                                        Deployment: Cloudflare
                                                    </span>
                                                </div>
                                            </Card>
                                        ))}

                                        {/* Always show the full assistant response */}
                                        <Card className="bg-gray-900/40 border-gray-600/30">
                                            <div className="flex items-start gap-3 mb-4">
                                                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <span className="text-black font-bold text-sm">A</span>
                                                </div>
                                                <div className="flex-1">
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
                                                        {message.content}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                            
                                            {/* Check if this message has both project-overview and title tags */}
                                            {(() => {
                                                const { projectOverview, title } = extractProjectData(message.content);
                                                if (projectOverview && title) {
                                                    return (
                                                        <div className="mt-6 pt-6 border-t border-yellow-400/20">
                                                            <div className="flex items-center justify-between">
                                                                <div className="text-sm text-gray-300">
                                                                    <p className="font-medium text-yellow-400"><strong>Project:</strong> {title}</p>
                                                                    <p className="text-gray-400">Ready for deployment</p>
                                                                </div>
                                                                <motion.button
                                                                    onClick={() => handleCreateProjectFromMessage(message.content)}
                                                                    disabled={isCreatingProject}
                                                                    className="relative px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold rounded-xl
                                                                             transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 shadow-lg hover:shadow-green-500/25 backdrop-blur-sm border border-green-400/20 flex items-center gap-2"
                                                                    whileHover={{ scale: 1.05, y: -1 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                >
                                                                    <FaRocket className="size-4" />
                                                                    <span className={`transition-opacity ${isCreatingProject ? 'opacity-0' : 'opacity-100'}`}>
                                                                        Create This Project
                                                                    </span>
                                                                    {isCreatingProject && (
                                                                        <motion.div
                                                                            className="absolute inset-0 flex items-center justify-center"
                                                                            initial={{ opacity: 0 }}
                                                                            animate={{ opacity: 1 }}
                                                                        >
                                                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                                                        </motion.div>
                                                                    )}
                                                                </motion.button>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </Card>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {isStreaming && (
                        <motion.div 
                            className="flex justify-center items-center my-8"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="flex items-center space-x-4 bg-gray-900/40 backdrop-blur-xl p-6 rounded-2xl border border-yellow-400/20">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400"></div>
                                <p className="text-yellow-200 font-medium">Athena channels strategic wisdom – brilliant insights incoming! 🏛️</p>
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                {/* Input Section */}
                <motion.div 
                    className="border-t border-yellow-400/20 p-6 backdrop-blur-xl bg-black/40"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                                placeholder="Share your strategic vision with Athena..."
                                className="w-full bg-gray-900/60 backdrop-blur-xl border border-yellow-400/20 rounded-xl pl-4 pr-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all duration-200"
                                disabled={isStreaming}
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10">
                                <MicrophoneButton
                                    onTranscriptionComplete={handleTranscriptionComplete}
                                    disabled={isStreaming}
                                    className="w-8 h-8"
                                />
                            </div>
                        </div>
                        <motion.button
                            onClick={handleSubmit}
                            disabled={!input.trim() || isStreaming}
                            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 disabled:from-gray-600 disabled:to-gray-700 text-black font-bold rounded-xl transition-all duration-200 disabled:cursor-not-allowed shadow-lg hover:shadow-yellow-500/25 backdrop-blur-sm border border-yellow-400/20 flex items-center gap-2"
                            whileHover={{ scale: 1.05, y: -1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <FaPaperPlane className="size-4" />
                            Send
                        </motion.button>
                    </div>
                </motion.div>
            </div>

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