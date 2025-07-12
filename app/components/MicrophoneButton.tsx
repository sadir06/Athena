'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';

interface MicrophoneButtonProps {
  onTranscriptionComplete: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function MicrophoneButton({ 
  onTranscriptionComplete, 
  disabled = false,
  className = ''
}: MicrophoneButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      console.log("🎤 Starting recording - time to capture some wisdom! 🦉");
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("🛑 Recording stopped - processing audio data...");
        setIsProcessing(true);
        
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const arrayBuffer = await audioBlob.arrayBuffer();
          const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          
          console.log("🔊 Audio converted to base64, sending to Groq for transcription...");
          
          const response = await fetch('/api/speech-to-text', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ audioData: base64Audio }),
          });

          if (!response.ok) {
            throw new Error('Transcription failed');
          }

          const data = await response.json() as { success: boolean; text?: string; error?: string };
          
          if (data.success && data.text) {
            console.log("🎯 Transcription successful:", data.text.substring(0, 50) + "... - Athena heard you loud and clear!");
            onTranscriptionComplete(data.text);
          } else {
            console.error("❌ Transcription failed:", data.error);
            throw new Error(data.error || 'Transcription failed');
          }
        } catch (error) {
          console.error("💥 Error processing audio:", error);
          // You might want to show a toast notification here
        } finally {
          setIsProcessing(false);
          setIsRecording(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log("🎙️ Recording started - speak your wisdom!");
      
    } catch (error) {
      console.error("❌ Failed to start recording:", error);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log("🛑 Stopping recording...");
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleClick = () => {
    if (disabled || isProcessing) return;
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled || isProcessing}
      className={`relative p-2 rounded-lg transition-all duration-200 ${className} ${
        isRecording 
          ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-lg shadow-yellow-500/50' 
          : 'bg-gray-700/60 hover:bg-gray-600/60 text-gray-300 hover:text-yellow-400 border border-gray-600/30 hover:border-yellow-400/30'
      } ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      whileHover={!disabled && !isProcessing ? { scale: 1.05 } : {}}
      whileTap={!disabled && !isProcessing ? { scale: 0.95 } : {}}
    >
      {isRecording && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-lg"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
      
      <div className="relative z-10 flex items-center justify-center">
        {isProcessing ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-current" />
        ) : isRecording ? (
          <FaMicrophone className="w-4 h-4" />
        ) : (
          <FaMicrophone className="w-4 h-4" />
        )}
      </div>
      
      {isRecording && (
        <motion.div
          className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
    </motion.button>
  );
} 