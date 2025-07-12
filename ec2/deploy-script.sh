#!/bin/bash

# Athena AI EC2 Deployment Script
# This script deploys the create-project.sh script to the EC2 server

echo "🚀 Deploying Athena AI scripts to EC2 server..."

# Check if SSH key exists
if [ ! -f "athena-hack-ec2-key.pem" ]; then
    echo "❌ SSH key not found: athena-hack-ec2-key.pem"
    echo "Please make sure the SSH key is in the current directory"
    exit 1
fi

# Make the key executable
chmod 400 athena-hack-ec2-key.pem

# Create scripts directory on EC2
echo "📁 Creating scripts directory on EC2..."
ssh -i "athena-hack-ec2-key.pem" ubuntu@54.145.223.187 "mkdir -p /home/ubuntu/scripts"

# Copy the create-project.sh script
echo "📦 Copying create-project.sh to EC2..."
scp -i "athena-hack-ec2-key.pem" create-project.sh ubuntu@54.145.223.187:/home/ubuntu/scripts/

# Make the script executable
echo "🔧 Making script executable..."
ssh -i "athena-hack-ec2-key.pem" ubuntu@54.145.223.187 "chmod +x /home/ubuntu/scripts/create-project.sh"

# Install required tools on EC2
echo "📦 Installing required tools on EC2..."
ssh -i "athena-hack-ec2-key.pem" ubuntu@54.145.223.187 "
    # Update package list
    sudo apt update
    
    # Install curl if not already installed
    sudo apt install -y curl
    
    # Install Node.js and npm if not already installed
    if ! command -v node &> /dev/null; then
        echo 'Installing Node.js...'
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Install git if not already installed
    sudo apt install -y git
    
    # Configure git for the service account
    git config --global user.name 'Athena AI Service Account'
    git config --global user.email 'athena-service@example.com'
"

echo "✅ Deployment completed successfully!"
echo "🔗 The create-project.sh script is now available at /home/ubuntu/scripts/create-project.sh"
echo "🚀 You can now create projects through the Athena AI platform!" 