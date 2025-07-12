'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaCode, FaHome, FaProjectDiagram, FaExchangeAlt } from 'react-icons/fa';
import Image from 'next/image';

export default function Navigation() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    const links = [
        { href: '/', label: 'Home', icon: <FaHome className="w-4 h-4" /> },
        { href: '/overview-generator', label: 'Project Generator', icon: <FaProjectDiagram className="w-4 h-4" /> },
        { href: '/change-request', label: 'Change Request', icon: <FaExchangeAlt className="w-4 h-4" /> },
        { href: '/code-review', label: 'Code Review', icon: <FaCode className="w-4 h-4" /> }
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-yellow-400/20">
            <div className="container mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <motion.div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg bg-transparent"
                            animate={{ rotate: 360 }}
                            transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                        >
                            <Image src="/favicon.ico" alt="Athena Logo" width={32} height={32} className="w-8 h-8 rounded-lg" />
                        </motion.div>
                        <span className="font-bold text-white">Athena</span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-2">
                        {links.map(({ href, label, icon }) => (
                            <Link key={href} href={href}>
                                <motion.div
                                    className={`relative px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                                        isActive(href)
                                            ? 'text-yellow-400 bg-yellow-400/10'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {icon}
                                    <span className="text-sm font-medium">{label}</span>
                                    {isActive(href) && (
                                        <motion.div
                                            className="absolute inset-0 border border-yellow-400/20 rounded-lg"
                                            layoutId="active-nav"
                                            transition={{
                                                type: "spring",
                                                stiffness: 500,
                                                damping: 30
                                            }}
                                        />
                                    )}
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    );
}
