'use client';

import { useState, useEffect } from 'react';
import { CHAIN_TOKENS, getAllTokenBalances } from '@/utils/tokenBalances';
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { formatNumber } from '@/utils/format';
import { CoinLogo } from '@/components/ui/CoinLogo';
import { TOKEN_CONSTANTS } from '@/constants/crypto';

const RPC_ENDPOINT = 'https://rpc-pulsechain.g4mm4.io';

interface TokenBalance {
    symbol: string;
    balance: string;
    decimals: number;
    error?: string;
    usdValue?: number;
    address: string;
    name?: string;
    chain?: number;
}

// Helper function to format token balance
const formatTokenBalance = (balance: string, decimals: number) => {
    const num = parseFloat(balance);
    
    // For very large numbers, use compact notation with 2 decimals
    if (num >= 1000) {
        return formatNumber(num, { 
            decimals: 2,
            compact: true 
        });
    }
    
    // For numbers < 1000, show up to 4 decimals max
    return formatNumber(num, { 
        decimals: Math.min(4, decimals)
    });
};

export default function BalanceChecker() {
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [balances, setBalances] = useState<TokenBalance[] | null>(null);
    const [activeTokens, setActiveTokens] = useState<string[]>([]);
    const [rawBalances, setRawBalances] = useState<Record<string, { balance: string, decimals: number, error?: string }>>({});
    const [mounted, setMounted] = useState(false);

    // Only fetch prices for tokens that have balances
    const { prices, isLoading: pricesLoading } = useTokenPrices(activeTokens);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isValidEthAddress = (addr: string) => {
        return /^0x[a-fA-F0-9]{40}$/i.test(addr);
    };

    // Update balances when prices change
    useEffect(() => {
        if (!rawBalances || Object.keys(rawBalances).length === 0) return;
        
        const formattedBalances: TokenBalance[] = Object.entries(rawBalances)
                    .filter(([_, data]) => !data.error && parseFloat(data.balance) > 0)
            .map(([symbol, data]) => {
                const tokenConfig = TOKEN_CONSTANTS.find(t => t.chain === 369 && t.ticker === symbol);
                const pairAddress = tokenConfig && (Array.isArray(tokenConfig.dexs) ? tokenConfig.dexs[0] : tokenConfig.dexs);
                const priceKey = pairAddress ? `${symbol}:pulsechain:${pairAddress}` : symbol;
                
                return {
                    symbol,
                    balance: data.balance,
                    decimals: data.decimals,
                    error: data.error,
                    usdValue: data.error ? 0 : parseFloat(data.balance) * (prices[priceKey]?.price || 0),
                    address: tokenConfig?.a || '',
                    name: tokenConfig?.name || symbol,
                    chain: tokenConfig?.chain
                };
            })
            .sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0));

        setBalances(formattedBalances);
    }, [prices, rawBalances]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValidEthAddress(address)) return;

        setLoading(true);
        setBalances(null);
        
        try {
            // Only scan PulseChain
            const plsBalances = await getAllTokenBalances(RPC_ENDPOINT, address, CHAIN_TOKENS.PLS);
            
            // Store raw balances
            setRawBalances(plsBalances);
            
            // Filter for tokens with non-zero balances
            const tokensWithBalances = Object.entries(plsBalances)
                .filter(([_, data]) => !data.error && parseFloat(data.balance) > 0)
                .map(([symbol]) => {
                    // Get the token's contract address from CHAIN_TOKENS
                    const contractAddress = CHAIN_TOKENS.PLS[symbol];
                    
                    // Find token config by contract address
                    const tokenConfig = TOKEN_CONSTANTS.find(t => 
                        t.chain === 369 && t.a === contractAddress
                    );

                    if (!tokenConfig) return null;

                    // Get the pair address
                    const pairAddress = Array.isArray(tokenConfig.dexs) 
                        ? tokenConfig.dexs[0] 
                        : tokenConfig.dexs;

                    console.log(`[Token Debug] ${symbol}:`, {
                        balance: plsBalances[symbol].balance,
                        contractAddress,
                        foundConfig: !!tokenConfig,
                        configDetails: {
                            ticker: tokenConfig.ticker,
                            chain: tokenConfig.chain,
                            address: tokenConfig.a,
                            pairAddress,
                            name: tokenConfig.name
                        }
                    });
                    
                    // Return symbol with pair address for price lookup
                    return `${symbol}:pulsechain:${pairAddress}`;
                })
                .filter((symbol): symbol is string => symbol !== null);

            console.log('[Token Debug] Active tokens with pairs:', tokensWithBalances);
            
            // Update active tokens all at once to trigger a single batch price fetch
            setActiveTokens(tokensWithBalances);
        } catch (err) {
            console.error('Error fetching balances:', err);
        } finally {
            setLoading(false);
        }
    };

    const totalValue = balances?.reduce((sum, token) => sum + (token.usdValue || 0), 0) || 0;

    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-12 lg:p-24">
            <div className="container relative mx-auto flex flex-col items-center justify-start">
                {/* Title and Input - Only show when no balances */}
                {!balances && (
                    <div className="w-full flex flex-col items-center">
                        <div className="text-center">
                            <h1 className="text-2xl md:text-5xl lg:text-6xl font-normal">
                                Check how much your PulseChain Airdrop is worth
                            </h1>
                        </div>

                        {/* Input Section */}
                        <div className="w-full max-w-2xl mt-12">
                            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
                <Input
                    type="text"
                    value={address}
                                    onChange={(e) => {
                                        const newAddress = e.target.value;
                                        setAddress(newAddress);
                                        
                                        // Only trigger balance check for valid addresses
                                        if (isValidEthAddress(newAddress)) {
                                            setLoading(true);
                                            setBalances(null);
                                            
                                            getAllTokenBalances(RPC_ENDPOINT, newAddress, CHAIN_TOKENS.PLS)
                                                .then(plsBalances => {
                                                    // Store raw balances
                                                    setRawBalances(plsBalances);
                                                    
                                                    // Filter for tokens with non-zero balances
                                                    const tokensWithBalances = Object.entries(plsBalances)
                                                        .filter(([_, data]) => !data.error && parseFloat(data.balance) > 0)
                                                        .map(([symbol]) => {
                                                            // Get the token's contract address from CHAIN_TOKENS
                                                            const contractAddress = CHAIN_TOKENS.PLS[symbol];
                                                            
                                                            // Find token config by contract address
                                                            const tokenConfig = TOKEN_CONSTANTS.find(t => 
                                                                t.chain === 369 && t.a === contractAddress
                                                            );

                                                            if (!tokenConfig) return null;

                                                            // Get the pair address
                                                            const pairAddress = Array.isArray(tokenConfig.dexs) 
                                                                ? tokenConfig.dexs[0] 
                                                                : tokenConfig.dexs;

                                                            console.log(`[Token Debug] ${symbol}:`, {
                                                                balance: plsBalances[symbol].balance,
                                                                contractAddress,
                                                                foundConfig: !!tokenConfig,
                                                                configDetails: {
                                                                    ticker: tokenConfig.ticker,
                                                                    chain: tokenConfig.chain,
                                                                    address: tokenConfig.a,
                                                                    pairAddress,
                                                                    name: tokenConfig.name
                                                                }
                                                            });
                                                            
                                                            // Return symbol with pair address for price lookup
                                                            return `${symbol}:pulsechain:${pairAddress}`;
                                                        })
                                                        .filter((symbol): symbol is string => symbol !== null);

                                                    console.log('[Token Debug] Active tokens with pairs:', tokensWithBalances);
                                                    
                                                    // Update active tokens all at once to trigger a single batch price fetch
                                                    setActiveTokens(tokensWithBalances);
                                                })
                                                .catch(err => {
                                                    console.error('Error fetching balances:', err);
                                                })
                                                .finally(() => {
                                                    setLoading(false);
                                                });
                                        }
                                    }}
                                    placeholder="0x2b591e99afe9f32eaa6214f7b7629768c40eeb39"
                                    className="h-16 text-lg px-6 text-white bg-transparent border-white/10 [&::placeholder]:text-[#ef4444]"
                                />
                            </form>
                        </div>
            </div>
                )}

                {/* Loading State */}
                {(loading || pricesLoading) && mounted && (
                    <div className="w-full max-w-2xl mx-auto px-4">
                        <div className="p-4 text-muted-foreground rounded-lg border bg-card text-center">
                            Loading...
                        </div>
                    </div>
                )}

                {/* Results Section */}
                {balances && balances.length > 0 && (
                    <div className="w-full max-w-2xl mx-auto px-4 space-y-8">
                        <div className="p-8 pb-32 rounded-lg bg-card text-card-foreground">
                            <h3 className="text-xl font-medium text-muted-foreground mb-2">Total Value</h3>
                            <div className="text-4xl md:text-5xl">
                                {formatNumber(totalValue, { prefix: '$', decimals: 0 })}
                            </div>
                        </div>

                        <div className="rounded-lg border bg-card overflow-hidden">
                        <Table>
                            <TableBody>
                                {balances.map((token) => (
                                    <TableRow 
                                            key={token.symbol}
                                            className="border-b border-border/5 last:border-0"
                                        >
                                            <TableCell className="py-6">
                                                <div className="flex items-center gap-4">
                                                    <CoinLogo symbol={token.symbol} size="lg" />
                                                    <div>
                                                        <div className="text-lg font-medium">{token.symbol}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {TOKEN_CONSTANTS.find(t => t.ticker === token.symbol)?.name || token.name || token.symbol}
                                                        </div>
                                                    </div>
                                            </div>
                                        </TableCell>
                                            <TableCell className="py-6 text-right">
                                                <div className="text-lg font-medium">
                                                    {token.usdValue && token.usdValue > 0 
                                                        ? formatNumber(token.usdValue, { prefix: '$', decimals: 0, compact: true })
                                                        : <span className="text-muted-foreground">No price data</span>
                                                    }
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {formatTokenBalance(token.balance, token.decimals)} {token.symbol}
                                                </div>
                                        </TableCell>
                                            <TableCell className="py-6 w-[100px]">
                                                <button
                                                    className="w-full px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-sm transition-colors"
                                                    onClick={() => window.open(`https://app.pulsex.com/swap?inputCurrency=${token.address}`, '_blank')}
                                                >
                                                    Trade
                                                </button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>


                    </div>
            )}

            {balances && balances.length === 0 && (
                    <div className="w-full max-w-2xl mx-auto px-4">
                        <div className="py-12 text-muted-foreground rounded-lg border bg-card text-center">
                    No tokens found with non-zero balances
                        </div>
                </div>
            )}
            </div>
        </div>
    );
} 