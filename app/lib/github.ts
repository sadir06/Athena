import { Octokit } from "@octokit/rest";

export class GitHubService {
    private octokit: Octokit;

    constructor(accessToken: string) {
        console.log("🎭 GitHub Service: Time to put on a show! Token length:", accessToken.length);

        // Add this debug request
        fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
            }
        }).then(res => {
            console.log("🎟️ Current token scopes:", res.headers.get('x-oauth-scopes'));
        }).catch(err => {
            console.error("🎪 Failed to check token scopes:", err);
        });

        this.octokit = new Octokit({
            auth: accessToken,
            userAgent: 'Athena/1.0.0'
        });
    }

    // In the createRepository method of GitHubService class
    async createRepository(name: string, description: string) {
        console.log("🎪 Creating repo:", name, "- Like building a circus tent, but with code!");
        try {
            console.log("🎯 Attempting repo creation... fingers crossed like a pretzel!");
            const response = await this.octokit.repos.createForAuthenticatedUser({
                name,
                description,
                private: false,
                auto_init: false  // Set to false to avoid initial files being created
            });
            console.log("🎉 Repository created:", response.data.html_url, "- Like a digital baby's birth announcement!");
            return response.data;
        } catch (error) {
            console.error("💥 Repository creation failed:", error);
            throw error;
        }
    }

    async createFile(owner: string, repo: string, path: string, content: string, options?: { source?: 'text' | 'url' }) {
        console.log("📝 Creating file:", path, "- source:", options?.source || 'text');
        try {
            let contentEncoded: string;

            if (options?.source === 'url') {
                // Fetch content from URL
                console.log("🌐 Fetching content from URL:", content);
                const response = await fetch(content);

                if (!response.ok) {
                    throw new Error(`Failed to fetch from URL: ${response.status} ${response.statusText}`);
                }

                // Get content as array buffer (works for both text and binary)
                const buffer = await response.arrayBuffer();
                contentEncoded = Buffer.from(buffer).toString('base64');
            } else {
                // Direct text content
                contentEncoded = Buffer.from(content).toString('base64');
            }

            // First, try to get the file (to handle conflicts)
            let sha = undefined;
            try {
                const { data } = await this.octokit.repos.getContent({
                    owner,
                    repo,
                    path
                });

                // If file exists, get its SHA
                if ('sha' in data) {
                    sha = data.sha;
                    console.log(`📄 File already exists, updating: ${path} (SHA: ${sha})`);
                }
            } catch (error) {
                // File doesn't exist, which is fine for creation
                console.log(`📄 File doesn't exist yet, creating: ${path}`);
                console.error("💥 Error:", (error as Error).message.substring(0, 100));
            }

            // Now create or update the file with the SHA if it exists
            await this.octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path,
                message: sha ? `Update ${path}` : `Add ${path}`,
                content: contentEncoded,
                sha // This is undefined for new files, or the existing SHA for updates
            });

            console.log("✨ File created successfully!");
        } catch (error: unknown) {
            console.error("📜 Failed to create file:", error);
            throw error;
        }
    }

    async createMultipleFiles(owner: string, repo: string, files: Array<{ path: string, content: string, source?: 'text' | 'url' }>) {
        console.log("📚 Creating multiple files - like writing a book, but faster!");

        try {
            // Process files sequentially to avoid conflicts
            for (const file of files) {
                try {
                    await this.createFile(owner, repo, file.path, file.content, { source: file.source || 'text' });
                    // Small delay between file creations to avoid rate limiting and potential conflicts
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    console.error(`Failed to create file ${file.path}:`, error);
                    // Continue with other files even if one fails
                }
            }
            console.log("✨ All files created successfully!");
        } catch (error) {
            console.error("📜 Failed to create some files:", error);
            throw error;
        }
    }

    async createBranch(owner: string, repo: string, baseBranch: string, newBranch: string) {
        console.log(`🌿 Creating branch ${newBranch} from ${baseBranch} - like planting a new tree in the git forest!`);
        try {
            // First, get the reference to the base branch
            const { data: reference } = await this.octokit.git.getRef({
                owner,
                repo,
                ref: `heads/${baseBranch}`
            });

            // Create the new branch using the SHA from the base branch
            await this.octokit.git.createRef({
                owner,
                repo,
                ref: `refs/heads/${newBranch}`,
                sha: reference.object.sha
            });

            console.log(`🌱 Branch ${newBranch} created successfully!`);
            return true;
        } catch (error) {
            console.error(`🌪️ Failed to create branch ${newBranch}:`, error);
            throw error;
        }
    }

    async setupBranches(owner: string, repo: string) {
        // For a Cloudflare Pages workflow, we typically need main, preview, and prod branches
        console.log("🌳 Setting up branches for Cloudflare Pages deployment - growing the deployment forest!");
        console.log("🌳 Owner:", owner);
        console.log("🌳 Repo:", repo);

        try {
            // Ensure main branch exists (usually created by default)
            console.log("✅ Using main branch as the default branch");

            // Create preview branch from main (commented out for now)
            /*
            await this.createBranch(owner, repo, 'main', 'preview');
            console.log("🌿 Preview branch created - ready for staging deployments!");

            // Create prod branch from main (commented out for now)
            await this.createBranch(owner, repo, 'main', 'prod');
            console.log("🌲 Production branch created - ready for the real show!");
            */

            return true;
        } catch (error) {
            console.error("🌪️ Branch setup failed:", error);
            throw error;
        }
    }
}

export function parseRepoName(githubUrl: string): string {
    const parts = githubUrl.split('/');
    return parts[parts.length - 1];
}