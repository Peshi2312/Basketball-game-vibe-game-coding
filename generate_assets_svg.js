const fs = require('fs');
const path = require('path');

// Using node-canvas or a simple canvas-like implementation
// Since node-canvas might not be available, we'll create SVG versions that can be converted

const levels = {
  'Asset_1': {
    title: 'EASY',
    color: '#4ADE80',
    difficulty: 'Beginner',
    description: 'Static Rim'
  },
  'Asset_3': {
    title: 'HARD',
    color: '#FBBF24',
    difficulty: 'Intermediate',
    description: 'Moving Rim'
  },
  'Asset_4': {
    title: 'INSANE',
    color: '#EF4444',
    difficulty: 'Expert',
    description: 'Fast Moving Rim'
  },
  'Asset_6': {
    title: 'LEGENDARY',
    color: '#A78BFA',
    difficulty: 'Master',
    description: 'Ultra Speed'
  }
};

function createSVG(levelData) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="300" height="400" viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="300" height="400" fill="#0f172a"/>
  
  <!-- Top border gradient effect -->
  <defs>
    <linearGradient id="topGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${levelData.color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${levelData.color};stop-opacity:0" />
    </linearGradient>
  </defs>
  <rect width="300" height="20" fill="url(#topGrad)"/>
  
  <!-- Border -->
  <rect x="2" y="2" width="296" height="396" fill="none" stroke="${levelData.color}" stroke-width="2" stroke-opacity="0.8"/>
  
  <!-- Ball emoji -->
  <text x="150" y="100" font-size="70" text-anchor="middle" fill="white" font-weight="bold">🏀</text>
  
  <!-- Title -->
  <text x="150" y="170" font-size="50" text-anchor="middle" fill="${levelData.color}" font-weight="bold">${levelData.title}</text>
  
  <!-- Difficulty -->
  <text x="150" y="240" font-size="32" text-anchor="middle" fill="#e5e7eb" font-weight="bold">${levelData.difficulty}</text>
  
  <!-- Description -->
  <text x="150" y="280" font-size="18" text-anchor="middle" fill="#9ca3af">${levelData.description}</text>
  
  <!-- Hint -->
  <text x="150" y="360" font-size="14" text-anchor="middle" fill="${levelData.color}" opacity="0.7">TAP TO START</text>
</svg>`;
  return svg;
}

const outputDir = __dirname;

for (const [filename, levelData] of Object.entries(levels)) {
  const svg = createSVG(levelData);
  const filepath = path.join(outputDir, `${filename}.svg`);
  fs.writeFileSync(filepath, svg);
  console.log(`Created: ${filename}.svg`);
}

console.log('\nSVG files created! Convert these to PNG using an online tool or open in a browser and save as PNG.');
