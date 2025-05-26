import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TOKEN_CONSTANTS } from '@/constants/crypto';

// Force dynamic rendering since we use request headers
export const dynamic = 'force-dynamic';

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
  total_supply: string;
  total_supply_formatted: number;
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
  const errors: string[] = [];
  
  // Optimized batch size based on G4MM4/Erigon capabilities
  const batchSize = 10; // Conservative batch size for RPC calls
  const tokens = TOKEN_CONSTANTS.filter(token => 
    token.a !== "0x0" && // Skip native tokens
    token.a && 
    token.a.length === 42 // Valid Ethereum address format
  );
  
  console.log(`Processing ${tokens.length} tokens in batches of ${batchSize}`);
  
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(tokens.length / batchSize);
    
    console.log(`Processing batch ${batchNumber}/${totalBatches} (tokens ${i + 1}-${Math.min(i + batchSize, tokens.length)})`);
    
    const batchPromises = batch.map(async (token, index) => {
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
          total_supply: supply,
          total_supply_formatted: formattedSupply,
          timestamp,
          date
        };
        
        console.log(`✅ ${token.ticker}: ${formattedSupply.toLocaleString()}`);
        return supplyData;
      } catch (error) {
        const errorMsg = `❌ ${token.ticker}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        
        // Return zero supply data for failed tokens
        return {
          ticker: token.ticker,
          chain: token.chain,
          address: token.a,
          name: token.name,
          decimals: token.decimals,
          total_supply: '0',
          total_supply_formatted: 0,
          timestamp,
          date
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    supplies.push(...batchResults);
    
    console.log(`Batch ${batchNumber} completed: ${batchResults.length} tokens processed`);
    
    // Reduced delay between batches - G4MM4 can handle concurrent requests well
    if (i + batchSize < tokens.length) {
      await new Promise(resolve => setTimeout(resolve, 200)); // Reduced from 500ms
    }
  }
  
  if (errors.length > 0) {
    console.log(`Total errors encountered: ${errors.length}`);
    console.log('Error summary:', errors.slice(0, 10)); // Log first 10 errors
  }
  
  return supplies;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify cron secret to ensure this is called by Vercel
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Supabase client inside the function to avoid build-time errors
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    console.log('Starting daily token supply collection...');
    
    // Fetch all token supplies
    const supplies = await fetchAllTokenSupplies();
    
    console.log(`Collected supplies for ${supplies.length} tokens`);
    console.log(`Processing took ${Date.now() - startTime}ms`);
    
    // Save to Supabase with better error handling
    console.log('Saving to Supabase...');
    
    // First, try to save all at once
    const { data, error } = await supabase
      .from('daily_token_supplies')
      .insert(supplies);

    let savedCount = 0;
    
    if (error) {
      console.error('Bulk insert failed:', error.message);
      console.log('Attempting to save in smaller batches...');
      
      // Try to save in smaller batches if the full insert fails
      const batchSize = 25; // Smaller batches for Supabase
      
      for (let i = 0; i < supplies.length; i += batchSize) {
        const batch = supplies.slice(i, i + batchSize);
        const { data: batchData, error: batchError } = await supabase
          .from('daily_token_supplies')
          .insert(batch);
          
        if (batchError) {
          console.error(`Batch ${i}-${i + batch.length} failed:`, batchError.message);
          
          // Try individual inserts for this batch
          for (const item of batch) {
            const { error: itemError } = await supabase
              .from('daily_token_supplies')
              .insert([item]);
              
            if (itemError) {
              console.error(`Failed to save ${item.ticker}:`, itemError.message);
            } else {
              savedCount++;
            }
          }
        } else {
          savedCount += batch.length;
          console.log(`Saved batch ${i}-${i + batch.length} successfully (${batch.length} records)`);
        }
        
        // Small delay between Supabase batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`Final result: Saved ${savedCount}/${supplies.length} records`);
    } else {
      savedCount = supplies.length;
      console.log(`Successfully saved all ${supplies.length} token supplies to database`);
    }
    
    // Summary statistics
    const totalSupplies = supplies.reduce((sum, token) => sum + token.total_supply_formatted, 0);
    const successfulFetches = supplies.filter(s => s.total_supply_formatted > 0).length;
    const executionTime = Date.now() - startTime;
    
    console.log(`=== FINAL SUMMARY ===`);
    console.log(`Total tokens processed: ${supplies.length}`);
    console.log(`Successful fetches: ${successfulFetches}`);
    console.log(`Failed fetches: ${supplies.length - successfulFetches}`);
    console.log(`Records saved to DB: ${savedCount}`);
    console.log(`Execution time: ${executionTime}ms`);
    
    return NextResponse.json({ 
      success: true,
      summary: {
        totalTokens: supplies.length,
        successfulFetches,
        failedFetches: supplies.length - successfulFetches,
        recordsSaved: savedCount,
        totalCombinedSupply: totalSupplies,
        executionTimeMs: executionTime,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('Cron job failed:', error);
    console.error('Execution time before failure:', executionTime, 'ms');
    
    return NextResponse.json(
      { 
        error: 'Failed to collect token supplies', 
        details: error.message,
        executionTimeMs: executionTime
      },
      { status: 500 }
    );
  }
} 