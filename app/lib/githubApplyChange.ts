import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface FileChange {
  path: string;
  content?: string;
  remove?: boolean;
}

export async function applyChangesToRepo({
  repoUrl,
  branch = 'main',
  changes,
  commitMessage,
  githubToken,
}: {
  repoUrl: string;
  branch?: string;
  changes: FileChange[];
  commitMessage: string;
  githubToken: string;
}) {
  // Extract repo owner and name from URL
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
  if (!match) {
    throw new Error('Invalid GitHub repository URL');
  }
  const [, owner, repo] = match;
  
  // Get the current tree SHA for the branch
  const branchResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${branch}`, {
    headers: {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Athena-AI-Platform'
    }
  });
  
  if (!branchResponse.ok) {
    const errorText = await branchResponse.text();
    throw new Error(`Failed to get branch info: ${branchResponse.status} ${errorText}`);
  }
  
  const branchData = await branchResponse.json() as { commit: { sha: string } };
  const baseTreeSha = branchData.commit.sha;
  
  // Get the current commit SHA
  const currentCommitSha = branchData.commit.sha;
  
  // Create a new tree with our changes
  const treeItems = [];
  
  for (const change of changes) {
    if (change.remove) {
      // For deletions, we need to get the current file SHA first
      try {
        const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${change.path}?ref=${branch}`, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Athena-AI-Platform'
          }
        });
        
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          // Add to tree with null SHA to mark for deletion
          treeItems.push({
            path: change.path,
            mode: '100644',
            type: 'blob',
            sha: null
          });
        }
      } catch (error) {
        // File not found for deletion, continue
      }
    } else {
      // For new/updated files, create the blob first
      const blobResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Athena-AI-Platform'
        },
        body: JSON.stringify({
          content: change.content || '',
          encoding: 'utf-8'
        })
      });
      
      if (!blobResponse.ok) {
        const errorText = await blobResponse.text();
        throw new Error(`Failed to create blob: ${blobResponse.status} ${errorText}`);
      }
      
      const blobData = await blobResponse.json() as { sha: string };
      treeItems.push({
        path: change.path,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha
      });
    }
  }
  
  // Create the new tree
  const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Athena-AI-Platform'
    },
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeItems
    })
  });
  
  if (!treeResponse.ok) {
    const errorText = await treeResponse.text();
    throw new Error(`Failed to create tree: ${treeResponse.status} ${errorText}`);
  }
  
  const treeData = await treeResponse.json() as { sha: string };
  
  // Create the new commit
  const commitResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Athena-AI-Platform'
    },
    body: JSON.stringify({
      message: commitMessage,
      tree: treeData.sha,
      parents: [currentCommitSha]
    })
  });
  
  if (!commitResponse.ok) {
    const errorText = await commitResponse.text();
    throw new Error(`Failed to create commit: ${commitResponse.status} ${errorText}`);
  }
  
  const commitData = await commitResponse.json() as { sha: string };
  
  // Update the branch reference
  const refResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Athena-AI-Platform'
    },
    body: JSON.stringify({
      sha: commitData.sha
    })
  });
  
  if (!refResponse.ok) {
    const errorText = await refResponse.text();
    throw new Error(`Failed to update branch ref: ${refResponse.status} ${errorText}`);
  }
  
  return commitData.sha;
} 