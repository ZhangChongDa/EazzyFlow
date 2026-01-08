#!/bin/bash

# Clean script for Eazzy Flow project
# This script cleans all build artifacts and caches

echo "🧹 Cleaning project..."

# Remove Vite cache
echo "Removing Vite cache..."
rm -rf node_modules/.vite

# Remove build output
echo "Removing build output..."
rm -rf dist

# Remove TypeScript build info
echo "Removing TypeScript build info..."
rm -rf *.tsbuildinfo

# Remove node_modules (optional - uncomment if needed)
# echo "Removing node_modules..."
# rm -rf node_modules

echo "✅ Clean complete!"
echo ""
echo "💡 Next steps:"
echo "   1. npm install (if you removed node_modules)"
echo "   2. npm run dev"


