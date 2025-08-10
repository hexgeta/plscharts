#!/usr/bin/env node

const { spawn } = require('child_process');

// Test the DexScreener API with a known token
async function testDexScreenerAPI() {
  console.log('🧪 Testing DexScreener API...');
  
  // Test with YEET token from PulseChain
  const testAddress = '0x6Afd30110e9fF1b29dB3c4DAf31EF0045a6552cB';
  const url = `https://api.dexscreener.com/latest/dex/tokens/${testAddress}`;
  
  console.log(`📡 Testing URL: ${url}`);
  
  return new Promise((resolve, reject) => {
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
        console.error(`❌ curl failed with code ${code}: ${error}`);
        reject(new Error(`curl failed: ${error}`));
        return;
      }
      
      try {
        const response = JSON.parse(data);
        console.log('✅ API Response received');
        console.log('📊 Pairs found:', response.pairs ? response.pairs.length : 0);
        
        if (response.pairs && response.pairs.length > 0) {
          const pulsechainPairs = response.pairs.filter(p => p.chainId === 'pulsechain');
          console.log('🔗 PulseChain pairs:', pulsechainPairs.length);
          
          if (pulsechainPairs.length > 0) {
            const bestPair = pulsechainPairs[0];
            console.log('🏆 Best pair:');
            console.log(`   Address: ${bestPair.pairAddress}`);
            console.log(`   DEX: ${bestPair.dexId}`);
            console.log(`   Liquidity: $${(bestPair.liquidity?.usd || 0).toLocaleString()}`);
            console.log(`   24h Volume: $${(bestPair.volume?.h24 || 0).toLocaleString()}`);
          }
        }
        
        resolve(response);
      } catch (e) {
        console.error(`❌ Failed to parse JSON: ${e.message}`);
        console.error('Raw response:', data.substring(0, 500));
        reject(e);
      }
    });
  });
}

// Run the test
testDexScreenerAPI()
  .then(() => {
    console.log('\n✅ API test completed successfully!');
    console.log('🚀 Ready to run the full script with: node scripts/find-dex-pairs.js');
  })
  .catch(error => {
    console.error('\n❌ API test failed:', error.message);
    process.exit(1);
  });
