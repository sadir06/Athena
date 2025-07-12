# Athena Preview Server Integration

## Current Infrastructure
- EC2 Instance: Ubuntu 24.04 LTS
- IP Address: 54.145.223.187
- Preview Port Range: 3000-4999
- Server Port: 8000

## Express Server Endpoints

### 1. Start/Clone Project

POST /api/preview/start
{
"projectId": string,
"repoUrl": string,
"port": number
}

Clones repository and starts dev server on assigned port.

### 2. Update Project

POST /api/preview/update
{
"projectId": string,
"port": number
}

Pulls latest changes and restarts dev server.

### 3. Kill Process

POST /api/preview/kill
{
"port": number
}

Terminates process running on specified port.

## Project Requirements

### Port Assignment
- Each project must have a unique port in range 3000-4999
- Port is assigned during project creation in Athena
- Port assignment stored in project metadata
- No two projects can share the same port

### Preview URL Format

http://54.145.223.187:{port}

## Security Configuration
- SSH (22): Restricted to authorized IPs
- HTTP (80): Open
- HTTPS (443): Open
- Preview Ports (3000-4999): Open
- Express Server (8000): Internal only

## Process Management
- Projects cloned to: `/home/ubuntu/projects/{projectId}`
- Dev servers run with: `PORT={port} npm run dev`
- Idle processes remain running
- Manual cleanup via `/api/preview/kill` endpoint

## Athena Integration

### Project Creation Workflow
1. Create GitHub repository
2. Assign unique preview port
3. Store (EC2 IP, port) pair in project metadata
4. Initialize preview when requested

### Preview Access
1. User requests preview
2. Athena sends request to EC2 preview server
3. Server ensures project is cloned/updated
4. Preview available at assigned port

## Future Scalability

### Multiple EC2 Instances
- Each EC2 will have unique IP
- Project assignment considers:
  - Available ports
  - Server load
  - Geographic location
- (EC2 IP, port) pair remains unique constraint

### Monitoring
- Track active preview sessions
- Monitor server resources
- Auto-cleanup idle projects
- Health checks for preview servers

## Development Notes
- Test projects with: `npm run dev`
- Required node modules: express, nodemon
- Process management via native Node.js
- Logging for debugging and monitoring