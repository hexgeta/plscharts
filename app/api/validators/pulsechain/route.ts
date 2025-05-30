import { NextRequest, NextResponse } from 'next/server';

const PULSECHAIN_RPC = 'https://rpc-pulsechain.g4mm4.io';

// Common staking contract addresses to try
const POTENTIAL_STAKING_CONTRACTS = [
  '0x0000000000000000000000000000000000001000', // Common system contract
  '0x0000000000000000000000000000000000001001', // Another common system contract
  '0x0000000000000000000000000000000000002000', // Validator set contract
  '0x0000000000000000000000000000000000002001', // Staking contract
  '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4', // Common deployment address
  '0x242E2B425C33F1CEEbE7DA3E6E3F1F7DACa07a5e', // Another possibility
];

// Common staking-related function signatures
const STAKING_FUNCTIONS = {
  getValidators: '0xb7ab4db5', // getValidators()
  validatorCount: '0x61bc221a', // validatorCount()
  currentValidatorSet: '0x6969a25c', // currentValidatorSet()
  getActiveValidators: '0x9de70258', // getActiveValidators()
  totalValidators: '0x3ccfd60b', // totalValidators()
  validatorSetSize: '0x832fef67', // validatorSetSize()
};

interface ValidatorInfo {
  address: string;
  blockNumber: string;
  timestamp: string;
}

interface ValidatorResponse {
  count: number;
  recentValidators: ValidatorInfo[];
  uniqueValidators: string[];
  method: string;
  timestamp: string;
  blocksAnalyzed: number;
  disclaimer?: string;
  stakingContract?: string;
}

interface RPCResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

interface BlockResult {
  number: string;
  timestamp: string;
  miner: string;
  [key: string]: any;
}

async function tryStakingContract(contractAddress: string): Promise<any> {
  console.log(`Trying staking contract: ${contractAddress}`);
  
  for (const [functionName, signature] of Object.entries(STAKING_FUNCTIONS)) {
    try {
      const response = await fetch(PULSECHAIN_RPC, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [
            {
              to: contractAddress,
              data: signature
            },
            'latest'
          ],
          id: 1
        })
      });

      const result: RPCResponse = await response.json();
      
      if (!result.error && result.result && result.result !== '0x') {
        console.log(`✅ Function ${functionName} succeeded on ${contractAddress}: ${result.result}`);
        
        // Try to decode the result
        if (result.result.length > 2) {
          try {
            const value = parseInt(result.result, 16);
            if (value > 0 && value < 1000000) { // Reasonable validator count range
              return {
                contract: contractAddress,
                function: functionName,
                count: value,
                raw: result.result
              };
            }
          } catch (e) {
            // Could be array or complex data
            console.log(`Complex result from ${functionName}: ${result.result.slice(0, 100)}...`);
          }
        }
      }
    } catch (error) {
      console.log(`${functionName} error on ${contractAddress}:`, error);
    }
  }
  
  return null;
}

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching PulseChain validator information...');
    
    // First try to find staking contracts
    console.log('🔍 Searching for staking contracts...');
    for (const contractAddress of POTENTIAL_STAKING_CONTRACTS) {
      const stakingResult = await tryStakingContract(contractAddress);
      if (stakingResult) {
        console.log(`✅ Found validator data via staking contract!`);
        return NextResponse.json({
          success: true,
          data: {
            count: stakingResult.count,
            method: `staking_contract_${stakingResult.function}`,
            stakingContract: stakingResult.contract,
            timestamp: new Date().toISOString(),
            recentValidators: [],
            uniqueValidators: [],
            blocksAnalyzed: 0,
            disclaimer: `Validator count retrieved from staking contract ${stakingResult.contract} using ${stakingResult.function}()`
          },
          message: `Found ${stakingResult.count} validators via staking contract`
        });
      }
    }

    // Try multiple RPC methods to get validator information
    const methods = [
      'bor_getCurrentValidators',
      'bor_getValidators', 
      'eth_validatorSet',
      'parity_validatorSet',
      'parlia_getCurrentValidators',
      'eth_getValidators',
      'pos_getValidators'
    ];

    for (const method of methods) {
      try {
        console.log(`Trying RPC method: ${method}`);
        const response = await fetch(PULSECHAIN_RPC, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: method,
            params: [],
            id: 1
          })
        });

        const result: RPCResponse = await response.json();
        
        if (!result.error && result.result && Array.isArray(result.result)) {
          const validators = result.result;
          console.log(`✅ Found ${validators.length} validators using ${method}`);
          
          return NextResponse.json({
            success: true,
            data: {
              count: validators.length,
              validators: validators,
              method: method,
              timestamp: new Date().toISOString(),
              recentValidators: [],
              uniqueValidators: validators.map((v: any) => v.address || v),
              blocksAnalyzed: 0
            }
          });
        }
        console.log(`${method} failed or returned no data`);
      } catch (error) {
        console.log(`${method} error:`, error);
      }
    }

    // Alternative: Get current block number and analyze MORE recent blocks for validators
    const latestBlockResponse = await fetch(PULSECHAIN_RPC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    });

    const latestBlockResult: RPCResponse = await latestBlockResponse.json();
    if (latestBlockResult.error) {
      throw new Error(`Failed to get latest block: ${latestBlockResult.error.message}`);
    }

    const latestBlockHex = latestBlockResult.result;
    const latestBlock = parseInt(latestBlockHex, 16);
    
    console.log(`Latest block: ${latestBlock}`);

    // Analyze last 1000 blocks to find unique validators/miners (increased from 100)
    const blocksToCheck = 1000;
    const startBlock = Math.max(0, latestBlock - blocksToCheck);
    const validators = new Set<string>();
    const recentValidators: ValidatorInfo[] = [];

    // Check blocks in batches to avoid overwhelming the RPC
    const batchSize = 10;
    for (let i = startBlock; i <= latestBlock; i += batchSize) {
      const batchPromises: Promise<RPCResponse>[] = [];
      
      for (let j = i; j < Math.min(i + batchSize, latestBlock + 1); j++) {
        const blockHex = '0x' + j.toString(16);
        
        batchPromises.push(
          fetch(PULSECHAIN_RPC, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getBlockByNumber',
              params: [blockHex, false],
              id: j
            })
          }).then(res => res.json() as Promise<RPCResponse>)
        );
      }

      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        if (!result.error && result.result && result.result.miner) {
          const blockData: BlockResult = result.result;
          const miner = blockData.miner;
          const blockNum = parseInt(blockData.number, 16);
          const timestamp = new Date(parseInt(blockData.timestamp, 16) * 1000).toISOString();
          
          validators.add(miner);
          recentValidators.push({
            address: miner,
            blockNumber: blockNum.toString(),
            timestamp: timestamp
          });
        }
      }

      // Smaller delay between batches for faster processing
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const uniqueValidatorsList = Array.from(validators);
    const validatorCount = uniqueValidatorsList.length;

    console.log(`✅ Found ${validatorCount} unique validators from ${recentValidators.length} recent blocks`);

    const validatorResponse: ValidatorResponse = {
      count: validatorCount,
      recentValidators: recentValidators.slice(-20), // Last 20 validator activities
      uniqueValidators: uniqueValidatorsList,
      method: 'block_analysis_extended',
      timestamp: new Date().toISOString(),
      blocksAnalyzed: recentValidators.length,
      disclaimer: `⚠️ This count (${validatorCount}) is based on unique miners in the last ${blocksToCheck} blocks. This represents ACTIVE block producers, not the total validator set. The actual number of validators who have staked PLS is likely much higher (~50,000+).`
    };

    return NextResponse.json({
      success: true,
      data: validatorResponse,
      message: `Found ${validatorCount} unique ACTIVE validators by analyzing ${recentValidators.length} recent blocks (last ${blocksToCheck} blocks). Note: This is NOT the total staking validator count.`
    });

  } catch (error: any) {
    console.error('❌ Failed to fetch PulseChain validators:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      data: {
        count: 0,
        recentValidators: [],
        uniqueValidators: [],
        method: 'failed',
        timestamp: new Date().toISOString(),
        blocksAnalyzed: 0
      }
    }, { status: 500 });
  }
} 