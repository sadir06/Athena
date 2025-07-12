'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import PromptBox from '@/components/PromptBox';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// Array of witty phrases for Athena
const athenaPhrases = [
  "Wisdom meets innovation. Let's build something extraordinary together.",
  "From ancient wisdom to modern solutions. Your ideas deserve the best.",
  "Strategic thinking, powerful execution. Ready to transform your vision?",
  "Athena's ready to help you architect the future. What's your move?",
  "Smart decisions, smarter code. Let's make magic happen.",
  "Your ideas have potential. Let's unleash their full power.",
  "From concept to creation, Athena guides the way. What's your vision?",
  "Strategic innovation starts here. Ready to build something amazing?",
  "Wise solutions for modern problems. Let's get started!",
  "Every great app starts with a great idea. What's yours?"
];

export default function Home() {
  const router = useRouter();
  const [randomPhrase, setRandomPhrase] = useState<string>("");
  const [isCheckingProject, setIsCheckingProject] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    console.log("🏛️ Athena homepage loaded! Ready to channel some wisdom into code! 🦉");
    
    // Select a random phrase
    const randomIndex = Math.floor(Math.random() * athenaPhrases.length);
    setRandomPhrase(athenaPhrases[randomIndex]);
    console.log(`🎲 Selected Athena phrase #${randomIndex + 1}: ${athenaPhrases[randomIndex].substring(0, 50)}...`);
  }, []);

  // Professional Particle System
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Professional Particle system
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      color: string;
      type: "star" | "sparkle" | "glow";
    }> = [];

    // Initialize particles
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 3 + 0.5,
        opacity: Math.random() * 0.6 + 0.1,
        color: ["#FFD700", "#FFA500", "#FF8C00"][
          Math.floor(Math.random() * 3)
        ],
        type: ["star", "sparkle", "glow"][
          Math.floor(Math.random() * 3)
        ] as "star" | "sparkle" | "glow",
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Draw different particle types
        if (particle.type === "star") {
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
            const x = particle.x + Math.cos(angle) * particle.size;
            const y = particle.y + Math.sin(angle) * particle.size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fillStyle = particle.color;
          ctx.globalAlpha = particle.opacity;
          ctx.fill();
        } else if (particle.type === "sparkle") {
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fillStyle = particle.color;
          ctx.globalAlpha = particle.opacity;
          ctx.fill();

          // Add sparkle lines
          ctx.beginPath();
          ctx.moveTo(particle.x - particle.size * 2, particle.y);
          ctx.lineTo(particle.x + particle.size * 2, particle.y);
          ctx.moveTo(particle.x, particle.y - particle.size * 2);
          ctx.lineTo(particle.x, particle.y + particle.size * 2);
          ctx.strokeStyle = particle.color;
          ctx.globalAlpha = particle.opacity * 0.5;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          // Glow effect
          const gradient = ctx.createRadialGradient(
            particle.x,
            particle.y,
            0,
            particle.x,
            particle.y,
            particle.size * 3,
          );
          gradient.addColorStop(0, particle.color);
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
          ctx.globalAlpha = particle.opacity * 0.3;
          ctx.fillRect(
            particle.x - particle.size * 3,
            particle.y - particle.size * 3,
            particle.size * 6,
            particle.size * 6,
          );
        }
      });

      // Draw connections between nearby particles
      particles.forEach((particle, i) => {
        particles.slice(i + 1).forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.strokeStyle = "#FFD700";
            ctx.globalAlpha = ((120 - distance) / 120) * 0.15;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePromptSubmit = (idea: string) => {
    console.log("💡 Idea submitted: ", idea.substring(0,30) + "... This new subtitle better be compelling!");
    localStorage.setItem('draftIdea', idea);
    router.push('/overview-generator');
  };

  const handleGoToProject = async (projectId: string) => {
    const trimmedProjectId = projectId.trim();
    console.log("🔍 Checking GitHub repository existence for:", trimmedProjectId.substring(0, 30) + "... Athena's wisdom verifies before proceeding! 🏛️");
    
    setIsCheckingProject(true);
    
    try {
      // Check if the repository exists on GitHub
      const githubResponse = await fetch(`https://api.github.com/repos/athena-service-account/${trimmedProjectId}`);
      
      if (githubResponse.ok) {
        const repoData = await githubResponse.json() as { name: string; description?: string; html_url: string };
        console.log("✅ GitHub repository found! Redirecting to project management:", repoData.name);
        toast.success(`🎯 Repository "${repoData.name}" found! Redirecting to project management...`);
        router.push(`/project-manage/${trimmedProjectId}`);
      } else if (githubResponse.status === 404) {
        console.log("❌ GitHub repository not found:", trimmedProjectId);
        toast.error(`🔍 Repository "${trimmedProjectId}" not found on GitHub. Double-check your project ID and try again!`);
      } else {
        console.log("⚠️ Error checking GitHub repository:", githubResponse.status);
        toast.error(`⚠️ Unable to verify repository "${trimmedProjectId}". Please try again later.`);
      }
    } catch (error) {
      console.error("🚨 Error checking GitHub repository:", error);
      toast.error(`🚨 Connection error while checking repository. Please verify your internet connection and try again.`);
    } finally {
      setIsCheckingProject(false);
    }
  };

  return (
    <div className="h-screen bg-black text-white overflow-hidden relative" style={{ height: '100vh' }}>
      {/* Professional Animated Canvas Background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{ opacity: 0.4 }}
      />

      {/* Professional Gradient Layers */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,215,0,0.1),transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,215,0,0.08),transparent_60%)]"></div>
      </div>

      {/* Animated Grid Pattern */}
      <div
        className="fixed inset-0 opacity-30 z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFD700' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          animation: "gridMove 15s linear infinite",
        }}
      ></div>

      {/* Subtle Glow Effects - Fixed positions to avoid hydration issues */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {[10, 25, 40, 60, 75, 90].map((position, i) => (
          <motion.div
            key={i}
            className="absolute w-px bg-gradient-to-b from-transparent via-yellow-400/30 to-transparent"
            style={{
              left: `${position}%`,
              height: "100%",
            }}
            animate={{
              opacity: [0, 0.3, 0],
              scaleY: [0, 1, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <main className="relative z-10 h-full flex flex-col justify-center">
        {/* Hero Section - Centered Layout */}
        <section className="flex flex-col justify-center items-center px-6">
          {/* Title Section with Favicon */}
          <div className="text-center z-20 relative mb-16">
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
              >
                {/* Favicon positioned above ATHENA */}
                <div className="relative mb-6">
                  <motion.div
                    className="absolute -top-24 left-1/2 transform -translate-x-1/2 z-10"
                    initial={{ opacity: 0, scale: 0.5, y: -20 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1, 
                      y: 0,
                      rotate: 360
                    }}
                    transition={{ 
                      duration: 0.8, 
                      delay: 0.2, 
                      ease: "easeOut",
                      rotate: {
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear"
                      }
                    }}
                    whileHover={{ 
                      scale: 1.1,
                      rotate: [0, -5, 5, 0],
                      transition: { duration: 0.3 }
                    }}
                  >
                    <img 
                      src="/favicon.ico" 
                      alt="Athena" 
                      className="w-20 h-20 drop-shadow-lg"
                    />
                  </motion.div>
                  
                  <motion.h1
                    className="text-7xl font-bold font-serif tracking-tight"
                    style={{
                      background:
                        "linear-gradient(45deg, #FFD700, #FFA500, #FFD700)",
                      backgroundSize: "200% 200%",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      textShadow: "0 0 30px rgba(255, 215, 0, 0.3)",
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
                    ATHENA
                  </motion.h1>
                </div>

                <motion.p
                  className="text-xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed font-light"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                >
                  Strategic AI that transforms your ideas into powerful applications. 
                  From vision to reality, with wisdom and precision.
                </motion.p>

                {/* Feature Pills - Professional Styling */}
                <motion.div
                  className="flex flex-wrap justify-center gap-3 mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
                >
                  {[
                    "⚡ Lightning Fast",
                    "🧠 AI Powered",
                    "🎯 Fast Inference",
                    "🔧 Smart Generation",
                    "📊 Project Planning",
                    "🚀 Instant Deployment",
                  ].map((feature, index) => (
                    <motion.div
                      key={feature}
                      className="px-4 py-2 bg-gradient-to-r from-yellow-600/10 to-amber-600/10 border border-yellow-400/20 rounded-lg text-yellow-200 backdrop-blur-sm text-sm font-medium"
                      whileHover={{
                        scale: 1.05,
                        backgroundColor: "rgba(255, 215, 0, 0.15)",
                        borderColor: "rgba(255, 215, 0, 0.4)",
                      }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.4,
                        delay: 0.8 + index * 0.1,
                        ease: "easeOut",
                      }}
                      style={{ margin: '0 8px' }}
                    >
                      {feature}
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Prompt Box Section */}
          <motion.div
            className="flex justify-center items-center relative mb-12"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, delay: 1, ease: "easeOut" }}
          >
            <div className="max-w-2xl w-full mx-auto px-6">
              <PromptBox onSubmit={handlePromptSubmit} onGoToProject={handleGoToProject} isCheckingProject={isCheckingProject} />
            </div>
          </motion.div>



          {/* Witty Subtitle */}
          <motion.p
            className="mt-8 text-gray-400 text-sm max-w-2xl mx-auto px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.5, ease: "easeOut" }}
          >
            {randomPhrase}
          </motion.p>
        </section>
      </main>

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
