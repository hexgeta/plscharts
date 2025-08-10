#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the more-coins-final.ts file
const inputPath = path.join(__dirname, '../constants/more-coins-final.ts');
const outputPath = path.join(__dirname, '../constants/more-coins-final-converted.ts');

console.log('Reading from:', inputPath);
console.log('Writing to:', outputPath);

try {
  // Read the file content
  let content = fs.readFileSync(inputPath, 'utf8');
  
  // Find the start and end of the array
  const startMatch = content.match(/export const TOKEN_CONSTANTS = \[/);
  const endMatch = content.match(/\];[\s\S]*export const API_ENDPOINTS/);
  
  if (!startMatch || !endMatch) {
    throw new Error('Could not find TOKEN_CONSTANTS array boundaries');
  }
  
  const startIndex = startMatch.index + startMatch[0].length;
  const endIndex = content.indexOf('];', startIndex);
  
  if (endIndex === -1) {
    throw new Error('Could not find end of TOKEN_CONSTANTS array');
  }
  
  const arrayContent = content.substring(startIndex, endIndex);
  
  // Process tokens using regex
  const tokenRegex = /\{[\s\S]*?\}/g;
  const tokens = [];
  let match;
  
  while ((match = tokenRegex.exec(arrayContent)) !== null) {
    const tokenStr = match[0];
    
    // Extract values using regex
    const chainId = (tokenStr.match(/"chainId":\s*(\d+)/) || [])[1];
    const address = (tokenStr.match(/"address":\s*"([^"]+)"/) || [])[1];
    const symbol = (tokenStr.match(/"symbol":\s*"([^"]+)"/) || [])[1];
    const name = (tokenStr.match(/"name":\s*"([^"]+)"/) || [])[1];
    const decimals = (tokenStr.match(/"decimals":\s*(\d+)/) || [])[1];
    
    if (chainId && address && symbol && name && decimals) {
      tokens.push({
        chain: parseInt(chainId),
        a: address,
        dexs: "",
        ticker: symbol,
        decimals: parseInt(decimals),
        name: name
      });
    }
  }
  
  // Generate the output content
  const header = `import { PairData } from '@/types/crypto'

export interface TokenConfig {
  chain: number
  a: string
  dexs: string | string[]
  ticker: string
  decimals: number
  name: string
  origin?: [number, string]
  supply?: number
  type?: "lp" | "token"
  platform?: string
}

export const MORE_COINS = [`;

  const footer = `]

const getLogoPath = (ticker: string): string | null => {
  // This would contain logo path logic if needed
  return null
}

export default MORE_COINS`;

  // Format each token
  const formattedTokens = tokens.map(token => {
    return `  {
    "chain": ${token.chain},
    "a": "${token.a}",
    "dexs": "${token.dexs}",
    "ticker": "${token.ticker}",
    "decimals": ${token.decimals},
    "name": "${token.name}"
  }`;
  });
  
  const outputContent = header + '\n' + formattedTokens.join(',\n') + '\n' + footer;
  
  // Write the converted content
  fs.writeFileSync(outputPath, outputContent);
  
  console.log('✅ Conversion completed successfully!');
  console.log(`📁 Output saved to: ${outputPath}`);
  console.log(`🪙 Converted ${tokens.length} tokens`);
  
  // Show a few examples
  console.log('\n📋 First 3 converted tokens:');
  tokens.slice(0, 3).forEach((token, i) => {
    console.log(`${i + 1}. ${token.ticker} (${token.name}) - Chain: ${token.chain}`);
  });
  
} catch (error) {
  console.error('❌ Error during conversion:', error.message);
  process.exit(1);
}