const fs = require('fs');
const path = require('path');

// Read all SVG files in the coin-logos directory
const logoDir = path.join(__dirname, '../public/coin-logos');
const logoFiles = fs.readdirSync(logoDir)
  .filter(file => file.endsWith('.svg'))
  .map(file => file.replace('.svg', ''));

// Generate the TypeScript file with the logo list
const tsContent = `// Auto-generated file - do not edit manually
// Run 'npm run generate-logos' to regenerate

export const ALL_COIN_LOGOS = ${JSON.stringify(logoFiles, null, 2)} as const;

export type CoinLogo = typeof ALL_COIN_LOGOS[number];
`;

// Write to the generated file
const outputPath = path.join(__dirname, '../constants/generated-logos.ts');
fs.writeFileSync(outputPath, tsContent);

console.log(`Generated logo list with ${logoFiles.length} logos in ${outputPath}`); 