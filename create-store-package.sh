#!/bin/bash

# Chrome Web Store Package Creator
# Creates ZIP file ready for Chrome Web Store submission

set -e

echo "🎁 Creating Chrome Web Store package..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Package name
PACKAGE_NAME="auto-flow-veo-extension-v1.0.1.zip"
TEMP_DIR="package_temp"

# Files to include
INCLUDE_FILES=(
  "manifest.json"
  "background.js"
  "popup.html"
  "popup.css"
  "popup.js"
  "constants.js"
  "utils.js"
  "i18n.js"
  "settings.js"
  "loading-utils.js"
  "empty-states.js"
  "button-effects.js"
  "design-system.css"
  "content/"
  "icons/"
)

# Files to exclude
EXCLUDE_PATTERNS=(
  "*.md"
  "*.backup"
  "*.log"
  "*.sh"
  ".git*"
  "node_modules"
  "store-assets"
  "*.py"
  "*.html" # except popup.html (already included)
  "debug-*"
  "analyze-*"
  "create_icons.py"
  "generate-icons.*"
  "glassmorphism-demo.html"
  "ui-preview.html"
)

echo "📋 Checking required files..."

# Check manifest.json exists
if [ ! -f "manifest.json" ]; then
  echo -e "${RED}❌ Error: manifest.json not found!${NC}"
  exit 1
fi

# Check version in manifest
VERSION=$(grep '"version"' manifest.json | cut -d'"' -f4)
echo -e "${GREEN}✓${NC} Version: $VERSION"

# Check icons exist
if [ ! -d "icons" ]; then
  echo -e "${RED}❌ Error: icons/ directory not found!${NC}"
  exit 1
fi

for size in 16 48 128; do
  if [ ! -f "icons/icon${size}.png" ]; then
    echo -e "${RED}❌ Error: icons/icon${size}.png not found!${NC}"
    exit 1
  fi
done
echo -e "${GREEN}✓${NC} All icons found"

# Check content scripts
if [ ! -d "content" ]; then
  echo -e "${RED}❌ Error: content/ directory not found!${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} Content scripts found"

echo ""
echo "📦 Creating package..."

# Remove old package if exists
if [ -f "$PACKAGE_NAME" ]; then
  rm "$PACKAGE_NAME"
  echo -e "${YELLOW}⚠${NC} Removed old package"
fi

# Create temp directory
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Copy files
echo "📁 Copying files..."
for file in "${INCLUDE_FILES[@]}"; do
  if [ -e "$file" ]; then
    cp -r "$file" "$TEMP_DIR/"
    echo -e "  ${GREEN}✓${NC} $file"
  else
    echo -e "  ${RED}✗${NC} $file (not found, skipping)"
  fi
done

# Remove excluded files from temp
echo ""
echo "🧹 Removing unnecessary files..."
cd "$TEMP_DIR"

# Remove .md files
find . -name "*.md" -delete 2>/dev/null || true
# Remove backup files
find . -name "*.backup" -delete 2>/dev/null || true
# Remove log files
find . -name "*.log" -delete 2>/dev/null || true
# Remove Python files
find . -name "*.py" -delete 2>/dev/null || true
# Remove test HTML files (keep popup.html)
find . -name "*.html" ! -name "popup.html" -delete 2>/dev/null || true
# Remove debug files
find . -name "debug-*" -delete 2>/dev/null || true
find . -name "analyze-*" -delete 2>/dev/null || true
find . -name "generate-icons.*" -delete 2>/dev/null || true
find . -name "glassmorphism-demo.html" -delete 2>/dev/null || true
find . -name "ui-preview.html" -delete 2>/dev/null || true
find . -name ".DS_Store" -delete 2>/dev/null || true

echo -e "${GREEN}✓${NC} Cleaned up unnecessary files"

# Create ZIP
cd ..
echo ""
echo "🗜️  Creating ZIP archive..."
zip -r -q "$PACKAGE_NAME" "$TEMP_DIR"/*

# Get file size
SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)

# Clean up temp directory
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}✅ Package created successfully!${NC}"
echo ""
echo "📦 Package: $PACKAGE_NAME"
echo "📊 Size: $SIZE"
echo "📍 Location: $(pwd)/$PACKAGE_NAME"
echo ""
echo "🎯 Next steps:"
echo "  1. Go to: https://chrome.google.com/webstore/devconsole"
echo "  2. Click 'New Item'"
echo "  3. Upload: $PACKAGE_NAME"
echo "  4. Fill in store listing details"
echo "  5. Submit for review"
echo ""
echo -e "${YELLOW}⚠${NC}  Don't forget:"
echo "  - Chụp screenshots (1280x800)"
echo "  - Host Privacy Policy"
echo "  - Viết store description"
echo ""
echo "Good luck! 🚀"
