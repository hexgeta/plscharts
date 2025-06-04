import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering since we're fetching live data
export const dynamic = 'force-dynamic';

const PULSECHAIN_RPC = 'https://rpc-pulsechain.g4mm4.io';

// Calculate seconds until next UTC+1
function getSecondsUntilNextUTC1(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(1, 0, 0, 0);
  return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
}

// Beacon API endpoints
const PULSECHAIN_BEACON_API = 'https://rpc-pulsechain.g4mm4.io/beacon-api';

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

async function tryBeaconAPI(): Promise<any> {
  console.log('🔍 Trying Beacon API endpoints...');
  
  const beaconEndpoints = [
    '/eth/v1/beacon/states/head/validators',
    '/eth/v1/beacon/states/finalized/validators', 
    '/eth/v1/beacon/genesis',
    '/eth/v1/beacon/states/head/validator_balances',
    '/eth/v1/node/identity',
    '/eth/v1/beacon/pool/voluntary_exits',
    '/eth/v1/beacon/states/head/committees'
  ];

  for (const endpoint of beaconEndpoints) {
    try {
      console.log(`Trying Beacon API endpoint: ${endpoint}`);
      
      const response = await fetch(`${PULSECHAIN_BEACON_API}${endpoint}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      console.log(`Beacon API ${endpoint} status: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Beacon API ${endpoint} success:`, Object.keys(result));
        
        // Check for validator data
        if (result.data && Array.isArray(result.data)) {
          console.log(`Found ${result.data.length} items in ${endpoint}`);
          
          if (endpoint.includes('validators')) {
            // Log first few validators to see structure
            if (result.data.length > 0) {
              console.log('Sample validator data:', JSON.stringify(result.data.slice(0, 3), null, 2));
            }
            
            return {
              method: 'beacon_api',
              endpoint: endpoint,
              count: result.data.length,
              validators: result.data,
              raw: result
            };
          }
        } else if (result.data && typeof result.data === 'object') {
          console.log(`Beacon API ${endpoint} returned object:`, Object.keys(result.data));
          return {
            method: 'beacon_api',
            endpoint: endpoint,
            data: result.data,
            raw: result
          };
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ Beacon API ${endpoint} failed: ${response.status} - ${errorText.slice(0, 200)}`);
      }
    } catch (error) {
      console.log(`❌ Beacon API ${endpoint} error:`, error);
    }
  }
  
  return null;
}

// Function to group validators by withdrawal credentials and calculate totals
function groupValidatorsByWithdrawalCredentials(validators: any[]): any[] {
  const groups = new Map<string, {
    withdrawalCredentials: string;
    totalBalance: number;
    validatorCount: number;
    averageBalance: number;
    validators: string[]; // Store validator indices/pubkeys
    statuses: string[];
  }>();

  validators.forEach(validator => {
    const withdrawalCredentials = validator.validator?.withdrawal_credentials || 'unknown';
    const balance = parseInt(validator.balance || '0');
    const validatorIndex = validator.index;
    const status = validator.status;
    
    if (groups.has(withdrawalCredentials)) {
      const existing = groups.get(withdrawalCredentials)!;
      existing.totalBalance += balance;
      existing.validatorCount += 1;
      existing.validators.push(validatorIndex);
      existing.statuses.push(status);
      existing.averageBalance = existing.totalBalance / existing.validatorCount;
    } else {
      groups.set(withdrawalCredentials, {
        withdrawalCredentials,
        totalBalance: balance,
        validatorCount: 1,
        averageBalance: balance,
        validators: [validatorIndex],
        statuses: [status]
      });
    }
  });

  // Convert to array and sort by total balance (descending)
  return Array.from(groups.values())
    .sort((a, b) => b.totalBalance - a.totalBalance);
}

// Function to filter active validators
function filterActiveValidators(validators: any[]): any[] {
  const activeValidators = validators.filter(validator => {
    const status = validator.status;
    
    // Common active statuses in Ethereum 2.0:
    // - active_ongoing: Currently active and attesting
    // - active_exiting: Active but in the process of exiting
    // - active_slashed: Active but has been slashed
    const isCurrentlyActive = [
      'active_ongoing',
      'active_exiting', 
      'active_slashed'
    ].includes(status);
    
    // For now, we'll consider currently active validators
    // In the future, we could add logic to check recent activity
    return isCurrentlyActive;
  });
  
  console.log(`Filtered ${activeValidators.length} active validators from ${validators.length} total`);
  return activeValidators;
}

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching PulseChain validator information...');
    
    // First try Beacon API
    console.log('🔍 Trying Beacon API first...');
    const beaconResult = await tryBeaconAPI();
    if (beaconResult && beaconResult.count) {
      console.log(`✅ Found validator data via Beacon API!`);
      
      // Filter for active validators
      const activeValidators = filterActiveValidators(beaconResult.validators || []);
      
      // Calculate total staked amount
      const totalStaked = activeValidators.reduce((sum, validator) => {
        const balance = parseInt(validator.balance || '0');
        return sum + balance;
      }, 0);
      
      console.log(`Total PLS staked: ${totalStaked} Gwei (${totalStaked / 1e9} PLS)`);
      
      // Sort active validators by balance (descending) to get the largest ones
      const sortedActiveValidators = activeValidators.sort((a, b) => {
        const balanceA = parseInt(a.balance || '0');
        const balanceB = parseInt(b.balance || '0');
        return balanceB - balanceA;
      });
      
      // Group ALL active validators by withdrawal credentials
      console.log(`Processing ${activeValidators.length} active validators for grouping...`);
      const groupedValidators = groupValidatorsByWithdrawalCredentials(activeValidators);
      console.log(`Created ${groupedValidators.length} validator groups`);
      
      // Get status counts
      const statusCounts: Record<string, number> = {};
      beaconResult.validators?.forEach((validator: any) => {
        const status = validator.status;
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      // Calculate cache duration until next UTC+1
      const maxAge = getSecondsUntilNextUTC1();
      
      // Return response with caching headers that expire at UTC+1
      return new NextResponse(JSON.stringify({
        success: true,
        data: {
          count: beaconResult.count,
          activeCount: activeValidators.length,
          totalStaked: totalStaked,
          method: `beacon_api_${beaconResult.endpoint.split('/').pop()}`,
          endpoint: beaconResult.endpoint,
          validators: beaconResult.validators?.slice(0, 100) || [],
          activeValidators: sortedActiveValidators.slice(0, 100),
          groupedValidators: groupedValidators,
          statusCounts: statusCounts,
          timestamp: new Date().toISOString(),
          recentValidators: [],
          uniqueValidators: beaconResult.validators?.map((v: any) => v.validator?.pubkey || v.pubkey || v.index) || [],
          blocksAnalyzed: 0,
          disclaimer: `Validator count retrieved from Beacon API endpoint ${beaconResult.endpoint}. ${activeValidators.length} validators are currently active with ${(totalStaked / 1e9).toLocaleString()} PLS total staked. Grouped data includes ALL ${activeValidators.length} active validators.`
        },
        message: `Found ${beaconResult.count} total validators, ${activeValidators.length} are active with ${(totalStaked / 1e9).toLocaleString()} PLS staked. Grouped ${activeValidators.length} validators into ${groupedValidators.length} withdrawal address groups.`
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=60`,
          'CDN-Cache-Control': `public, max-age=${maxAge}`,
          'Vercel-CDN-Cache-Control': `public, max-age=${maxAge}`,
        }
      });
    } else if (beaconResult && beaconResult.data) {
      console.log(`✅ Found some data via Beacon API (${beaconResult.endpoint})`);
      return NextResponse.json({
        success: true,
        data: {
          count: 0,
          method: `beacon_api_${beaconResult.endpoint.split('/').pop()}`,
          endpoint: beaconResult.endpoint,
          beaconData: beaconResult.data,
          timestamp: new Date().toISOString(),
          recentValidators: [],
          uniqueValidators: [],
          blocksAnalyzed: 0,
          disclaimer: `Data retrieved from Beacon API endpoint ${beaconResult.endpoint}. Check beaconData field for details.`
        },
        message: `Retrieved beacon data from ${beaconResult.endpoint}`
      });
    }

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