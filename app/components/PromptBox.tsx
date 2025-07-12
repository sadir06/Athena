'use client';

import { useState, useRef } from 'react';
import { FaLightbulb, FaSearch, FaRocket } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { fetchRandomIdea } from '@/lib/utils';
import MicrophoneButton from './MicrophoneButton';

interface PromptBoxProps {
  onSubmit: (idea: string) => void;
  onGoToProject?: (projectId: string) => Promise<void>;
  isCheckingProject?: boolean;
}

export default function PromptBox({ onSubmit, onGoToProject, isCheckingProject }: PromptBoxProps) {
  const [idea, setIdea] = useState('');
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [goToProjectError, setGoToProjectError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("💡 Athena idea submitted:", idea.substring(0, 30) + "... Time to weave some strategic magic!");
    
    if (idea.trim()) {
      onSubmit(idea);
    }
  };

  const handleGoToProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoToProjectError("");
    if (idea.trim() && onGoToProject) {
      onGoToProject(idea);
    }
  };

  const handleGenerateIdea = async () => {
    setIsGeneratingIdea(true);
    
    try {
      const generatedIdea = await fetchRandomIdea();
      setIdea(generatedIdea);
      
      // Focus the textarea after setting the idea
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } finally {
      setIsGeneratingIdea(false);
    }
  };

  const handleTranscriptionComplete = (transcribedText: string) => {
    console.log("🎤 Transcription received:", transcribedText.substring(0, 30) + "... - adding to idea field!");
    setIdea(prev => prev + (prev ? ' ' : '') + transcribedText);
    
    // Focus the textarea after adding transcribed text
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  return (
    <motion.div 
      className="w-full max-w-5xl mx-auto" // Increased max-w-4xl to max-w-5xl for more width
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <form onSubmit={handleSubmit} className="relative rounded-2xl border border-yellow-400/20 bg-gray-900/60 backdrop-blur-xl shadow-2xl hover:shadow-yellow-500/10 transition-all duration-300 overflow-hidden">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-amber-500/5 rounded-2xl"></div>
        
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            className="w-full min-h-[140px] resize-none rounded-t-2xl bg-transparent text-white p-6 pl-16 border-0 outline-none focus:ring-2 focus:ring-yellow-400/50 text-lg placeholder-gray-400 backdrop-blur-sm"
            placeholder="✨ Describe your next brilliant app idea, or drop in a project ID to revisit your digital masterpiece! Athena's ready to architect your vision or guide you back to greatness. 🏛️"
          />
          <div className="absolute left-4 top-4 z-10">
            <MicrophoneButton
              onTranscriptionComplete={handleTranscriptionComplete}
              disabled={isGeneratingIdea}
              className="w-8 h-8"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center p-4 border-t border-yellow-400/20 bg-gray-800/40 backdrop-blur-sm gap-4 md:gap-8 justify-between"> {/* More gap and justify-between for button separation */}
          <div className="flex items-center gap-4 md:gap-6 flex-1">
            <motion.button
              type="button"
              onClick={handleGenerateIdea}
              disabled={isGeneratingIdea}
              className="relative text-gray-300 hover:text-white px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 backdrop-blur-sm border border-yellow-400/10 hover:border-transparent overflow-hidden group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Rainbow glow background */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 group-hover:animate-pulse"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm"></div>
              <div className="relative z-10 flex items-center gap-2">
              {isGeneratingIdea ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-yellow-400" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <FaLightbulb className="size-4" />
                  <span>Random Idea</span>
                </>
              )}
              </div>
            </motion.button>
          </div>

          <div className="flex items-center gap-4 md:gap-6 flex-shrink-0">
            {onGoToProject && (
              <motion.button
                type="button"
                onClick={handleGoToProject}
                disabled={!idea.trim() || isCheckingProject}
                className="relative px-4 py-2 bg-gray-700/60 hover:bg-gray-600/60 disabled:bg-gray-800/40 disabled:cursor-not-allowed text-gray-200 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg flex items-center gap-2 backdrop-blur-sm border border-gray-600/30 hover:border-gray-500/50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isCheckingProject ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <FaSearch className="size-4" />
                    <span>Go to Project</span>
                  </>
                )}
              </motion.button>
            )}
            {goToProjectError && (
              <span className="text-red-400 font-medium ml-2">{goToProjectError}</span>
            )}
            
            <motion.button
              type="submit"
              disabled={!idea.trim()}
              className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-black rounded-xl font-semibold transition-all duration-200 hover:shadow-lg flex items-center gap-2 shadow-yellow-500/25"
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaRocket className="size-4" />
              <span>Generate</span>
            </motion.button>
          </div>
        </div>
      </form>
    </motion.div>
  );
} 