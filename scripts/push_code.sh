#!/usr/bin/env bash
set -e

echo "================================================="
echo "  Enterprise Hospital Management System - Git Sync"
echo "================================================="

cd "$(dirname "$0")/.."

echo "1. Staging local changes..."
git add src/ vite.config.ts

echo "2. Committing local work..."
git commit -m "feat(inpatient): auto-fetch ER patient details on bed allocation with sleek UI/UX & animations" || echo "No new local changes to commit."

echo "3. Configuring merge reconciliation for divergent branches..."
git config pull.rebase false

echo "4. Pulling recent merges from origin main..."
git pull origin main --no-rebase

echo "5. Pushing updated branch to origin..."
git push origin feature/responsive-ui-and-ai-demo

echo "================================================="
echo "  All updates pulled, merged, and pushed successfully!"
echo "================================================="
