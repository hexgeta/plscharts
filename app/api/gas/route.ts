import { NextRequest, NextResponse } from 'next/server';

const ETHEREUM_RPC = 'https://eth.llamarpc.com';
const PULSECHAIN_RPC = 'https://rpc-pulsechain.g4mm4.io';

interface RPCResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

interface GasData {
  network: string;
  currentGasPrice: string;
  currentGasPriceGwei: number;
  feeHistory?: {
    baseFeePerGas: string[];
    gasUsedRatio: number[];
    oldestBlock: string;
    reward?: string[][];
  };
  timestamp: string;
}

interface GasResponse {
  success: boolean;
  data: {
    ethereum: GasData;
    pulsechain: GasData;
    comparison: {
      ethereumGwei: number;
      pulsechainGwei: number;
      difference: number;
      pulsechainCheaperBy: string;
    };
  };
  timestamp: string;
}

async function fetchGasPrice(rpcUrl: string, networkName: string): Promise<GasData> {
  // Get current gas price
  const gasPriceResponse = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_gasPrice',
      params: [],
      id: 1
    })
  });

  const gasPriceResult: RPCResponse = await gasPriceResponse.json();
  
  if (gasPriceResult.error) {
    throw new Error(`Failed to get gas price for ${networkName}: ${gasPriceResult.error.message}`);
  }

  const gasPriceWei = gasPriceResult.result;
  const gasPriceGwei = parseInt(gasPriceWei, 16) / 1e9;

  // Get fee history in 7 batches of 1000 blocks each (total 7000 blocks)
  const batchSize = 1000; // 0x3E8 in hex
  const numBatches = 7;
  let allBaseFeePerGas: string[] = [];
  let allGasUsedRatio: number[] = [];
  let allReward: string[][] = [];
  let oldestBlock = '';

  for (let batch = 0; batch < numBatches; batch++) {
    const blocksBack = batch * batchSize;
    
    const feeHistoryResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_feeHistory',
        params: [
          '0x3E8', // 1000 blocks in hex
          blocksBack === 0 ? 'latest' : `latest-${blocksBack}`,
          [25, 50, 75] // 25th, 50th, 75th percentiles
        ],
        id: 2 + batch
      })
    });

    const feeHistoryResult: RPCResponse = await feeHistoryResponse.json();
    
    if (!feeHistoryResult.error && feeHistoryResult.result) {
      const result = feeHistoryResult.result;
      
      // Prepend data to maintain chronological order (oldest first)
      allBaseFeePerGas = [...result.baseFeePerGas, ...allBaseFeePerGas];
      allGasUsedRatio = [...result.gasUsedRatio, ...allGasUsedRatio];
      if (result.reward) {
        allReward = [...result.reward, ...allReward];
      }
      
      // Keep track of the oldest block
      if (result.oldestBlock) {
        oldestBlock = result.oldestBlock;
      }
    }
    
    // Small delay between requests to be nice to the RPC
    if (batch < numBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  const gasData: GasData = {
    network: networkName,
    currentGasPrice: gasPriceWei,
    currentGasPriceGwei: gasPriceGwei,
    timestamp: new Date().toISOString()
  };

  // Combine all fee history data
  if (allBaseFeePerGas.length > 0) {
    gasData.feeHistory = {
      baseFeePerGas: allBaseFeePerGas,
      gasUsedRatio: allGasUsedRatio,
      oldestBlock: oldestBlock,
      reward: allReward.length > 0 ? allReward : undefined
    };
  }

  return gasData;
}

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching gas price data for Ethereum and PulseChain...');

    // Fetch gas data from both networks in parallel
    const [ethereumData, pulsechainData] = await Promise.all([
      fetchGasPrice(ETHEREUM_RPC, 'Ethereum'),
      fetchGasPrice(PULSECHAIN_RPC, 'PulseChain')
    ]);

    // Calculate comparison
    const ethereumGwei = ethereumData.currentGasPriceGwei;
    const pulsechainGwei = pulsechainData.currentGasPriceGwei;
    const difference = ethereumGwei - pulsechainGwei;
    const multiplier = ethereumGwei / pulsechainGwei;

    const response: GasResponse = {
      success: true,
      data: {
        ethereum: ethereumData,
        pulsechain: pulsechainData,
        comparison: {
          ethereumGwei,
          pulsechainGwei,
          difference,
          pulsechainCheaperBy: `${multiplier.toFixed(1)}x`
        }
      },
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Gas prices fetched - ETH: ${ethereumGwei.toFixed(2)} gwei, PLS: ${pulsechainGwei.toFixed(6)} gwei`);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Failed to fetch gas prices:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      data: null,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 