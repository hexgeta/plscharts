import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http, formatUnits } from 'viem';
import { pulsechain } from 'viem/chains';

// Pool configuration
const POOL_ADDRESS = '0xE3acFA6C40d53C3faf2aa62D0a715C737071511c';
const CHAIN_ID = 369;

// Create public client for PulseChain
const client = createPublicClient({
  chain: pulsechain,
  transport: http('https://rpc.pulsechain.com')
});

// ABI for get_virtual_price function (standard Curve pool function)
const CONTRACT_ABI = [
  {
    name: 'get_virtual_price',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256'
      }
    ]
  }
] as const;

interface PlsPoolData {
  poolAddress: string;
  chainId: number;
  virtualPriceRaw: string;
  virtualPriceFormatted: string;
  contractAddress: string;
  timestamp: string;
  date: string;
}

async function getVirtualPrice(): Promise<PlsPoolData> {
  try {
    console.log('🔗 Connecting to PulseChain...');
    console.log(`📄 Pool Address: ${POOL_ADDRESS}`);
    console.log(`⛓️  Chain ID: ${CHAIN_ID}`);

    // Read the get_virtual_price function
    const result = await client.readContract({
      address: POOL_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'get_virtual_price',
    });

    // Format the result (typically returns value with 18 decimals)
    const formattedPrice = formatUnits(result, 18);
    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0];
    
    console.log('✅ Virtual Price Retrieved:');
    console.log(`   Raw Value: ${result.toString()}`);
    console.log(`   Formatted: ${formattedPrice}`);
    console.log(`   Timestamp: ${timestamp}`);

    return {
      poolAddress: POOL_ADDRESS,
      chainId: CHAIN_ID,
      virtualPriceRaw: result.toString(),
      virtualPriceFormatted: formattedPrice,
      contractAddress: POOL_ADDRESS,
      timestamp,
      date
    };

  } catch (error) {
    console.error('❌ Error reading virtual price:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('execution reverted')) {
        throw new Error('Contract execution reverted - check if function exists or contract is valid');
      } else if (error.message.includes('network')) {
        throw new Error('Network error - check RPC endpoint and internet connection');
      }
    }
    
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify cron secret to ensure this is called by Vercel
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('🏊 Starting daily PLS pool data collection...');
    
    // Fetch virtual price from the pool
    const poolData = await getVirtualPrice();
    
    console.log(`💰 Collected PLS pool virtual price: ${poolData.virtualPriceFormatted}`);
    console.log(`⏱️  Processing took ${Date.now() - startTime}ms`);
    
    // Save to Supabase
    console.log('💾 Saving to Supabase...');
    
    // Prepare data for insertion
    const dataToInsert = {
      pool_address: poolData.poolAddress,
      chain_id: poolData.chainId,
      virtual_price_raw: poolData.virtualPriceRaw,
      virtual_price_formatted: parseFloat(poolData.virtualPriceFormatted),
      contract_address: poolData.contractAddress,
      timestamp: poolData.timestamp,
      date: poolData.date
    };
    
    console.log('📝 Data to insert:', JSON.stringify(dataToInsert, null, 2));
    
    // Upsert data (replace existing data for the same pool and date)
    const { data, error } = await supabase
      .from('pls_api_data')
      .upsert(dataToInsert, {
        onConflict: 'pool_address,chain_id,date'
      })
      .select();

    if (error) {
      console.error('❌ Supabase error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('✅ Successfully saved PLS pool data to Supabase');
    console.log(`📊 Data saved:`, data);

    const totalTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      message: 'PLS pool data collected and saved successfully',
      data: {
        poolData,
        executionTime: `${totalTime}ms`,
        recordsUpdated: data?.length || 1
      }
    });

  } catch (error) {
    console.error('💥 Error in daily PLS pool data collection:', error);
    
    const totalTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: `${totalTime}ms`
    }, { status: 500 });
  }
}
