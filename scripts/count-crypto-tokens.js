#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the crypto.ts file
const inputPath = path.join(__dirname, '../constants/crypto.ts');

console.log('Counting tokens in:', inputPath);

try {
  // Read the file content
  const content = fs.readFileSync(inputPath, 'utf8');
  
  // Find the TOKEN_CONSTANTS array
  const arrayMatch = content.match(/export const TOKEN_CONSTANTS = \[([\s\S]*)\]/);
  if (!arrayMatch) {
    throw new Error('Could not find TOKEN_CONSTANTS array in the file');
  }
  
  const arrayContent = arrayMatch[1];
  
  // Count tokens by counting opening braces that start token objects
  const tokenMatches = arrayContent.match(/(\n\s*\{|},?\s*\{)/g);
  
  let tokenCount = 0;
  if (tokenMatches) {
    tokenCount = tokenMatches.length;
  }
  
  // Alternative method: count by ticker fields
  const tickerMatches = arrayContent.match(/ticker\s*:/g);
  const tickerCount = tickerMatches ? tickerMatches.length : 0;
  
  // Alternative method: count by chain fields
  const chainMatches = arrayContent.match(/chain\s*:/g);
  const chainCount = chainMatches ? chainMatches.length : 0;
  
  // Alternative method: count by 'a' (address) fields
  const addressMatches = arrayContent.match(/a\s*:/g);
  const addressCount = addressMatches ? addressMatches.length : 0;
  
  console.log('🪙 Token count results:');
  console.log(`   By opening braces: ${tokenCount}`);
  console.log(`   By ticker fields: ${tickerCount}`);
  console.log(`   By chain fields: ${chainCount}`);
  console.log(`   By address fields: ${addressCount}`);
  
  // Use the highest count as the most reliable
  const finalCount = Math.max(tokenCount, tickerCount, chainCount, addressCount);
  
  console.log(`\n✅ Final token count: ${finalCount} tokens`);
  
  // Show file info
  const stats = fs.statSync(inputPath);
  console.log(`📁 File size: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`📄 Total lines: ${content.split('\n').length}`);
  
  // Show a few sample tokens
  const sampleTokens = [];
  const tokenRegex = /\{\s*chain:\s*\d+,[\s\S]*?ticker:\s*"([^"]+)"[\s\S]*?\}/g;
  let match;
  let sampleCount = 0;
  while ((match = tokenRegex.exec(arrayContent)) && sampleCount < 3) {
    sampleTokens.push(match[1]);
    sampleCount++;
  }
  
  if (sampleTokens.length > 0) {
    console.log(`\n📋 Sample tokens: ${sampleTokens.join(', ')}...`);
  }
  
} catch (error) {
  console.error('❌ Error counting tokens:', error.message);
  process.exit(1);
}
