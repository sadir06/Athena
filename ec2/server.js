const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store running projects
const runningProjects = new Map();

// Configuration
const MAX_CONCURRENT_PROJECTS = 3;
const MEMORY_LIMIT_MB = 512;

// Cleanup function to kill orphaned processes
function cleanupOrphanedProcesses() {
    console.log('🧹 Cleaning up orphaned node processes...');
    
    // Kill any orphaned npm/node processes that might be hanging around
    const { exec } = require('child_process');
    
    exec('pkill -f "npm run dev"', (error, stdout, stderr) => {
        if (stdout) console.log('Killed npm processes:', stdout);
    });
    
    exec('pkill -f "next dev"', (error, stdout, stderr) => {
        if (stdout) console.log('Killed next processes:', stdout);
    });
    
    // Clean up old project directories (older than 2 hours)
    exec('find /home/ubuntu/projects -type d -mmin +120 -exec rm -rf {} +', (error, stdout, stderr) => {
        if (error && error.code !== 1) { // Ignore "no files found" error
            console.error('Cleanup error:', error);
        }
    });
}

// Resource monitoring function
function checkSystemResources() {
    const { exec } = require('child_process');
    
    exec('free -m | grep Mem', (error, stdout, stderr) => {
        if (stdout) {
            const memInfo = stdout.split(/\s+/);
            const totalMem = parseInt(memInfo[1]);
            const usedMem = parseInt(memInfo[2]);
            const memUsagePercent = (usedMem / totalMem) * 100;
            
            console.log(`💾 Memory usage: ${memUsagePercent.toFixed(1)}% (${usedMem}MB / ${totalMem}MB)`);
            
            // If memory usage is over 80%, run cleanup
            if (memUsagePercent > 80) {
                console.log('⚠️ High memory usage detected, running cleanup...');
                cleanupOrphanedProcesses();
            }
        }
    });
}
function validateProjectData(data) {
    const errors = [];
    
    if (!data.projectId || typeof data.projectId !== 'string' || data.projectId.trim() === '') {
        errors.push('projectId is required and must be a non-empty string');
    }
    
    if (!data.projectTitle || typeof data.projectTitle !== 'string' || data.projectTitle.trim() === '') {
        errors.push('projectTitle is required and must be a non-empty string');
    }
    
    if (!data.port || !Number.isInteger(data.port) || data.port < 3001 || data.port > 5000) {
        errors.push('port is required and must be an integer between 3001-5000');
    }
    
    if (!data.projectOverview || typeof data.projectOverview !== 'string' || data.projectOverview.trim() === '') {
        errors.push('projectOverview is required and must be a non-empty string');
    }
    
    // Check if project ID contains only valid characters for repo names
    if (data.projectId && !/^[a-zA-Z0-9_-]+$/.test(data.projectId)) {
        errors.push('projectId can only contain letters, numbers, hyphens, and underscores');
    }
    
    return errors;
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get running projects
app.get('/projects', (req, res) => {
    const projects = Array.from(runningProjects.entries()).map(([id, data]) => ({
        projectId: id,
        port: data.port,
        startTime: data.startTime,
        pid: data.pid
    }));
    
    res.json({ projects });
});

// Create new project endpoint
app.post('/create-project', async (req, res) => {
    try {
        const { projectId, projectTitle, port, projectOverview } = req.body;
        
        // AGGRESSIVE CLEANUP: Kill all existing projects before starting new one
        console.log('🧹 AGGRESSIVE CLEANUP: Terminating all existing projects...');
        for (const [existingId, project] of runningProjects.entries()) {
            try {
                process.kill(-project.pid, 'SIGKILL');
                console.log(`💀 Killed project: ${existingId}`);
            } catch (error) {
                console.log(`⚠️ Could not kill ${existingId}: ${error.message}`);
            }
        }
        runningProjects.clear();
        
        // Nuclear cleanup of all Node processes
        const { exec } = require('child_process');
        exec('pkill -9 -f "npm run dev" && pkill -9 -f "next dev" && pkill -9 -f "node.*server"', () => {
            console.log('💀 Killed all npm/node processes');
        });
        
        // Clean all project directories immediately
        exec('rm -rf /home/ubuntu/projects/*', () => {
            console.log('🗑️ Cleaned all project directories');
        });
        
        // Clear npm cache
        exec('npm cache clean --force', () => {
            console.log('🧽 Cleared npm cache');
        });
        
        // Wait a moment for cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Validate input
        const validationErrors = validateProjectData(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                error: 'Validation failed',
                details: validationErrors
            });
        }
        
        console.log('🚀 Creating new project (SOLO MODE):');
        console.log(`   Project ID: ${projectId}`);
        console.log(`   Title: ${projectTitle}`);
        console.log(`   Port: ${port}`);
        console.log(`   Overview: ${projectOverview}`);
        
        // 1. Create GitHub repo via API
        const githubToken = process.env.GITHUB_SERVICE_ACCOUNT_PAT;
        const githubUsername = 'athena-service-account';
        if (!githubToken) {
            return res.status(500).json({ error: 'Missing GitHub service account token' });
        }

        console.log('🔗 Creating GitHub repository via API...');
        const createRepoResponse = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: projectId,
                description: projectOverview,
                private: false,
                auto_init: false
            })
        });
        if (!createRepoResponse.ok) {
            const err = await createRepoResponse.text();
            console.error('❌ Failed to create GitHub repo:', err);
            return res.status(500).json({ error: 'Failed to create GitHub repo', details: err });
        }
        console.log('✅ GitHub repo created!');

        // 2. Clone the repo locally
        const projectDir = `/home/ubuntu/projects/${projectId}`;
        const cloneUrl = `https://github.com/${githubUsername}/${projectId}.git`;
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        console.log('📥 Cloning repo...');
        await execAsync(`git clone ${cloneUrl} ${projectDir}`);

        // 3. Write Next.js template files
        // (reuse the template code from previous steps)
        // Create package.json
        const packageJson = {
            name: projectId,
            version: "0.1.0",
            private: true,
            scripts: {
                dev: "next dev",
                build: "next build",
                start: "next start",
                lint: "next lint"
            },
            dependencies: {
                next: "14.0.0",
                react: "^18",
                "react-dom": "^18"
            },
            devDependencies: {
                "@types/node": "^20",
                "@types/react": "^18",
                "@types/react-dom": "^18",
                eslint: "^8",
                "eslint-config-next": "14.0.0",
                typescript: "^5",
                tailwindcss: "^3.3.0",
                autoprefixer: "^10.4.16",
                postcss: "^8.4.31"
            }
        };
        
        fs.writeFileSync(`${projectDir}/package.json`, JSON.stringify(packageJson, null, 2));
        
        // Create other necessary files
        const files = {
            'next.config.js': `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig`,
            
            'tsconfig.json': `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`,
            
            'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}`,
            
            'postcss.config.js': `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
            
            '.gitignore': `# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.js
.yarn/install-state.gz

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts`,
            
            'README.md': `# ${projectTitle}

${projectOverview}

## Getting Started

First, run the development server:

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.`
        };
        
        // Create app directory
        fs.mkdirSync(`${projectDir}/app`, { recursive: true });
        fs.mkdirSync(`${projectDir}/public`, { recursive: true });
        
        // Write all files
        Object.entries(files).forEach(([filename, content]) => {
            fs.writeFileSync(`${projectDir}/${filename}`, content);
        });
        
        // Create app files
        fs.writeFileSync(`${projectDir}/app/layout.tsx`, `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '${projectTitle}',
  description: '${projectOverview}',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}`);
        
        fs.writeFileSync(`${projectDir}/app/page.tsx`, `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold">${projectTitle}</h1>
        <p className="mt-4 text-lg">${projectOverview}</p>
      </div>
    </main>
  )
}`);
        
        fs.writeFileSync(`${projectDir}/app/globals.css`, `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}`);
        
        // 4. Commit and push initial template
        await execAsync('git add .', { cwd: projectDir });
        await execAsync('git config user.name "Athena AI Service Account"', { cwd: projectDir });
        await execAsync('git config user.email "athena-service@example.com"', { cwd: projectDir });
        await execAsync('git commit -m "Initial Next.js template"', { cwd: projectDir });
        await execAsync('git push origin main', { cwd: projectDir });
        console.log('🚀 Initial template pushed!');

        // 5. Wait a few seconds for GitHub to sync
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 6. Call Change Request Agent with project overview
        console.log('🤖 Calling Change Request Agent for initial overlay...');
        const changeRequestRes = await fetch('https://athenaai.lol/api/update-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                repoId: projectId,
                changeRequest: `Create the initial project based on this overview: ${projectOverview}`,
                projectContext: `Initial project setup for ${projectTitle}. Transform the basic Next.js template into the described project.`
            })
        });
        
        if (!changeRequestRes.ok) {
            const err = await changeRequestRes.text();
            console.error('❌ Change Request Agent failed:', err);
            // Continue, but log error
        } else {
            const crData = await changeRequestRes.json();
            if (crData.changes && crData.changes.length > 0) {
                console.log(`✅ Change Request Agent applied ${crData.changes.length} changes to GitHub`);
                
                // 7. Wait a moment for GitHub to sync, then pull the latest changes
                console.log('⏳ Waiting for GitHub to sync changes...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // 8. Pull the latest changes from GitHub to update local files
                console.log('📥 Pulling latest changes from GitHub...');
                await execAsync('git fetch origin', { cwd: projectDir });
                await execAsync('git reset --hard origin/main', { cwd: projectDir });
                console.log('✅ Successfully pulled latest changes from GitHub');
            } else {
                console.log('⚠️ No changes from Change Request Agent');
            }
        }
        
        // Install dependencies
        console.log('Installing dependencies...');
        try {
            await execAsync('npm install', { 
                cwd: projectDir,
                timeout: 120000 // 2 minutes timeout
            });
            console.log('✅ Dependencies installed successfully');
        } catch (error) {
            console.error('❌ Failed to install dependencies:', error.message);
            // Continue anyway, the server might still work
        }
        
        // Start the development server
        console.log(`Starting development server on port ${port}...`);
        const childProcess = spawn('npm', ['run', 'dev'], {
            cwd: projectDir,
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PORT: port.toString(),
                NODE_OPTIONS: `--max-old-space-size=${MEMORY_LIMIT_MB}`,
                npm_config_cache: '/tmp/npm-cache'
            }
        });
        
        // Store project info
        runningProjects.set(projectId, {
            port,
            startTime: new Date().toISOString(),
            pid: childProcess.pid,
            title: projectTitle,
            overview: projectOverview,
            changeRequestApplied: true // Flag indicating Change Request Agent was applied
        });
        
        // Handle process output
        childProcess.stdout.on('data', (data) => {
            console.log(`[${projectId}] ${data.toString().trim()}`);
        });
        
        childProcess.stderr.on('data', (data) => {
            console.error(`[${projectId}] ERROR: ${data.toString().trim()}`);
        });
        
        // Handle process exit
        childProcess.on('close', (code) => {
            console.log(`[${projectId}] Process exited with code ${code}`);
            runningProjects.delete(projectId);
            
            // Clean up project directory after completion
            exec(`rm -rf /home/ubuntu/projects/${projectId}`, (error) => {
                if (error) {
                    console.error(`Failed to cleanup project directory: ${error}`);
                } else {
                    console.log(`🗑️ Cleaned up project directory: ${projectId}`);
                }
            });
        });
        
        // Don't wait for the process to finish
        childProcess.unref();
        
        res.status(201).json({
            success: true,
            message: 'Project creation started (all previous projects terminated)',
            projectId,
            port,
            startTime: runningProjects.get(projectId).startTime,
            mode: 'SOLO_MODE'
        });
        
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Stop project endpoint
app.post('/stop-project/:projectId', (req, res) => {
    const { projectId } = req.params;
    
    if (!runningProjects.has(projectId)) {
        return res.status(404).json({
            error: 'Project not found',
            message: `No running project found with ID '${projectId}'`
        });
    }
    
    const project = runningProjects.get(projectId);
    
    try {
        // Kill the process group
        process.kill(-project.pid, 'SIGTERM');
        runningProjects.delete(projectId);
        
        console.log(`🛑 Stopped project: ${projectId}`);
        
        res.json({
            success: true,
            message: `Project '${projectId}' stopped successfully`
        });
    } catch (error) {
        console.error(`Error stopping project ${projectId}:`, error);
        res.status(500).json({
            error: 'Failed to stop project',
            message: error.message
        });
    }
});

// Pull latest changes endpoint
app.post('/pull-changes/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const projectDir = `/home/ubuntu/projects/${projectId}`;
        
        if (!fs.existsSync(projectDir)) {
            return res.status(404).json({
                error: 'Project directory not found',
                message: `Project directory for '${projectId}' does not exist`
            });
        }
        
        console.log(`📥 Pulling latest changes from GitHub for ${projectId}...`);
        
        // Pull latest changes
        await execAsync('git fetch origin', { cwd: projectDir });
        await execAsync('git reset --hard origin/main', { cwd: projectDir });
        
        console.log(`✅ Successfully pulled latest changes for ${projectId}`);
        
        res.json({
            success: true,
            message: `Latest changes pulled successfully for project '${projectId}'`
        });
        
    } catch (error) {
        console.error(`Error pulling changes for ${projectId}:`, error);
        res.status(500).json({
            error: 'Failed to pull changes',
            message: error.message
        });
    }
});

// Restart project endpoint
app.post('/restart-project/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { port } = req.body;
        
        console.log(`🔄 Restarting project: ${projectId} on port ${port}`);
        
        // AGGRESSIVE CLEANUP: Kill all existing projects first
        console.log('🧹 AGGRESSIVE CLEANUP: Terminating all existing projects...');
        for (const [existingId, project] of runningProjects.entries()) {
            try {
                process.kill(-project.pid, 'SIGKILL');
                console.log(`💀 Killed project: ${existingId}`);
            } catch (error) {
                console.log(`⚠️ Could not kill ${existingId}: ${error.message}`);
            }
        }
        runningProjects.clear();

        // PULL LATEST CHANGES FROM GITHUB
        const projectDir = `/home/ubuntu/projects/${projectId}`;
        if (fs.existsSync(projectDir)) {
            try {
                console.log(`📥 Pulling latest changes from GitHub for ${projectId}...`);
                await execAsync('git fetch origin', { cwd: projectDir });
                await execAsync('git reset --hard origin/main', { cwd: projectDir });
                console.log(`✅ Successfully pulled latest changes for ${projectId}`);
            } catch (error) {
                console.error(`❌ Failed to pull latest changes for ${projectId}:`, error.message);
                // Continue anyway, the server might still work with existing files
            }
        }
        
        // Nuclear cleanup of all Node processes
        const { exec } = require('child_process');
        exec('pkill -9 -f "npm run dev" && pkill -9 -f "next dev" && pkill -9 -f "node.*server"', () => {
            console.log('💀 Killed all npm/node processes');
        });
        
        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const projectPath = `/home/ubuntu/projects/${projectId}`;
        
        // Check if project directory exists
        if (!fs.existsSync(projectPath)) {
            console.log(`📁 Project directory not found, cloning from GitHub...`);
            
            // Clone from GitHub (athena-service-account)
            const cloneCommand = `git clone https://github.com/athena-service-account/${projectId}.git ${projectPath}`;
            
            await new Promise((resolve, reject) => {
                exec(cloneCommand, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Git clone failed: ${error}`);
                        reject(error);
                        return;
                    }
                    console.log(`✅ Successfully cloned repository: ${projectId}`);
                    resolve(stdout);
                });
            });
            
            // Install dependencies
            console.log(`📦 Installing dependencies for ${projectId}...`);
            await new Promise((resolve, reject) => {
                exec('npm install', { cwd: projectPath }, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`npm install failed: ${error}`);
                        reject(error);
                        return;
                    }
                    console.log(`✅ Dependencies installed for ${projectId}`);
                    resolve(stdout);
                });
            });
        } else {
            console.log(`📁 Project directory exists: ${projectPath}`);
            
            // Git pull to get latest changes
            await new Promise((resolve, reject) => {
                exec('git pull origin main', { cwd: projectPath }, (error, stdout, stderr) => {
                    if (error) {
                        console.warn(`Git pull failed (continuing anyway): ${error}`);
                    }
                    console.log(`🔄 Git pull completed for ${projectId}`);
                    resolve(stdout);
                });
            });
        }
        
        // Start the development server
        console.log(`🚀 Starting development server for ${projectId} on port ${port}...`);
        
        const childProcess = spawn('npm', ['run', 'dev'], {
            cwd: projectPath,
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PORT: port.toString(),
                NODE_OPTIONS: `--max-old-space-size=${MEMORY_LIMIT_MB}`,
                npm_config_cache: '/tmp/npm-cache',
                PATH: '/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin:/home/ubuntu/.nvm/versions/node/v20.19.3/bin'
            }
        });
        
        // Store project info
        runningProjects.set(projectId, {
            port,
            startTime: new Date().toISOString(),
            pid: childProcess.pid,
            title: projectId.replace(/-/g, ' '),
            overview: 'Restarted project'
        });
        
        // Handle process output
        childProcess.stdout.on('data', (data) => {
            console.log(`[${projectId}] ${data.toString().trim()}`);
        });
        
        childProcess.stderr.on('data', (data) => {
            console.error(`[${projectId}] ERROR: ${data.toString().trim()}`);
        });
        
        // Handle process exit
        childProcess.on('close', (code) => {
            console.log(`[${projectId}] Process exited with code ${code}`);
            runningProjects.delete(projectId);
        });
        
        // Don't wait for the process to finish
        childProcess.unref();
        
        res.status(200).json({
            success: true,
            message: `Project '${projectId}' restarted successfully`,
            projectId,
            port,
            startTime: runningProjects.get(projectId).startTime,
            mode: 'RESTART_MODE'
        });
        
    } catch (error) {
        console.error(`Error restarting project:`, error);
        res.status(500).json({
            error: 'Failed to restart project',
            message: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🌟 Project Manager Server running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Running projects: http://localhost:${PORT}/projects`);
    console.log(`🚀 Create project: POST http://localhost:${PORT}/create-project`);
    console.log(`⚙️ Max concurrent projects: ${MAX_CONCURRENT_PROJECTS}`);
    console.log(`💾 Memory limit per project: ${MEMORY_LIMIT_MB}MB`);
    
    // Create scripts directory if it doesn't exist
    const scriptsDir = '/home/ubuntu/scripts';
    if (!fs.existsSync(scriptsDir)) {
        fs.mkdirSync(scriptsDir, { recursive: true });
        console.log(`📁 Created scripts directory: ${scriptsDir}`);
    }
    
    // Run initial cleanup
    cleanupOrphanedProcesses();
    
    // Set up periodic resource monitoring and cleanup
    setInterval(() => {
        checkSystemResources();
    }, 60000); // Every minute
    
    // More aggressive cleanup every 5 minutes
    setInterval(() => {
        cleanupOrphanedProcesses();
    }, 300000); // Every 5 minutes
});