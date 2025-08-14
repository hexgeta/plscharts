import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing PLS pool virtual price call...');
    console.log(`📄 Pool Address: ${POOL_ADDRESS}`);
    console.log(`⛓️  Chain ID: ${CHAIN_ID}`);

    const startTime = Date.now();

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
    const duration = Date.now() - startTime;
    
    const responseData = {
      success: true,
      poolAddress: POOL_ADDRESS,
      chainId: CHAIN_ID,
      virtualPrice: {
        raw: result.toString(),
        formatted: formattedPrice,
        hardcodedValue: 1.080501437346006612 // Your current hardcoded value for comparison
      },
      timestamp,
      date,
      executionTime: `${duration}ms`
    };

    console.log('✅ Virtual Price Test Results:', responseData);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Error testing virtual price:', error);
    
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('execution reverted')) {
        errorMessage = 'Contract execution reverted - check if function exists or contract is valid';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error - check RPC endpoint and internet connection';
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      poolAddress: POOL_ADDRESS,
      chainId: CHAIN_ID,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
