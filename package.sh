#!/bin/bash

# BillStack Chrome Extension Packaging Script
# Creates a clean ZIP file for Chrome Web Store submission

echo "📦 Packaging BillStack Extension for Chrome Web Store..."
echo ""

# Get version from manifest.json
VERSION=$(grep -o '"version": "[^"]*' manifest.json | cut -d'"' -f4)
echo "Version: $VERSION"

# Output filename
OUTPUT_FILE="billstack-v${VERSION}.zip"

# Remove old package if exists
if [ -f "$OUTPUT_FILE" ]; then
    echo "Removing old package..."
    rm "$OUTPUT_FILE"
fi

# Create the ZIP file
echo ""
echo "Creating ZIP package..."
zip -r "$OUTPUT_FILE" \
  manifest.json \
  src/ \
  assets/ \
  libs/ \
  -x "*.DS_Store" \
  -x "*.git*" \
  -x "node_modules/*" \
  -x "*.md" \
  -x "package.sh" \
  -x "*icon-generator.html" \
  -x "*promo-tile-generator.html" \
  -x "*.pdf" \
  -x "examples/*" \
  -x "docs/*"

echo ""
echo "✅ Package created: $OUTPUT_FILE"
echo ""

# Show package contents
echo "📋 Package contents:"
unzip -l "$OUTPUT_FILE" | tail -n +4 | head -n -2

echo ""
echo "📊 Package size:"
ls -lh "$OUTPUT_FILE" | awk '{print $5}'

echo ""
echo "✅ Ready for submission to Chrome Web Store!"
echo ""
echo "Next steps:"
echo "1. Go to https://chrome.google.com/webstore/devconsole"
echo "2. Click 'New Item'"
echo "3. Upload $OUTPUT_FILE"
echo "4. Fill in store listing details (see CHROME_WEB_STORE_LISTING.md)"
echo ""
