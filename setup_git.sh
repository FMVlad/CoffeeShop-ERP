#!/bin/bash

echo "========================================"
echo "       Git Repository Setup"
echo "========================================"
echo

echo "🔧 Checking Git version..."
git --version

echo
echo "🔧 Initializing Git repository..."
git init

echo
echo "🔗 Adding remote origin..."
git remote add origin https://github.com/FMVlad/CoffeeBOT.git

echo
echo "📁 Adding all files..."
git add .

echo
echo "📝 Creating initial commit..."
git commit -m "Initial commit: CoffeeBot fullstack project

- ⚛️ React frontend with PWA support
- 🚀 FastAPI backend with CORS
- 🤖 Telegram bot integration  
- 📦 Batch files for easy startup
- 📋 Complete project documentation"

echo
echo "📤 Pushing to GitHub..."
git branch -M main
git push -u origin main

echo
echo "✅ Done! Repository setup and pushed to GitHub!"
echo
echo "🌐 Your project: https://github.com/FMVlad/CoffeeBOT"
echo

read -p "Press Enter to continue..." 