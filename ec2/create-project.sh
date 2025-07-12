#!/bin/bash

# Athena AI Project Creation Script
# This script creates a new GitHub repository and sets up the initial Next.js project

set -e  # Exit on any error

# Check if all required arguments are provided
if [ $# -ne 4 ]; then
    echo "Usage: $0 <projectId> <projectTitle> <port> <projectOverview>"
    exit 1
fi

PROJECT_ID=$1
PROJECT_TITLE=$2
PORT=$3
PROJECT_OVERVIEW=$4

echo "🚀 Athena AI Project Creation Script"
echo "Project ID: $PROJECT_ID"
echo "Project Title: $PROJECT_TITLE"
echo "Port: $PORT"
echo "Overview: $PROJECT_OVERVIEW"

# Set up environment
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin:/home/ubuntu/.nvm/versions/node/v20.19.3/bin"
export NVM_DIR="/home/ubuntu/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Create project directory
PROJECT_DIR="/home/ubuntu/projects/$PROJECT_ID"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

echo "📁 Created project directory: $PROJECT_DIR"

# Initialize git repository
echo "🔧 Initializing git repository..."
git init

# Create basic Next.js project structure
echo "📦 Creating Next.js project structure..."

# Create package.json
cat > package.json << EOF
{
  "name": "$PROJECT_ID",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "14.0.0",
    "typescript": "^5",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.31"
  }
}
EOF

# Create next.config.js
cat > next.config.js << EOF
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig
EOF

# Create tsconfig.json
cat > tsconfig.json << EOF
{
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
}
EOF

# Create app directory structure
mkdir -p app
mkdir -p public

# Create app/layout.tsx
cat > app/layout.tsx << EOF
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '$PROJECT_TITLE',
  description: '$PROJECT_OVERVIEW',
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
}
EOF

# Create app/page.tsx
cat > app/page.tsx << EOF
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold">$PROJECT_TITLE</h1>
        <p className="mt-4 text-lg">$PROJECT_OVERVIEW</p>
      </div>
    </main>
  )
}
EOF

# Create app/globals.css
cat > app/globals.css << EOF
@tailwind base;
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
}
EOF

# Create tailwind.config.js
cat > tailwind.config.js << EOF
/** @type {import('tailwindcss').Config} */
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
}
EOF

# Create postcss.config.js
cat > postcss.config.js << EOF
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# Create .gitignore
cat > .gitignore << EOF
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

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
next-env.d.ts
EOF

# Create README.md
cat > README.md << EOF
# $PROJECT_TITLE

$PROJECT_OVERVIEW

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

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.
EOF

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Initialize git and make initial commit
echo "🔧 Setting up git repository..."
git add .
git config user.name "Athena AI Service Account"
git config user.email "athena-service@example.com"
git commit -m "Initial commit: $PROJECT_TITLE

$PROJECT_OVERVIEW"

# Create GitHub repository using GitHub API
echo "🔗 Creating GitHub repository..."
GITHUB_TOKEN="${GITHUB_SERVICE_ACCOUNT_PAT}"
GITHUB_USERNAME="athena-service-account"

if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️ GITHUB_SERVICE_ACCOUNT_PAT not set, skipping GitHub repository creation"
else
    echo "🔗 Creating GitHub repository: $GITHUB_USERNAME/$PROJECT_ID"
    
    # Create repository via GitHub API
    curl -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        https://api.github.com/user/repos \
        -d "{
            \"name\": \"$PROJECT_ID\",
            \"description\": \"$PROJECT_OVERVIEW\",
            \"private\": false,
            \"auto_init\": false
        }"
    
    # Add remote origin and push
    git remote add origin "https://github.com/$GITHUB_USERNAME/$PROJECT_ID.git"
    git branch -M main
    git push -u origin main
    
    echo "✅ GitHub repository created and pushed: https://github.com/$GITHUB_USERNAME/$PROJECT_ID"
fi

# Start the development server
echo "🚀 Starting development server on port $PORT..."
export PORT=$PORT
nohup npm run dev > server.log 2>&1 &

# Wait a moment for the server to start
sleep 5

echo "✅ Project creation completed successfully!"
echo "📁 Project directory: $PROJECT_DIR"
echo "🌐 Development server running on port $PORT"
echo "📝 Server logs: $PROJECT_DIR/server.log"

exit 0 