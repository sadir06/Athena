'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

async function validateProjectId(projectId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.github.com/repos/athena-service-account/${projectId}`);
    return response.ok;
  } catch {
    return false;
  }
}

export default function AuthenticationPage() {
  const [projectId, setProjectId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const isValid = await validateProjectId(projectId.trim());
    setIsLoading(false);

    if (isValid) {
      router.push(`/project-manage/${projectId.trim()}`);
    } else {
      setError('Invalid Project ID. Please check the repository exists under athena-service-account.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,215,0,0.05),transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,215,0,0.03),transparent_60%)]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 bg-gray-900/90 backdrop-blur-xl border border-yellow-400/30 rounded-3xl p-10 max-w-md w-full shadow-lg"
      >
        <motion.h1
          className="text-4xl font-bold mb-8 text-center"
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
          Project Authentication
        </motion.h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <input
            type="text"
            placeholder="Enter your project ID"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={isLoading}
            className="px-6 py-4 rounded-xl bg-gray-800/80 text-white border-2 border-yellow-400/40 focus:outline-none focus:ring-4 focus:ring-yellow-400/30 focus:border-yellow-400/60 text-lg backdrop-blur-xl transition-all duration-300 placeholder-gray-500"
            required
          />
          {error && (
            <motion.div
              className="text-red-400 font-medium bg-red-500/10 px-4 py-2 rounded-lg border border-red-400/30"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {error}
            </motion.div>
          )}
          <button
            type="submit"
            disabled={isLoading || !projectId.trim()}
            className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold rounded-xl hover:from-yellow-400 hover:to-amber-400 transition-all duration-200 text-lg shadow-lg hover:shadow-yellow-500/25 backdrop-blur-xl"
          >
            {isLoading ? 'Validating...' : 'Access Project'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
