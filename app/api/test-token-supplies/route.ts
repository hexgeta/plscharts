import { NextRequest, NextResponse } from 'next/server';
import { TOKEN_CONSTANTS } from '@/constants/crypto';

// RPC endpoints
const RPC_ENDPOINTS = {
  pulsechain: 'https://rpc-pulsechain.g4mm4.io',
  ethereum: 'https://rpc-ethereum.g4mm4.io'
};

async function getTokenSupply(rpcUrl: string, tokenAddress: string): Promise<string> {
  try {
    // ERC-20 totalSupply() function signature
    const data = '0x18160ddd';
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            to: tokenAddress,
            data: data
          },
          'latest'
        ],
        id: 1
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`RPC error: ${result.error.message}`);
    }

    // Convert hex result to decimal string
    const hexValue = result.result;
    if (!hexValue || hexValue === '0x') {
      return '0';
    }

    // Convert hex to BigInt then to string to handle large numbers
    const supply = BigInt(hexValue).toString();
    return supply;
  } catch (error) {
    console.error(`Error fetching supply for ${tokenAddress}:`, error);
    return '0';
  }
}

function formatSupply(supply: string, decimals: number): number {
  if (supply === '0') return 0;
  
  try {
    const supplyBigInt = BigInt(supply);
    const divisor = BigInt(10 ** decimals);
    const formatted = Number(supplyBigInt) / Number(divisor);
    return formatted;
  } catch (error) {
    console.error('Error formatting supply:', error);
    return 0;
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('Testing token supply fetching...');
    
    // Test with just a few popular tokens
    const testTokens = TOKEN_CONSTANTS.filter(token => 
      ['PLS', 'HEX', 'PLSX', 'MAXI', 'ICSA', 'HDRN', 'eHDRN'].includes(token.ticker) &&
      token.a !== "0x0" && 
      token.a && 
      token.a.length === 42
    ).slice(0, 10); // Increased limit to include more tokens
    
    console.log(`Testing ${testTokens.length} tokens:`, testTokens.map(t => t.ticker));
    
    const results = [];
    
    for (const token of testTokens) {
      try {
        const rpcUrl = token.chain === 1 ? RPC_ENDPOINTS.ethereum : RPC_ENDPOINTS.pulsechain;
        const supply = await getTokenSupply(rpcUrl, token.a);
        const formattedSupply = formatSupply(supply, token.decimals);
        
        const result = {
          ticker: token.ticker,
          chain: token.chain,
          address: token.a,
          name: token.name,
          decimals: token.decimals,
          totalSupply: supply,
          totalSupplyFormatted: formattedSupply,
          totalSupplyReadable: formattedSupply.toLocaleString()
        };
        
        results.push(result);
        console.log(`✅ ${token.ticker}: ${formattedSupply.toLocaleString()}`);
      } catch (error) {
        console.error(`❌ Failed to fetch supply for ${token.ticker}:`, error);
        results.push({
          ticker: token.ticker,
          chain: token.chain,
          address: token.a,
          name: token.name,
          error: error.message
        });
      }
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Token supply test completed',
      results,
      summary: {
        totalTested: testTokens.length,
        successful: results.filter(r => !r.error).length,
        failed: results.filter(r => r.error).length
      }
    });
    
  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error.message },
      { status: 500 }
    );
  }
} 