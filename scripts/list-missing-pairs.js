#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the updated more-coins file
const inputPath = path.join(__dirname, '../constants/more-coins-updated.ts');

console.log('📋 Listing tokens without DEX pair addresses...\n');

try {
  const content = fs.readFileSync(inputPath, 'utf8');
  
  // Extract the MORE_COINS array
  const arrayMatch = content.match(/export const MORE_COINS = \[([\s\S]*)\]/);
  if (!arrayMatch) {
    throw new Error('Could not find MORE_COINS array in the file');
  }
  
  const arrayContent = arrayMatch[1];
  
  // Parse tokens using regex
  const tokenRegex = /\{[\s\S]*?\}/g;
  const tokensWithoutPairs = [];
  let match;
  
  while ((match = tokenRegex.exec(arrayContent)) !== null) {
    const tokenStr = match[0];
    
    // Extract values using regex
    const chain = (tokenStr.match(/["\']?chain["\']?\s*:\s*(\d+)/) || [])[1];
    const address = (tokenStr.match(/["\']?a["\']?\s*:\s*["\']([^"\']+)["\']/) || [])[1];
    const ticker = (tokenStr.match(/["\']?ticker["\']?\s*:\s*["\']([^"\']+)["\']/) || [])[1];
    const name = (tokenStr.match(/["\']?name["\']?\s*:\s*["\']([^"\']+)["\']/) || [])[1];
    const dexs = (tokenStr.match(/["\']?dexs["\']?\s*:\s*["\']([^"\']*)["\']/) || [])[1];
    
    if (chain && address && ticker && (!dexs || dexs.trim() === '' || dexs === 'xxx')) {
      tokensWithoutPairs.push({
        ticker,
        name: name || 'Unknown',
        chain: parseInt(chain),
        address
      });
    }
  }
  
  console.log(`🔍 Found ${tokensWithoutPairs.length} tokens without DEX pair addresses:\n`);
  
  // Group by chain
  const chainGroups = {};
  tokensWithoutPairs.forEach(token => {
    if (!chainGroups[token.chain]) {
      chainGroups[token.chain] = [];
    }
    chainGroups[token.chain].push(token);
  });
  
  // Display grouped results
  Object.keys(chainGroups).sort().forEach(chainId => {
    const chainName = chainId === '1' ? 'Ethereum' : chainId === '369' ? 'PulseChain' : `Chain ${chainId}`;
    const tokens = chainGroups[chainId];
    
    console.log(`📊 ${chainName} (${tokens.length} tokens):`);
    console.log('─'.repeat(50));
    
    tokens.forEach((token, index) => {
      console.log(`${(index + 1).toString().padStart(3)}. ${token.ticker.padEnd(12)} - ${token.name}`);
    });
    
    console.log('');
  });
  
  // Summary
  console.log('📈 Summary:');
  console.log(`   Total tokens without pairs: ${tokensWithoutPairs.length}`);
  console.log(`   Ethereum tokens: ${chainGroups['1']?.length || 0}`);
  console.log(`   PulseChain tokens: ${chainGroups['369']?.length || 0}`);
  console.log(`   Other chains: ${tokensWithoutPairs.length - (chainGroups['1']?.length || 0) - (chainGroups['369']?.length || 0)}`);
  
  // Export as simple list
  console.log('\n📝 Simple ticker list:');
  console.log(tokensWithoutPairs.map(t => t.ticker).join(', '));
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
