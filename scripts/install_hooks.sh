#!/bin/sh
# Installer for Git Hooks
GIT_DIR=".git"

if [ ! -d "$GIT_DIR" ]; then
    echo "❌ .git directory not found! Run this from the project root."
    exit 1
fi

echo "Installing hooks..."
cp scripts/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
echo "✅ Pre-commit hook installed!"
