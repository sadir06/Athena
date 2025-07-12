#!/bin/bash

echo "🚀 Deploying EC2 server fix for GitHub sync..."

# SSH into EC2 and update the server
ssh -i ~/.ssh/athena-ec2.pem ubuntu@54.145.223.187 << 'EOF'

echo "📥 Pulling latest changes..."
cd /home/ubuntu/athena-ec2
git pull origin main

echo "🔄 Restarting EC2 server..."
sudo systemctl restart athena-ec2

echo "✅ EC2 server updated and restarted!"
echo "🔍 Checking server status..."
sudo systemctl status athena-ec2 --no-pager

EOF

echo "🎉 Deployment complete! The EC2 server should now pull latest changes from GitHub." 