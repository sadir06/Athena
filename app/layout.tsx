import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import Navigation from "@/components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Athena AI - Strategic Project Creation",
  description: "Transform your ideas into powerful applications with Athena's strategic AI wisdom.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-black`}
      >
        <Navigation />
        <main className="pt-16">
          {children}
        </main>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(17, 17, 17, 0.95)',
              color: '#fff',
              border: '1px solid rgba(255, 215, 0, 0.2)',
              backdropFilter: 'blur(20px)',
              borderRadius: '12px',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#FFD700',
                secondary: '#000',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
