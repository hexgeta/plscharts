#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the more-coins.ts file
const inputPath = path.join(__dirname, '../constants/more-coins.ts');

console.log('Counting tokens in:', inputPath);

try {
  // Read the file content
  const content = fs.readFileSync(inputPath, 'utf8');
  
  // Find the MORE_COINS array
  const arrayMatch = content.match(/export const MORE_COINS = \[([\s\S]*)\]/);
  if (!arrayMatch) {
    throw new Error('Could not find MORE_COINS array in the file');
  }
  
  const arrayContent = arrayMatch[1];
  
  // Count tokens by counting opening braces that start token objects
  // This regex looks for { at the start of a line or after }, (with optional whitespace)
  const tokenMatches = arrayContent.match(/(\n\s*\{|},?\s*\{)/g);
  
  let tokenCount = 0;
  if (tokenMatches) {
    tokenCount = tokenMatches.length;
  }
  
  // Alternative method: count by ticker/symbol fields
  const tickerMatches = arrayContent.match(/(ticker|symbol)\s*:/g);
  const tickerCount = tickerMatches ? tickerMatches.length : 0;
  
  // Alternative method: count by chain fields
  const chainMatches = arrayContent.match(/["\']?chain["\']?\s*:/g);
  const chainCount = chainMatches ? chainMatches.length : 0;
  
  console.log('🪙 Token count results:');
  console.log(`   By opening braces: ${tokenCount}`);
  console.log(`   By ticker/symbol fields: ${tickerCount}`);
  console.log(`   By chain fields: ${chainCount}`);
  
  // Use the highest count as the most reliable
  const finalCount = Math.max(tokenCount, tickerCount, chainCount);
  
  console.log(`\n✅ Final token count: ${finalCount} tokens`);
  
  // Show file info
  const stats = fs.statSync(inputPath);
  console.log(`📁 File size: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`📄 Total lines: ${content.split('\n').length}`);
  
} catch (error) {
  console.error('❌ Error counting tokens:', error.message);
  process.exit(1);
}
