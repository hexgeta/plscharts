import { Buffer } from 'buffer';
import { TOKEN_CONSTANTS } from '@/constants/crypto';

interface TokenData {
    symbol: string;
    balance: string;
    decimals: number;
    error?: string;
}

interface TokenBalances {
    [token: string]: TokenData;
}

// Extract token addresses from constants
export const CHAIN_TOKENS = {
    ETH: TOKEN_CONSTANTS
        .filter(token => 
            token.chain === 1 && 
            token.a !== '0x0'
        )
        .reduce((acc, token) => ({
            ...acc,
            [token.ticker]: token.a
        }), {}),
    PLS: TOKEN_CONSTANTS
        .filter(token => 
            token.chain === 369 && 
            token.a !== '0x0'
        )
        .reduce((acc, token) => ({
            ...acc,
            [token.ticker]: token.a
        }), {})
};

async function isValidContract(rpcUrl: string, address: string): Promise<boolean> {
    try {
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_getCode',
                params: [address, 'latest']
            }),
        });

        const data = await response.json();
        return data.result && data.result !== '0x';
    } catch {
        return false;
    }
}

export async function getTokenBalance(
    rpcUrl: string, 
    tokenAddress: string, 
    walletAddress: string
): Promise<TokenData> {
    // First check if the contract exists
    const isValid = await isValidContract(rpcUrl, tokenAddress);
    if (!isValid) {
        return {
            symbol: 'INVALID',
            balance: '0',
            decimals: 18,
            error: 'Invalid contract'
        };
    }

    const makeCall = async (method: string, params: any[] = []): Promise<string> => {
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_call',
                params: [{
                    to: tokenAddress,
                    data: method,
                }, 'latest']
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(`RPC Error: ${JSON.stringify(data.error)}`);
        }
        return data.result;
    };

    try {
        // Get decimals with fallback
        let decimals = 18;
        try {
            const decimalsHex = await makeCall('0x313ce567'); // decimals()
            decimals = parseInt(decimalsHex, 16);
            if (isNaN(decimals)) decimals = 18;
        } catch {
            console.warn(`Failed to get decimals for ${tokenAddress}, using default 18`);
        }

        // Get symbol with fallback
        let symbol = 'UNKNOWN';
        try {
            const symbolHex = await makeCall('0x95d89b41'); // symbol()
            symbol = decodeString(symbolHex);
            if (!symbol || symbol === 'UNKNOWN') {
                // Try name() as fallback
                const nameHex = await makeCall('0x06fdde03');
                const name = decodeString(nameHex);
                if (name && name !== 'UNKNOWN') symbol = name;
            }
        } catch {
            console.warn(`Failed to get symbol for ${tokenAddress}`);
        }

        // Get balance
        const balanceHex = await makeCall(
            `0x70a08231000000000000000000000000${walletAddress.slice(2)}` // balanceOf(address)
        );
        
        // Safe balance calculation
        let balance = '0';
        try {
            const rawBalance = BigInt(balanceHex);
            if (decimals === 0) {
                balance = rawBalance.toString();
            } else {
                const divisor = BigInt(10 ** decimals);
                const wholePart = rawBalance / divisor;
                const fractionalPart = rawBalance % divisor;
                balance = wholePart.toString();
                if (fractionalPart > 0) {
                    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
                    balance += '.' + fractionalStr.replace(/0+$/, '');
                }
            }
        } catch (error) {
            console.error(`Error calculating balance for ${tokenAddress}:`, error);
            balance = '0';
        }

        return { symbol, balance, decimals };
    } catch (error) {
        console.error(`Error fetching token data for ${tokenAddress}:`, error);
        return {
            symbol: 'ERROR',
            balance: '0',
            decimals: 18,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// Helper function to decode string from hex
function decodeString(hex: string): string {
    try {
        // Remove 0x prefix and get the location of the string data
        hex = hex.slice(2);
        
        // Handle short string format (string data directly in the response)
        if (hex.length <= 64) {
            const stringHex = hex.replace(/^0+|0+$/g, '');
            if (stringHex.length % 2 !== 0) return 'UNKNOWN';
            return Buffer.from(stringHex, 'hex').toString().replace(/\x00/g, '');
        }
        
        // Handle long string format (with offset and length)
        const stringStart = parseInt(hex.slice(64, 128), 16) * 2;
        const stringLength = parseInt(hex.slice(stringStart, stringStart + 64), 16) * 2;
        const stringHex = hex.slice(stringStart + 64, stringStart + 64 + stringLength);
        return Buffer.from(stringHex, 'hex').toString().replace(/\x00/g, '');
    } catch (error) {
        console.error('Error decoding string:', error);
        return 'UNKNOWN';
    }
}

export async function getAllTokenBalances(
    rpcUrl: string,
    walletAddress: string,
    tokenList: Record<string, string>
): Promise<TokenBalances> {
    const balances: TokenBalances = {};
    
    await Promise.all(
        Object.entries(tokenList).map(async ([name, address]) => {
            try {
                balances[name] = await getTokenBalance(rpcUrl, address, walletAddress);
            } catch (error) {
                console.error(`Error fetching balance for ${name}:`, error);
                balances[name] = { 
                    symbol: name, 
                    balance: '0', 
                    decimals: 18,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        })
    );
    
    return balances;
} 