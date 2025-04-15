'use client';

import React, { useState, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton2";
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { useCryptoPrice } from "@/hooks/crypto/useCryptoPrice";
import { TOKEN_CONSTANTS } from '@/constants/crypto';

const TARGET_ADDRESS = '0x1b7baa734c00298b9429b518d621753bb0f6eff2';
const ETHERSCAN_API_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  blockNumber: string;
  isError?: string;
  reference: string;
  label: string;
}

interface AddressConfig {
  address: string;
  label: string;
}

const TRACKED_ADDRESSES: AddressConfig[] = [
  {
    address: '0x9Cd83BE15a79646A3D22B81fc8dDf7B7240a62cB',
    label: 'Main Sac'
  },
  { 
    address: '0x1b7baa734c00298b9429b518d621753bb0f6eff2',
    label: 'Daughter 1'
  },
  {
    address: '0x799bdc3f2075230ff85ec6767eaaa92365fdde0b',
    label: 'Daughter 2'
  }
];

// Add color mapping for each address
const ADDRESS_COLORS = {
  '0x1b7baa734c00298b9429b518d621753bb0f6eff2': {
    border: 'border-[#00FFFF]/50',
    bg: 'bg-[#00FFFF]/10',
    text: 'text-[#00FFFF]',
    hoverText: 'hover:text-[#80FFFF]'
  },
  '0x799bdc3f2075230ff85ec6767eaaa92365fdde0b': {
    border: 'border-[#FF00FF]/50',
    bg: 'bg-[#FF00FF]/10',
    text: 'text-[#FF00FF]',
    hoverText: 'hover:text-[#FF80FF]'
  },
  '0x9Cd83BE15a79646A3D22B81fc8dDf7B7240a62cB': {
    border: 'border-[#FFFF00]/50',
    bg: 'bg-[#FFFF00]/10',
    text: 'text-[#FFFF00]',
    hoverText: 'hover:text-[#FFFF80]'
  }
};

// Add Tornado Cash addresses
const TORNADO_CASH_ADDRESSES = [
  '0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b',
  '0x722122dF12D4e14e13Ac3b6895a86e84145b6967'
];

const SPECIAL_ADDRESS_COLORS = {
  [TORNADO_CASH_ADDRESSES[0].toLowerCase()]: {
    border: 'border-[#FF4500]/50',
    bg: 'bg-[#FF4500]/10',
    text: 'text-[#FF4500]',
    hoverText: 'hover:text-[#FF8C69]',
    label: 'Tornado Cash'
  },
  [TORNADO_CASH_ADDRESSES[1].toLowerCase()]: {
    border: 'border-[#FF4500]/50',
    bg: 'bg-[#FF4500]/10',
    text: 'text-[#FF4500]',
    hoverText: 'hover:text-[#FF8C69]',
    label: 'Tornado Cash'
  }
};

const PLS_SAC_ADDRESS = '0x9Cd83BE15a79646A3D22B81fc8dDf7B7240a62cB';

interface Props {
  onLoadingChange: (isLoading: boolean) => void;
  walletFilter: 'all' | 'main' | 'daughter1' | 'daughter2';
  dateRange: DateRange | undefined;
  onTransactionsChange?: (transactions: Transaction[]) => void;
}

const formatAddress = (address: string) => {
  // Check for Tornado Cash addresses first
  if (TORNADO_CASH_ADDRESSES.some(tcAddress => 
    address?.toLowerCase() === tcAddress.toLowerCase()
  )) {
    return 'Tornado Cash';
  }
  // Then check for PLS Sac
  if (address?.toLowerCase() === PLS_SAC_ADDRESS.toLowerCase()) {
    return 'Pls Sac';
  }
  return `${address?.slice(0, 6)}...${address?.slice(-4)}`;
};

const formatAddressWithStyle = (address: string) => {
  const isTornado = TORNADO_CASH_ADDRESSES.some(tcAddress => 
    address?.toLowerCase() === tcAddress.toLowerCase()
  );
  const isPlsSac = address?.toLowerCase() === PLS_SAC_ADDRESS.toLowerCase();
  const isTracked = address in ADDRESS_COLORS;
  
  if (!isTornado && !isPlsSac && !isTracked) {
    return (
      <Link 
        href={`https://etherscan.io/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-white/80 text-white"
      >
        {formatAddress(address)}
      </Link>
    );
  }

  const colors = isTornado 
    ? SPECIAL_ADDRESS_COLORS[address.toLowerCase()]
    : isPlsSac
    ? ADDRESS_COLORS[PLS_SAC_ADDRESS]
    : ADDRESS_COLORS[address];
  
  return (
    <span className={cn(
      "inline-block px-2 py-1 rounded-md text-xs font-medium",
      colors.border,
      colors.bg
    )}>
      <Link 
        href={`https://etherscan.io/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          colors.text,
          colors.hoverText
        )}
        title={isTornado ? 'Tornado Cash' : isPlsSac ? 'Pls Sac' : undefined}
      >
        {formatAddress(address)}
      </Link>
    </span>
  );
};

const formatDate = (timestamp: string) => {
  return new Date(parseInt(timestamp) * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatValue = (value: string, from: string, reference: string) => {
  const divisor = Math.pow(10, 18); // ETH has 18 decimals
  const num = Number(value) / divisor;
  
  // Determine if it's outgoing (from reference) or incoming (to reference)
  const isOutgoing = from.toLowerCase() === reference.toLowerCase();
  const prefix = isOutgoing ? '-' : '+';
  
  // For very small amounts (less than 0.000001 ETH), show scientific notation
  if (Math.abs(num) < 0.000001) {
    return `${prefix}${num.toExponential(6)} ETH`;
  }
  
  // For small amounts (less than 1 ETH), show more decimals
  if (Math.abs(num) < 1) {
    return `${prefix}${num.toFixed(8).replace(/\.?0+$/, '')} ETH`;
  }
  
  // For whole numbers, don't show decimals
  if (Number.isInteger(num)) {
    return `${prefix}${num} ETH`;
  }
  
  // For larger numbers, show up to 6 decimals but remove trailing zeros
  return `${prefix}${num.toFixed(6).replace(/\.?0+$/, '')} ETH`;
};

export const TransactionsTable: React.FC<Props> = ({
  onLoadingChange,
  walletFilter,
  dateRange,
  onTransactionsChange
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalFetched, setTotalFetched] = useState(0);
  const { priceData: ethPrice } = useCryptoPrice('WETH');

  // Add debug log for price data
  useEffect(() => {
    console.log('ETH Price Data:', ethPrice);
  }, [ethPrice]);

  // Update parent loading state
  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  // Add back transaction fetching
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch transactions for all addresses in parallel
        const allTransactionsPromises = TRACKED_ADDRESSES.map(async ({ address, label }) => {
          const response = await fetch(
            `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10000&sort=desc&apikey=${ETHERSCAN_API_KEY}`
          );

          const data = await response.json();

          if (data.status === '1' && Array.isArray(data.result)) {
            return data.result.map((tx: any) => ({
              ...tx,
              reference: address,
              label: label
            }));
          }
          return [];
        });

        const results = await Promise.all(allTransactionsPromises);
        const allTransactions = results.flat();

        // Filter out transactions where Pls Sac is the recipient and transactions < 0.1 ETH
        const filteredTransactions = allTransactions.filter(tx => {
          const isToPlsSac = tx.to?.toLowerCase() === PLS_SAC_ADDRESS.toLowerCase();
          
          // Calculate ETH value
          const ethValue = Number(tx.value) / Math.pow(10, 18);
          
          // Keep the transaction if:
          // 1. It's NOT going to Pls Sac AND
          // 2. Value is >= 0.1 ETH
          return !isToPlsSac && ethValue >= 0.1;
        });

        // Sort all transactions by timestamp (newest first)
        const sortedTransactions = filteredTransactions.sort((a, b) => 
          parseInt(b.timeStamp) - parseInt(a.timeStamp)
        );

        console.log(`Found ${sortedTransactions.length} total transactions after filtering`);
        setTransactions(sortedTransactions);
        onTransactionsChange?.(sortedTransactions);
        setTotalFetched(sortedTransactions.length);
        setIsLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to fetch transactions');
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [onTransactionsChange]);

  const formatDollarValue = (ethAmount: number) => {
    console.log('Formatting dollar value:', { ethAmount, ethPrice });
    if (!ethPrice?.price) return '$...';
    const value = ethAmount * ethPrice.price;
    return value >= 1_000_000 
      ? `$${(value / 1_000_000).toFixed(2)}M` 
      : value >= 1_000 
      ? `$${(value / 1_000).toFixed(2)}K` 
      : `$${value.toFixed(2)}`;
  };

  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="w-full py-4 px-1 xs:px-8">
      {isLoading ? (
        <div className="space-y-4">
          <div className="text-center text-gray-400">
            Fetching transactions... Found {totalFetched} so far
          </div>
          <div className="rounded-lg border border-[#333] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#333] hover:bg-transparent">
                  <TableHead className="text-gray-400 font-800 text-center w-[40px]">#</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">Date</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">Wallet</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">Tx Hash</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">From</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">To</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i} className="border-b border-[#333]">
                    <TableCell><Skeleton className="h-6 w-6 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 mx-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          No transactions found for this address
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center text-gray-400">
            Found {transactions.length} transactions
          </div>
        <div className="rounded-lg border border-[#333] overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#333] hover:bg-transparent">
                  <TableHead className="text-gray-400 font-800 text-center w-[40px]">#</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">Date</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">Wallet</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">Tx Hash</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">From</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">To</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {transactions.map((tx, index) => (
                <TableRow 
                    key={tx.hash}
                  className={cn(
                    "border-b border-[#333] hover:bg-[#1a1a1a] transition-all duration-300",
                      tx.isError === '1' && "opacity-50"
                  )}
                >
                    <TableCell className="text-white text-center">{index + 1}</TableCell>
                    <TableCell className="text-white text-center">{formatDate(tx.timeStamp)}</TableCell>
                    <TableCell className="text-white text-center">
                    <span className={cn(
                        "inline-block px-2 py-1 rounded-md text-xs font-medium",
                        ADDRESS_COLORS[tx.reference].border,
                        ADDRESS_COLORS[tx.reference].bg
                      )}>
                        <Link 
                          href={`https://etherscan.io/address/${tx.reference}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            ADDRESS_COLORS[tx.reference].text,
                            ADDRESS_COLORS[tx.reference].hoverText
                          )}
                          title={tx.label}
                        >
                          {formatAddress(tx.reference)}
                        </Link>
                      </span>
                  </TableCell>
                    <TableCell className="text-white text-center">
                    <Link 
                        href={`https://etherscan.io/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                        className="underline hover:text-white/80 text-white"
                    >
                        {formatAddress(tx.hash)}
                    </Link>
                  </TableCell>
                    <TableCell className="text-white text-center">
                      {formatAddressWithStyle(tx.from)}
                    </TableCell>
                    <TableCell className="text-white text-center">
                      {formatAddressWithStyle(tx.to)}
                  </TableCell>
                  <TableCell className="text-white text-center transition-all duration-300">
                      <div>{formatValue(tx.value, tx.from, tx.reference)}</div>
                      <div className="text-gray-400 text-xs mt-0.5">
                        {formatDollarValue(Number(tx.value) / 1e18)}
                      </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsTable;