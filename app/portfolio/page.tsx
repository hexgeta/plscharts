'use client';

import { useState, useEffect } from 'react';
import { CHAIN_TOKENS, getAllTokenBalances } from '@/utils/tokenBalances';
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import Image from 'next/image';
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

const RPC_ENDPOINTS = {
    ETH: 'https://rpc-ethereum.g4mm4.io',
    PLS: 'https://rpc-pulsechain.g4mm4.io'
};

interface TokenBalance {
    symbol: string;
    balance: string;
    chain: 'ETH' | 'PLS';
    decimals: number;
    error?: string;
    usdValue?: number;
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
    const [error, setError] = useState<string | null>(null);
    const [activeTokens, setActiveTokens] = useState<string[]>([]);

    // Only fetch prices for tokens that have balances
    const { prices, isLoading: pricesLoading } = useTokenPrices(activeTokens);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
            setError('Invalid Ethereum address format');
            return;
        }

        setLoading(true);
        setError(null);
        
        // Run balance checks in the background
        Promise.all([
            getAllTokenBalances(RPC_ENDPOINTS.ETH, address, CHAIN_TOKENS.ETH),
            getAllTokenBalances(RPC_ENDPOINTS.PLS, address, CHAIN_TOKENS.PLS)
        ]).then(([ethBalances, plsBalances]) => {
            // Get tokens with non-zero balances
            const tokensWithBalances = [
                ...Object.entries(ethBalances)
                    .filter(([_, data]) => !data.error && parseFloat(data.balance) > 0)
                    .map(([symbol]) => symbol),
                ...Object.entries(plsBalances)
                    .filter(([_, data]) => !data.error && parseFloat(data.balance) > 0)
                    .map(([symbol]) => symbol)
            ];

            // Update active tokens to trigger price fetching
            setActiveTokens(tokensWithBalances);

            // Convert and combine balances
            const combinedBalances: TokenBalance[] = [
                ...Object.entries(ethBalances).map(([symbol, data]) => ({
                    symbol,
                    balance: data.balance,
                    chain: 'ETH' as const,
                    decimals: data.decimals,
                    error: data.error,
                    usdValue: data.error ? 0 : parseFloat(data.balance) * (prices[symbol]?.price || 0)
                })),
                ...Object.entries(plsBalances).map(([symbol, data]) => ({
                    symbol,
                    balance: data.balance,
                    chain: 'PLS' as const,
                    decimals: data.decimals,
                    error: data.error,
                    usdValue: data.error ? 0 : parseFloat(data.balance) * (prices[symbol]?.price || 0)
                }))
            ]
            .filter(token => !token.error && parseFloat(token.balance) > 0)
            .sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0));

            setBalances(combinedBalances);
            setLoading(false);
        }).catch((err) => {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setLoading(false);
        });
    };

    // Update USD values when prices change
    useEffect(() => {
        if (balances && prices) {
            const updatedBalances = balances.map(token => ({
                ...token,
                usdValue: parseFloat(token.balance) * (prices[token.symbol]?.price || 0)
            }))
            .sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0));
            
            setBalances(updatedBalances);
        }
    }, [prices]);

    const totalValue = balances?.reduce((sum, token) => sum + (token.usdValue || 0), 0) || 0;

    return (
        <div className="flex flex-col gap-4 p-8">
            <h1 className="text-4xl font-bold">Token Balance Checker</h1>
            
            <div className="flex items-center gap-4 mb-8">
                <Input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter wallet address (0x...)"
                    className="flex-1 bg-black/80 backdrop-blur-sm border-white/10 text-white"
                />
                <button
                    onClick={handleSubmit}
                    disabled={loading || pricesLoading}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    {loading || pricesLoading ? 'Loading...' : 'Check Balances'}
                </button>
            </div>

            {error && (
                <div className="text-red-500 mb-4">{error}</div>
            )}

            {balances && balances.length > 0 && (
                <>
                    <div className="text-xl font-semibold mb-4">
                        Total Value: {formatNumber(totalValue, { prefix: '$', decimals: 2, compact: true })}
                    </div>
                    <div className="rounded-lg border border-white/10 overflow-hidden bg-black/80 backdrop-blur-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-white/10">
                                    <TableHead className="text-white/50">Chain</TableHead>
                                    <TableHead className="text-white/50">Token</TableHead>
                                    <TableHead className="text-right text-white/50">Balance</TableHead>
                                    <TableHead className="text-right text-white/50">Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {balances.map((token) => (
                                    <TableRow 
                                        key={`${token.chain}-${token.symbol}`}
                                        className="hover:bg-white/5 border-white/10"
                                    >
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Image
                                                    src={token.chain === 'PLS' ? '/coin-logos/PLS.svg' : '/coin-logos/ETH.svg'}
                                                    alt={token.chain}
                                                    width={24}
                                                    height={24}
                                                    className="rounded-full"
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell>{token.symbol}</TableCell>
                                        <TableCell className="text-right">
                                            {formatTokenBalance(token.balance, token.decimals)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatNumber(token.usdValue || 0, { prefix: '$', decimals: 2, compact: true })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}

            {balances && balances.length === 0 && (
                <div className="text-center py-8 text-white/50">
                    No tokens found with non-zero balances
                </div>
            )}
        </div>
    );
} 