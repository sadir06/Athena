'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useSearchParams } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

async function validateProjectId(projectId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.github.com/repos/athena-service-account/${projectId}`);
    return response.ok;
  } catch {
    return false;
  }
}

function ChangeRequestContent() {
  const searchParams = useSearchParams();
  const [projectId, setProjectId] = useState<string>('');
  const [inputId, setInputId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [idError, setIdError] = useState<string>('');
  const [changeStatus, setChangeStatus] = useState<string | null>(null);
  const [isApplyingChange, setIsApplyingChange] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check for projectId in URL parameters on component mount
  useEffect(() => {
    const urlProjectId = searchParams.get('projectId');
    if (urlProjectId) {
      console.log('🔗 Project ID found in URL:', urlProjectId);
      setProjectId(urlProjectId);
      setInputId(urlProjectId);
    }
  }, [searchParams]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleProjectIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIdError('');
    
    try {
      const isValid = await validateProjectId(inputId);
      if (isValid) {
        setProjectId(inputId);
        console.log('✅ Project ID validated successfully!');
      } else {
        setIdError('Invalid Project ID. Please check the repository exists under athena-service-account.');
        console.log('❌ Project ID validation failed');
      }
    } catch (err) {
      setIdError('Error validating Project ID. Please try again.');
      console.error('🚨 Error validating project ID:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !projectId) return;
    
    setIsLoading(true);
    const userMessage = input.trim();
    setInput('');
    
    // Add user message immediately
    const newMessages: Message[] = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    
    try {
      console.log('💬 Sending message to Change Request Agent...');
      
      const res = await fetch('/api/quick-generators/cr-overview-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectData: `Project ID: ${projectId}`,
          changeRequest: userMessage,
          history: newMessages
        })
      });
      
      const data = await res.json() as { text?: string };
      
      if (data.text) {
        setMessages([...newMessages, { role: 'assistant' as const, content: data.text }]);
      } else {
        setMessages([...newMessages, { role: 'assistant' as const, content: 'I apologize, but I encountered an error. Please try again.' }]);
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant' as const, content: 'I apologize, but I\'m having trouble processing your request right now. Please try again!' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyChange = async () => {
    if (!projectId) return;
    
    setIsApplyingChange(true);
    setChangeStatus(null);
    
    try {
      // Get the latest user message as the change request
      const latestUserMessage = [...messages].reverse().find(m => m.role === 'user');
      if (!latestUserMessage) {
        setChangeStatus('❌ No change request found. Please chat with the agent first.');
        return;
      }
      
      const res = await fetch('/api/update-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoId: projectId,
          changeRequest: latestUserMessage.content,
          projectContext: 'Next.js frontend project'
        })
      });
      
      const data = await res.json() as { success: boolean; message?: string; error?: string; changes?: Array<{ path: string; action: string }> };
      
      if (data.success) {
        setChangeStatus(`✅ ${data.message} Changes: ${data.changes?.map(c => `${c.action} ${c.path}`).join(', ') || 'No changes'}`);
      } else {
        setChangeStatus(`❌ Failed to apply change: ${data.error}`);
      }
    } catch (err) {
      setChangeStatus('❌ Failed to apply change: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsApplyingChange(false);
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
              Change Request Agent
            </motion.h1>
            <span className="invisible group-hover:visible absolute top-full mt-2 left-0 bg-gray-900/90 backdrop-blur-xl text-yellow-200 text-xs rounded-lg py-2 px-3 border border-yellow-400/20">
              Strategic AI code generation for your projects 🏛️
            </span>
          </div>
          
          {projectId && messages.length > 0 && (
            <motion.button
              onClick={handleApplyChange}
              disabled={isApplyingChange || !messages.some(m => m.role === 'user')}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold rounded-xl transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 shadow-lg hover:shadow-green-500/25 backdrop-blur-sm border border-green-400/20 flex items-center gap-2"
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {isApplyingChange ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Applying...</span>
                </>
              ) : (
                <>
                  🚀 Send Change
                </>
              )}
            </motion.button>
          )}
        </motion.header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
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
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </motion.div>
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-yellow-300 mb-2">Project Access</h3>
                        <p className="text-gray-400 text-sm">Enter your project ID to begin</p>
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
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            <span>Start Project</span>
                          </>
                        )}
                      </span>
                    </motion.button>
                    
                    {/* Helpful hint */}
                    <div className="text-center text-gray-500 text-sm mt-2">
                      <p>💡 Your project ID can be found in your project management dashboard</p>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            ) : (
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-900/60 p-6 rounded-2xl shadow-2xl border border-yellow-400/20 backdrop-blur-xl"
                >
                  <div className="mb-2 text-yellow-300 font-semibold">Project ID: {projectId}</div>
                  <div className="text-gray-400 text-sm">
                    Chat with Athena's Change Request Agent to describe the changes you want. Be specific about what files to create or modify!
                  </div>
                </motion.div>

                {/* Messages */}
                <div className="space-y-4">
                  {messages.map((message, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-6 rounded-2xl shadow-xl border backdrop-blur-xl ${
                        message.role === "user" 
                          ? "bg-gray-700/60 text-white border-gray-400/30" 
                          : "bg-yellow-500/10 text-yellow-200 border-yellow-400/30"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.role === "user" ? "bg-gray-500" : "bg-yellow-500"
                        }`}>
                          <span className="text-white font-bold text-sm">
                            {message.role === "user" ? "U" : "A"}
                          </span>
                        </div>
                        <div className="flex-1">
                          <span className="font-bold mr-2">
                            {message.role === "user" ? "You:" : "Athena:"}
                          </span>
                          <span>
                            {message.role === "assistant" ? (
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            ) : (
                              message.content
                            )}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {isLoading && (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="text-yellow-300 text-center py-4"
                    >
                      Athena is thinking...
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                    className="flex-1 px-4 py-3 rounded-xl bg-gray-800 text-white border border-yellow-400/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 text-lg shadow-sm backdrop-blur-xl"
                    placeholder="Describe your change request... (e.g., Create a new index.html page with a blue background)"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim()}
                    className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold rounded-xl hover:from-yellow-400 hover:to-amber-400 transition-all duration-200 text-lg shadow-lg backdrop-blur-xl"
                  >
                    Send
                  </button>
                </motion.div>
                
                {changeStatus && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl text-center font-semibold backdrop-blur-xl ${
                      changeStatus.startsWith('✅') 
                        ? 'bg-green-500/20 text-green-400 border border-green-400/30' 
                        : 'bg-red-500/20 text-red-400 border border-red-400/30'
                    }`}
                  >
                    {changeStatus}
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }
      `}</style>
    </div>
  );
}

export default function ChangeRequestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-6"></div>
          <p className="text-gray-300 text-lg">Loading Change Request Agent...</p>
        </div>
      </div>
    }>
      <ChangeRequestContent />
    </Suspense>
  );
} 