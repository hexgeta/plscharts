#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Import the token constants from both files
const cryptoPath = path.join(__dirname, '../constants/crypto.ts');
const moreCoinsPath = path.join(__dirname, '../constants/more-coins.ts');

function extractTokensFromFile(filePath, exportName) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Find the export statement
    const exportRegex = new RegExp(`export const ${exportName}\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'm');
    const match = content.match(exportRegex);
    
    if (!match) {
      console.warn(`Could not find ${exportName} export in ${filePath}`);
      return [];
    }
    
    const tokensString = match[1];
    
    // Extract ticker values using regex (handle both JS object and JSON syntax)
    const tickerRegex = /["']?ticker["']?\s*:\s*["']([^"']+)["']/g;
    const tickers = [];
    let tickerMatch;
    
    while ((tickerMatch = tickerRegex.exec(tokensString)) !== null) {
      tickers.push({
        ticker: tickerMatch[1],
        file: path.basename(filePath)
      });
    }
    
    return tickers;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return [];
  }
}

function findDuplicates() {
  console.log('🔍 Analyzing token files for duplicate tickers...\n');
  
  // Extract tokens from both files
  const cryptoTokens = extractTokensFromFile(cryptoPath, 'TOKEN_CONSTANTS');
  const moreCoinsTokens = extractTokensFromFile(moreCoinsPath, 'MORE_COINS');
  
  console.log(`📊 Found ${cryptoTokens.length} tokens in crypto.ts`);
  console.log(`📊 Found ${moreCoinsTokens.length} tokens in more-coins.ts\n`);
  
  // Combine all tokens
  const allTokens = [...cryptoTokens, ...moreCoinsTokens];
  
  // Group by ticker (case-insensitive)
  const tickerGroups = {};
  
  allTokens.forEach(token => {
    const upperTicker = token.ticker.toUpperCase();
    if (!tickerGroups[upperTicker]) {
      tickerGroups[upperTicker] = [];
    }
    tickerGroups[upperTicker].push(token);
  });
  
  // Find duplicates
  const duplicates = Object.entries(tickerGroups)
    .filter(([ticker, tokens]) => tokens.length > 1)
    .sort(([a], [b]) => a.localeCompare(b));
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicate tickers found!');
    return;
  }
  
  console.log(`⚠️  Found ${duplicates.length} duplicate ticker(s):\n`);
  
  duplicates.forEach(([ticker, tokens]) => {
    console.log(`🔴 "${ticker}" (${tokens.length} occurrences):`);
    
    // Group by file
    const fileGroups = {};
    tokens.forEach(token => {
      if (!fileGroups[token.file]) {
        fileGroups[token.file] = [];
      }
      fileGroups[token.file].push(token.ticker);
    });
    
    Object.entries(fileGroups).forEach(([file, tickers]) => {
      console.log(`   📄 ${file}: ${tickers.length} occurrence(s) - ${tickers.join(', ')}`);
    });
    
    console.log(''); // Empty line between duplicates
  });
  
  // Summary
  console.log('📋 Summary:');
  console.log(`   • Total tokens analyzed: ${allTokens.length}`);
  console.log(`   • Unique tickers: ${Object.keys(tickerGroups).length}`);
  console.log(`   • Duplicate tickers: ${duplicates.length}`);
  
  if (duplicates.length > 0) {
    console.log('\n💡 Consider reviewing these duplicates to ensure they are intentional (e.g., same token on different chains)');
  }
}

// Run the analysis
findDuplicates();
