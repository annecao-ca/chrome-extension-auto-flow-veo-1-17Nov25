// Node.js script to generate extension icons
// Requires: npm install canvas (or use generate-icons.html in browser)

const fs = require('fs');
const path = require('path');

// Simple method: create placeholder icons using a simple approach
// For production, use generate-icons.html in browser or install canvas package

const sizes = [16, 48, 128];

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('To generate icons:');
console.log('1. Open generate-icons.html in your browser');
console.log('2. Click each button to download the icons');
console.log('3. Save them to the icons/ directory');
console.log('');
console.log('Or install canvas package and run this script:');
console.log('  npm install canvas');
console.log('  node generate-icons.js');

// If canvas is available, generate icons
try {
  const { createCanvas } = require('canvas');
  
  sizes.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#1a73e8');
    gradient.addColorStop(1, '#34a853');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Draw "AFV" text
    ctx.fillStyle = 'white';
    ctx.font = `bold ${Math.floor(size * 0.4)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('AFV', size / 2, size / 2);
    
    // Save
    const buffer = canvas.toBuffer('image/png');
    const filepath = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(filepath, buffer);
    console.log(`Generated: ${filepath}`);
  });
  
  console.log('All icons generated successfully!');
} catch (error) {
  console.log('Canvas package not found. Use generate-icons.html instead.', error?.message || '');
}

