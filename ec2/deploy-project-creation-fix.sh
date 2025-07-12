#!/bin/bash

echo "🚀 Deploying EC2 server fix for automatic Change Request Agent integration..."

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

echo "🎉 Project creation will now automatically apply Change Request Agent changes!"

EOF

echo "🎉 Deployment complete! New projects will now automatically apply the project overview via Change Request Agent." 