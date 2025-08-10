#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Read the more-coins-updated.ts file (if it exists, otherwise more-coins.ts)
const updatedPath = path.join(__dirname, '../constants/more-coins-updated.ts');
const originalPath = path.join(__dirname, '../constants/more-coins.ts');
const inputPath = fs.existsSync(updatedPath) ? updatedPath : originalPath;
const outputPath = path.join(__dirname, '../constants/more-coins-updated.ts');

console.log('🔍 Finding DEX pairs for tokens without dexs values...');

// Function to make curl request to DexScreener API
function searchTokenPairs(tokenAddress, chainId) {
  return new Promise((resolve, reject) => {
    // Map chain IDs to DexScreener chain names
    const chainMap = {
      1: 'ethereum',
      369: 'pulsechain'
    };
    
    const chainName = chainMap[chainId] || 'pulsechain';
    const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
    
    const curl = spawn('curl', [
      '-s',
      '-H', 'Accept: application/json',
      url
    ]);
    
    let data = '';
    let error = '';
    
    curl.stdout.on('data', (chunk) => {
      data += chunk;
    });
    
    curl.stderr.on('data', (chunk) => {
      error += chunk;
    });
    
    curl.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`curl failed with code ${code}: ${error}`));
        return;
      }
      
      try {
        const response = JSON.parse(data);
        resolve(response);
      } catch (e) {
        reject(new Error(`Failed to parse JSON: ${e.message}`));
      }
    });
  });
}

// Function to find best pair for a token
async function findBestPair(tokenAddress, chainId, ticker) {
  try {
    console.log(`  📊 Searching pairs for ${ticker} (${tokenAddress})...`);
    
    const response = await searchTokenPairs(tokenAddress, chainId);
    
    if (!response.pairs || response.pairs.length === 0) {
      console.log(`    ❌ No pairs found for ${ticker}`);
      return null;
    }
    
    // Filter pairs by chain and sort by liquidity/volume
    const validPairs = response.pairs
      .filter(pair => {
        // Check if the pair is on the correct chain
        const isCorrectChain = (chainId === 369 && pair.chainId === 'pulsechain') ||
                              (chainId === 1 && pair.chainId === 'ethereum');
        
        // Check if pair has good liquidity
        const hasLiquidity = pair.liquidity && pair.liquidity.usd > 1000;
        
        return isCorrectChain && hasLiquidity;
      })
      .sort((a, b) => {
        // Sort by liquidity first, then by 24h volume
        const liquidityDiff = (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0);
        if (liquidityDiff !== 0) return liquidityDiff;
        
        return (b.volume?.h24 || 0) - (a.volume?.h24 || 0);
      });
    
    if (validPairs.length === 0) {
      console.log(`    ❌ No valid pairs found for ${ticker} on chain ${chainId}`);
      return null;
    }
    
    const bestPair = validPairs[0];
    console.log(`    ✅ Found pair for ${ticker}: ${bestPair.pairAddress} (Liquidity: $${(bestPair.liquidity?.usd || 0).toLocaleString()})`);
    
    return bestPair.pairAddress;
    
  } catch (error) {
    console.log(`    ❌ Error searching for ${ticker}: ${error.message}`);
    return null;
  }
}

// Main function
async function main() {
  try {
    // Read the file content
    const content = fs.readFileSync(inputPath, 'utf8');
    
    // Extract the MORE_COINS array
    const arrayMatch = content.match(/export const MORE_COINS = \[([\s\S]*)\]/);
    if (!arrayMatch) {
      throw new Error('Could not find MORE_COINS array in the file');
    }
    
    const beforeArray = content.substring(0, arrayMatch.index + 'export const MORE_COINS = ['.length);
    const afterArray = content.substring(arrayMatch.index + arrayMatch[0].length - 1); // Include the closing ]
    const arrayContent = arrayMatch[1];
    
    // Parse tokens using regex
    const tokenRegex = /\{[\s\S]*?\}/g;
    const tokens = [];
    let match;
    
    while ((match = tokenRegex.exec(arrayContent)) !== null) {
      const tokenStr = match[0];
      
      // Extract values using regex
      const chain = (tokenStr.match(/["\']?chain["\']?\s*:\s*(\d+)/) || [])[1];
      const address = (tokenStr.match(/["\']?a["\']?\s*:\s*["\']([^"\']+)["\']/) || [])[1];
      const ticker = (tokenStr.match(/["\']?ticker["\']?\s*:\s*["\']([^"\']+)["\']/) || [])[1];
      const dexs = (tokenStr.match(/["\']?dexs["\']?\s*:\s*["\']([^"\']*)["\']/) || [])[1];
      
      if (chain && address && ticker) {
        tokens.push({
          originalText: tokenStr,
          chain: parseInt(chain),
          address: address,
          ticker: ticker,
          dexs: dexs || '',
          needsPair: !dexs || dexs.trim() === ''
        });
      }
    }
    
    console.log(`📊 Found ${tokens.length} tokens total`);
    const tokensNeedingPairs = tokens.filter(t => t.needsPair);
    console.log(`🔍 ${tokensNeedingPairs.length} tokens need DEX pair addresses`);
    
    if (tokensNeedingPairs.length === 0) {
      console.log('✅ All tokens already have DEX pair addresses!');
      return;
    }
    
    // Process tokens in batches to avoid rate limiting
    const batchSize = 5;
    const delay = 2000; // 2 second delay between batches
    
    for (let i = 0; i < tokensNeedingPairs.length; i += batchSize) {
      const batch = tokensNeedingPairs.slice(i, i + batchSize);
      
      console.log(`\n🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(tokensNeedingPairs.length/batchSize)}...`);
      
      // Process batch in parallel
      const batchPromises = batch.map(token => 
        findBestPair(token.address, token.chain, token.ticker)
          .then(pairAddress => ({
            token,
            pairAddress
          }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      // Update tokens with found pairs
      batchResults.forEach(({ token, pairAddress }) => {
        if (pairAddress) {
          // Update the original token object
          const tokenIndex = tokens.findIndex(t => t.address === token.address && t.chain === token.chain);
          if (tokenIndex !== -1) {
            tokens[tokenIndex].dexs = pairAddress;
            // Update the original text
            tokens[tokenIndex].originalText = tokens[tokenIndex].originalText.replace(
              /(["\']?dexs["\']?\s*:\s*["\'])[^"\']*(["\'])/,
              `$1${pairAddress}$2`
            );
          }
        }
      });
      
      // Delay between batches
      if (i + batchSize < tokensNeedingPairs.length) {
        console.log(`⏱️  Waiting ${delay/1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Reconstruct the file content
    const updatedArrayContent = tokens.map(t => t.originalText).join(',\n');
    const updatedContent = beforeArray + '\n' + updatedArrayContent + '\n' + afterArray;
    
    // Write the updated content
    fs.writeFileSync(outputPath, updatedContent);
    
    const foundPairs = tokens.filter(t => t.dexs && t.dexs.trim() !== '').length;
    const totalTokens = tokens.length;
    
    console.log('\n✅ DEX pair search completed!');
    console.log(`📊 Results: ${foundPairs}/${totalTokens} tokens now have DEX pairs`);
    console.log(`📁 Updated file saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
