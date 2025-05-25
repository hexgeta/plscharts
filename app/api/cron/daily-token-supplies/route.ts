import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TOKEN_CONSTANTS } from '@/constants/crypto';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// RPC endpoints
const RPC_ENDPOINTS = {
  pulsechain: 'https://rpc-pulsechain.g4mm4.io',
  ethereum: 'https://rpc-ethereum.g4mm4.io'
};

interface TokenSupplyData {
  ticker: string;
  chain: number;
  address: string;
  name: string;
  decimals: number;
  totalSupply: string;
  totalSupplyFormatted: number;
  timestamp: string;
  date: string;
}

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

async function fetchAllTokenSupplies(): Promise<TokenSupplyData[]> {
  const now = new Date();
  const timestamp = now.toISOString();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const supplies: TokenSupplyData[] = [];
  
  // Process tokens in batches to avoid overwhelming the RPC endpoints
  const batchSize = 10;
  const tokens = TOKEN_CONSTANTS.filter(token => 
    token.a !== "0x0" && // Skip native tokens
    token.a && 
    token.a.length === 42 // Valid Ethereum address format
  );
  
  console.log(`Processing ${tokens.length} tokens in batches of ${batchSize}`);
  
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (token) => {
      try {
        const rpcUrl = token.chain === 1 ? RPC_ENDPOINTS.ethereum : RPC_ENDPOINTS.pulsechain;
        const supply = await getTokenSupply(rpcUrl, token.a);
        const formattedSupply = formatSupply(supply, token.decimals);
        
        const supplyData: TokenSupplyData = {
          ticker: token.ticker,
          chain: token.chain,
          address: token.a,
          name: token.name,
          decimals: token.decimals,
          totalSupply: supply,
          totalSupplyFormatted: formattedSupply,
          timestamp,
          date
        };
        
        console.log(`✅ ${token.ticker}: ${formattedSupply.toLocaleString()}`);
        return supplyData;
      } catch (error) {
        console.error(`❌ Failed to fetch supply for ${token.ticker}:`, error);
        
        // Return zero supply data for failed tokens
        return {
          ticker: token.ticker,
          chain: token.chain,
          address: token.a,
          name: token.name,
          decimals: token.decimals,
          totalSupply: '0',
          totalSupplyFormatted: 0,
          timestamp,
          date
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    supplies.push(...batchResults);
    
    // Small delay between batches to be respectful to RPC endpoints
    if (i + batchSize < tokens.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return supplies;
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to ensure this is called by Vercel
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting daily token supply collection...');
    
    // Fetch all token supplies
    const supplies = await fetchAllTokenSupplies();
    
    console.log(`Collected supplies for ${supplies.length} tokens`);
    
    // Save to Supabase
    const { data, error } = await supabase
      .from('daily_token_supplies')
      .insert(supplies);

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Successfully saved token supplies to database');
    
    // Summary statistics
    const totalSupplies = supplies.reduce((sum, token) => sum + token.totalSupplyFormatted, 0);
    const successfulFetches = supplies.filter(s => s.totalSupplyFormatted > 0).length;
    
    return NextResponse.json({ 
      success: true,
      summary: {
        totalTokens: supplies.length,
        successfulFetches,
        failedFetches: supplies.length - successfulFetches,
        totalCombinedSupply: totalSupplies,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      { error: 'Failed to collect token supplies', details: error.message },
      { status: 500 }
    );
  }
} 