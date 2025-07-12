'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface RepoChatbotProps {
    repoData: any;
    projectId?: string;
}

interface ChatMessage {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function RepoChatbot({ repoData, projectId }: RepoChatbotProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (repoData) {
            // Add welcome message when repo data is available
            const repoName = projectId || 'this repository';
            setMessages([{
                id: 'welcome',
                type: 'assistant',
                content: `Hello! I'm your AI assistant for the **${repoName}** repository. I have analyzed the codebase and can help you understand:\n\n• Tech stack and architecture\n• File structure and key components\n• Setup instructions and development workflow\n• Any specific questions about the codebase\n\nWhat would you like to know about this project?`,
                timestamp: new Date()
            }]);
        }
    }, [repoData, projectId]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !repoData) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'user',
            content: inputMessage,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            console.log("💬 Sending chat message - let's dive deeper into this codebase!");
            const response = await fetch('/api/repo-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: inputMessage,
                    repoData: repoData,
                    projectId: projectId,
                    conversationHistory: messages.map(msg => ({
                        role: msg.type === 'user' ? 'user' : 'assistant',
                        content: msg.content
                    }))
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json() as { response: string };
            console.log("🤖 Chat response received - the AI wisdom flows!");

            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                content: data.response,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
            console.error("🚨 Chat failed:", err);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                content: 'Sorry, I encountered an error while processing your question. Please try again.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!repoData) {
        return (
            <div className="text-center py-12">
                <div className="p-6 bg-gray-900/40 backdrop-blur-xl border border-yellow-400/20 rounded-xl max-w-md mx-auto">
                    <h3 className="text-xl font-bold text-yellow-400 mb-4">💬 Repository Chat</h3>
                    <p className="text-gray-300 mb-4">
                        First, analyze a repository to enable the chat feature.
                    </p>
                    <p className="text-gray-400 text-sm">
                        Switch to "Repository Analysis" mode and analyze a GitHub repository to start chatting about it.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[600px] bg-gray-900/40 backdrop-blur-xl border border-yellow-400/20 rounded-xl overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b border-yellow-400/20 bg-gray-800/40">
                <h3 className="text-lg font-bold text-yellow-400">💬 Repository Chat Assistant</h3>
                <p className="text-gray-400 text-sm">Ask me anything about this codebase!</p>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] p-3 rounded-xl ${
                                message.type === 'user'
                                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black'
                                    : 'bg-gray-800/60 border border-gray-600/30 text-gray-200'
                            }`}
                        >
                            <div className="prose prose-invert prose-yellow max-w-none">
                                {message.type === 'assistant' ? (
                                    <ReactMarkdown 
                                        components={{
                                            h1: ({children}) => <h1 className="text-lg font-bold text-yellow-400 mb-2">{children}</h1>,
                                            h2: ({children}) => <h2 className="text-base font-bold text-yellow-300 mb-2">{children}</h2>,
                                            h3: ({children}) => <h3 className="text-sm font-bold text-yellow-200 mb-1">{children}</h3>,
                                            p: ({children}) => <p className="text-gray-200 leading-relaxed mb-2">{children}</p>,
                                            ul: ({children}) => <ul className="list-disc list-inside text-gray-200 mb-2 space-y-1">{children}</ul>,
                                            ol: ({children}) => <ol className="list-decimal list-inside text-gray-200 mb-2 space-y-1">{children}</ol>,
                                            li: ({children}) => <li className="text-gray-200">{children}</li>,
                                            strong: ({children}) => <strong className="font-bold text-yellow-300">{children}</strong>,
                                            em: ({children}) => <em className="italic text-yellow-200">{children}</em>,
                                            code: ({children}) => <code className="bg-gray-700/50 px-1 py-0.5 rounded text-xs text-yellow-200 font-mono">{children}</code>,
                                            pre: ({children}) => <pre className="bg-gray-700/50 p-2 rounded text-xs text-yellow-200 font-mono overflow-x-auto mb-2">{children}</pre>,
                                            blockquote: ({children}) => <blockquote className="border-l-2 border-yellow-400/50 pl-2 italic text-gray-300 mb-2">{children}</blockquote>,
                                        }}
                                    >
                                        {message.content}
                                    </ReactMarkdown>
                                ) : (
                                    <div className="whitespace-pre-wrap">{message.content}</div>
                                )}
                            </div>
                            <div className={`text-xs mt-2 ${
                                message.type === 'user' ? 'text-black/70' : 'text-gray-400'
                            }`}>
                                {formatTime(message.timestamp)}
                            </div>
                        </div>
                    </motion.div>
                ))}

                {/* Loading Indicator */}
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                    >
                        <div className="bg-gray-800/60 border border-gray-600/30 text-gray-200 p-3 rounded-xl">
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent"></div>
                                <span className="text-sm">AI is thinking...</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Section */}
            <div className="p-4 border-t border-yellow-400/20 bg-gray-800/40">
                <div className="flex gap-3">
                    <textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask a question about the repository..."
                        rows={1}
                        className="flex-1 bg-gray-900/60 backdrop-blur-xl border border-yellow-400/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all duration-200 resize-none"
                        disabled={isLoading}
                    />
                    <motion.button
                        onClick={handleSendMessage}
                        disabled={isLoading || !inputMessage.trim()}
                        className="px-4 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 disabled:from-gray-600 disabled:to-gray-700 text-black font-bold rounded-xl transition-all duration-200 disabled:cursor-not-allowed shadow-lg hover:shadow-yellow-500/25 backdrop-blur-sm border border-yellow-400/20"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
                        ) : (
                            '➤'
                        )}
                    </motion.button>
                </div>
                
                {/* Quick Questions */}
                <div className="mt-3 flex flex-wrap gap-2">
                    {[
                        "What's the main tech stack?",
                        "How do I set this up?",
                        "What's the architecture?",
                        "Key files to understand?"
                    ].map((question, index) => (
                        <button
                            key={index}
                            onClick={() => setInputMessage(question)}
                            disabled={isLoading}
                            className="px-3 py-1 bg-gray-700/60 hover:bg-gray-600/60 disabled:bg-gray-800/40 text-gray-300 text-xs rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                        >
                            {question}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
} 