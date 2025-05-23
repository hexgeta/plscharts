const https = require('https');
const { TOKEN_CONSTANTS } = require('./tokenList');

const PLS_RPC = 'https://rpc-pulsechain.g4mm4.io';
const ETH_RPC = 'https://rpc-ethereum.g4mm4.io';
const WALLET = '0x1F12DAE5450522b445Fe1882C4F8D2Cf67B38a43';

// Extract token addresses from constants
const CHAIN_TOKENS = {
    ETH: Object.entries(TOKEN_CONSTANTS)
        .filter(([key, value]) => 
            value.contractAddress && 
            value.contractAddress !== 'native' && 
            (key.startsWith('e') || (!key.startsWith('p') && !key.startsWith('e')))
        )
        .reduce((acc, [key, value]) => ({
            ...acc,
            [key]: value.contractAddress
        }), {}),
    PLS: Object.entries(TOKEN_CONSTANTS)
        .filter(([key, value]) => 
            value.contractAddress && 
            value.contractAddress !== 'native' && 
            (key.startsWith('p') || (!key.startsWith('p') && !key.startsWith('e')))
        )
        .reduce((acc, [key, value]) => ({
            ...acc,
            [key]: value.contractAddress
        }), {})
};

function makeRPCCall(url, method, params = []) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method,
            params,
        });

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length,
            },
        };

        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (json.error) {
                        reject(new Error(`RPC Error: ${JSON.stringify(json.error)}`));
                    } else {
                        resolve(json.result);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function getTokenBalance(rpcUrl, tokenAddress, walletAddress) {
    try {
        // First verify the contract exists and has code
        const code = await makeRPCCall(rpcUrl, 'eth_getCode', [tokenAddress, 'latest']);
        if (code === '0x' || code === '0x0') {
            throw new Error('Contract not found');
        }

        // Get decimals
        const decimalsHex = await makeRPCCall(rpcUrl, 'eth_call', [{
            to: tokenAddress,
            data: '0x313ce567' // decimals()
        }, 'latest']);
        const decimals = parseInt(decimalsHex, 16);
        if (isNaN(decimals)) {
            throw new Error('Invalid decimals');
        }

        // Get symbol
        const symbolHex = await makeRPCCall(rpcUrl, 'eth_call', [{
            to: tokenAddress,
            data: '0x95d89b41' // symbol()
        }, 'latest']);
        const symbol = decodeString(symbolHex);
        if (!symbol || symbol === 'UNKNOWN') {
            throw new Error('Invalid symbol');
        }

        // Get balance
        const balanceHex = await makeRPCCall(rpcUrl, 'eth_call', [{
            to: tokenAddress,
            data: `0x70a08231000000000000000000000000${walletAddress.slice(2)}` // balanceOf(address)
        }, 'latest']);
        const balanceNum = parseInt(balanceHex, 16);
        if (isNaN(balanceNum)) {
            throw new Error('Invalid balance');
        }
        const balance = (balanceNum / Math.pow(10, decimals)).toFixed(decimals);

        return { symbol, balance, decimals };
    } catch (error) {
        console.error(`Error fetching token data for ${tokenAddress}:`, error.message);
        throw error;
    }
}

function decodeString(hex) {
    try {
        hex = hex.slice(2);
        const stringStart = parseInt(hex.slice(64, 128), 16) * 2;
        const stringLength = parseInt(hex.slice(stringStart, stringStart + 64), 16) * 2;
        const stringHex = hex.slice(stringStart + 64, stringStart + 64 + stringLength);
        return Buffer.from(stringHex, 'hex').toString();
    } catch (error) {
        console.error('Error decoding string:', error);
        return 'UNKNOWN';
    }
}

async function getStats() {
    try {
        // Basic Stats
        console.log('=== Basic Chain Stats ===');
        
        // Network IDs
        console.log('\nFetching Network IDs...');
        const ethNetVersion = await makeRPCCall(ETH_RPC, 'net_version');
        const plsNetVersion = await makeRPCCall(PLS_RPC, 'net_version');
        console.log('ETH Network ID:', ethNetVersion);
        console.log('PLS Network ID:', plsNetVersion);

        // Gas Prices
        console.log('\nFetching Gas Prices...');
        const ethGasPrice = await makeRPCCall(ETH_RPC, 'eth_gasPrice');
        const plsGasPrice = await makeRPCCall(PLS_RPC, 'eth_gasPrice');
        console.log('ETH Gas Price (Gwei):', (parseInt(ethGasPrice, 16) / 1e9).toFixed(2));
        console.log('PLS Gas Price (Gwei):', (parseInt(plsGasPrice, 16) / 1e9).toFixed(2));

        // Latest Blocks
        console.log('\nFetching Latest Blocks...');
        const ethBlock = await makeRPCCall(ETH_RPC, 'eth_blockNumber');
        const plsBlock = await makeRPCCall(PLS_RPC, 'eth_blockNumber');
        console.log('ETH Latest Block:', parseInt(ethBlock, 16));
        console.log('PLS Latest Block:', parseInt(plsBlock, 16));

        // Wallet Balances
        console.log('\n=== Wallet Stats ===');
        console.log('Address:', WALLET);
        const ethBalance = await makeRPCCall(ETH_RPC, 'eth_getBalance', [WALLET, 'latest']);
        const plsBalance = await makeRPCCall(PLS_RPC, 'eth_getBalance', [WALLET, 'latest']);
        console.log('ETH Balance:', (parseInt(ethBalance, 16) / 1e18).toFixed(6));
        console.log('PLS Balance:', (parseInt(plsBalance, 16) / 1e18).toFixed(6));

        // Token Balances
        console.log('\n=== Token Balances ===');
        
        // ETH Tokens
        console.log('\nETH Tokens:');
        for (const [symbol, address] of Object.entries(CHAIN_TOKENS.ETH)) {
            try {
                const tokenData = await getTokenBalance(ETH_RPC, address, WALLET);
                console.log(`${symbol}: ${tokenData.balance} ${tokenData.symbol}`);
            } catch (error) {
                console.log(`${symbol}: Error fetching balance`);
            }
        }

        // PLS Tokens
        console.log('\nPLS Tokens:');
        for (const [symbol, address] of Object.entries(CHAIN_TOKENS.PLS)) {
            try {
                const tokenData = await getTokenBalance(PLS_RPC, address, WALLET);
                console.log(`${symbol}: ${tokenData.balance} ${tokenData.symbol}`);
            } catch (error) {
                console.log(`${symbol}: Error fetching balance`);
            }
        }

        // Transaction Pool Stats
        console.log('\n=== Transaction Pool Stats ===');
        const ethTxPool = await makeRPCCall(ETH_RPC, 'txpool_status');
        const plsTxPool = await makeRPCCall(PLS_RPC, 'txpool_status');
        console.log('ETH Pending Tx:', parseInt(ethTxPool.pending || '0x0', 16));
        console.log('ETH Queued Tx:', parseInt(ethTxPool.queued || '0x0', 16));
        console.log('PLS Pending Tx:', parseInt(plsTxPool.pending || '0x0', 16));
        console.log('PLS Queued Tx:', parseInt(plsTxPool.queued || '0x0', 16));

        // PulseChain Specific
        console.log('\n=== PulseChain Specific ===');
        const validatorsData = await makeRPCCall(PLS_RPC, 'eth_call', [{
            to: '0x0000000000000000000000000000000000000001',
            data: '0x70a08231000000000000000000000000000000000000000000000000000000000000000000'
        }, 'latest']);
        console.log('Number of Validators:', parseInt(validatorsData, 16));

    } catch (error) {
        console.error('\nError fetching stats:', error.message);
    }
}

// Run the stats collection
getStats(); 