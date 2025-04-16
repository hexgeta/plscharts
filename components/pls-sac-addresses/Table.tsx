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
import { useCryptoPrice } from '@/hooks/crypto/useCryptoPrice';
import { TOKEN_CONSTANTS } from '@/constants/crypto';

const TARGET_ADDRESS = '0x1b7baa734c00298b9429b518d621753bb0f6eff2';
const ETHERSCAN_API_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;

interface EtherscanTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  blockNumber: string;
  isError?: string;
}

interface Transaction extends EtherscanTransaction {
  reference: string;
  label: string;
}

interface EtherscanResponse {
  status: string;
  message: string;
  result: EtherscanTransaction[];
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
  },
  {
    address: '0xB17c443c89B0c18e53B6E25aE55297e122B30E5c',
    label: 'Daughter 3'
  },
  {
    address: '0xbFc9C5878245fb9FE49c688a9c554cBA1FAE71fA',
    label: 'Daughter 4'
  },
  {
    address: '0x20fCB7b4E103EC482645E15715c8a2E7a437FBD6',
    label: 'Daughter 5'
  },
  {
    address: '0xB628441794cd41484BE092B3b5f4b2fF7271eb60',
    label: 'Daughter 6'
  },
  {
    address: '0x7bE74346Dc745EA110358810924C9088BC76Db59',
    label: 'Daughter 7'
  },
  {
    address: '0x1a73652bFAdc26C632aE21F52AacbCBdb396d659',
    label: 'Daughter 8'
  },
  {
    address: '0x0658166531c5618e605566eaa97697047fCF559',
    label: 'Daughter 9'
  },
  {
    address: '0xB727d70c04520FA68aE5802859487317496b4F99',
    label: 'Daughter 10'
  },
  {
    address: '0x04652660148bfA25F660A1a783401821f5B541e',
    label: 'Daughter 11'
  },
  {
    address: '0xa99682f323379F788Bc4F004CF0a135ff1e226D7',
    label: 'Daughter 12'
  },
  {
    address: '0x7C90b72Da9344980bF31B20c4b4ab31f026bC54e',
    label: 'Daughter 13'
  },
  {
    address: '0xe6F9aA98e85c703B37e8d9AfEaef2f464750E063',
    label: 'Daughter 14'
  },
  {
    address: '0x63f97aD9fA0d4e8ca5Bb2F21334366806f802547',
    label: 'Daughter 15'
  },
  {
    address: '0xc83DEeAD548E132Cd1a0464D02e2DE128BA75f9b',
    label: 'Daughter 16'
  },
  {
    address: '0xb928a97E5Ecd27C668cc370939C8f62f93DE54fa',
    label: 'Daughter 17'
  },
  {
    address: '0x33cF90c54b777018CB5d7Ff76f30e73235a61c78',
    label: 'Daughter 18'
  },
  {
    address: '0xF8086ee4A78Ab88640EAFB107aE7BC9Ac64C35EC',
    label: 'Daughter 19'
  },
  {
    address: '0x4BB20207BAA8688904F0C35147F19B61ddc16FD0',
    label: 'Daughter 20'
  },
  {
    address: '0xb8691E71F4D0aB9A6abbdeCe20fABC8C7521Cd43',
    label: 'Daughter 21'
  },
  {
    address: '0xaB203F75546C0f2905D71351f0436eFEFA4A0daC',
    label: 'Daughter 22'
  },
  {
    address: '0x1B7BAa734C00298b9429b518D621753Bb0f6efF2',
    label: 'Daughter 23'
  },
  {
    address: '0xc3B7f26d6C64024D5269DB60cEFCC3807ef31C1f',
    label: 'Daughter 24'
  },
  {
    address: '0x13c808Af0281c18a89e8438317c66Dd9645E8662',
    label: 'Daughter 25'
  },
  {
    address: '0x9320249FD87CD011ACf1E3b269180B74cDD3519E',
    label: 'Daughter 26'
  },
  {
    address: '0x0083d744c0949AD9091f236F33E7Fb17e69c03ee',
    label: 'Daughter 27'
  },
  {
    address: '0x0e8Eb2232Fc3fB0c10756cD65D7052987D6316f4',
    label: 'Daughter 28'
  },
  {
    address: '0xFE19b054F7B0cb7F4c051372Ab2bD799472583CC',
    label: 'Daughter 29'
  },
  {
    address: '0x293bF003350f068698036d63eEec322B7F437eEE',
    label: 'Daughter 30'
  }
];

// Add color mapping for each address
const ADDRESS_COLORS = {
  '0x9Cd83BE15a79646A3D22B81fc8dDf7B7240a62cB': {
    border: 'border-[#FFFF00]/50',
    bg: 'bg-[#FFFF00]/10',
    text: 'text-[#FFFF00]',
    hoverText: 'hover:text-[#FFFF80]'
  },
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
  '0xB17c443c89B0c18e53B6E25aE55297e122B30E5c': {
    border: 'border-[#00FF00]/50',
    bg: 'bg-[#00FF00]/10',
    text: 'text-[#00FF00]',
    hoverText: 'hover:text-[#80FF80]'
  },
  '0xbFc9C5878245fb9FE49c688a9c554cBA1FAE71fA': {
    border: 'border-[#FF8C00]/50',
    bg: 'bg-[#FF8C00]/10',
    text: 'text-[#FF8C00]',
    hoverText: 'hover:text-[#FFA500]'
  },
  '0x20fCB7b4E103EC482645E15715c8a2E7a437FBD6': {
    border: 'border-[#4B0082]/50',
    bg: 'bg-[#4B0082]/10',
    text: 'text-[#4B0082]',
    hoverText: 'hover:text-[#8A2BE2]'
  },
  '0xB628441794cd41484BE092B3b5f4b2fF7271eb60': {
    border: 'border-[#FF1493]/50',
    bg: 'bg-[#FF1493]/10',
    text: 'text-[#FF1493]',
    hoverText: 'hover:text-[#FF69B4]'
  },
  '0x7bE74346Dc745EA110358810924C9088BC76Db59': {
    border: 'border-[#20B2AA]/50',
    bg: 'bg-[#20B2AA]/10',
    text: 'text-[#20B2AA]',
    hoverText: 'hover:text-[#48D1CC]'
  },
  '0x1a73652bFAdc26C632aE21F52AacbCBdb396d659': {
    border: 'border-[#BA55D3]/50',
    bg: 'bg-[#BA55D3]/10',
    text: 'text-[#BA55D3]',
    hoverText: 'hover:text-[#DA70D6]'
  },
  '0x0658166531c5618e605566eaa97697047fCF559': {
    border: 'border-[#F0E68C]/50',
    bg: 'bg-[#F0E68C]/10',
    text: 'text-[#F0E68C]',
    hoverText: 'hover:text-[#F5DEB3]'
  },
  '0xB727d70c04520FA68aE5802859487317496b4F99': {
    border: 'border-[#98FB98]/50',
    bg: 'bg-[#98FB98]/10',
    text: 'text-[#98FB98]',
    hoverText: 'hover:text-[#90EE90]'
  },
  '0x04652660148bfA25F660A1a783401821f5B541e': {
    border: 'border-[#FFA07A]/50',
    bg: 'bg-[#FFA07A]/10',
    text: 'text-[#FFA07A]',
    hoverText: 'hover:text-[#FA8072]'
  },
  '0xa99682f323379F788Bc4F004CF0a135ff1e226D7': {
    border: 'border-[#9370DB]/50',
    bg: 'bg-[#9370DB]/10',
    text: 'text-[#9370DB]',
    hoverText: 'hover:text-[#8A2BE2]'
  },
  '0x7C90b72Da9344980bF31B20c4b4ab31f026bC54e': {
    border: 'border-[#3CB371]/50',
    bg: 'bg-[#3CB371]/10',
    text: 'text-[#3CB371]',
    hoverText: 'hover:text-[#2E8B57]'
  },
  '0xe6F9aA98e85c703B37e8d9AfEaef2f464750E063': {
    border: 'border-[#FFB6C1]/50',
    bg: 'bg-[#FFB6C1]/10',
    text: 'text-[#FFB6C1]',
    hoverText: 'hover:text-[#FFC0CB]'
  },
  '0x63f97aD9fA0d4e8ca5Bb2F21334366806f802547': {
    border: 'border-[#BDB76B]/50',
    bg: 'bg-[#BDB76B]/10',
    text: 'text-[#BDB76B]',
    hoverText: 'hover:text-[#DAA520]'
  },
  '0xc83DEeAD548E132Cd1a0464D02e2DE128BA75f9b': {
    border: 'border-[#20B2AA]/50',
    bg: 'bg-[#20B2AA]/10',
    text: 'text-[#20B2AA]',
    hoverText: 'hover:text-[#48D1CC]'
  },
  '0xb928a97E5Ecd27C668cc370939C8f62f93DE54fa': {
    border: 'border-[#FF69B4]/50',
    bg: 'bg-[#FF69B4]/10',
    text: 'text-[#FF69B4]',
    hoverText: 'hover:text-[#FF1493]'
  },
  '0x33cF90c54b777018CB5d7Ff76f30e73235a61c78': {
    border: 'border-[#7B68EE]/50',
    bg: 'bg-[#7B68EE]/10',
    text: 'text-[#7B68EE]',
    hoverText: 'hover:text-[#6A5ACD]'
  },
  '0xF8086ee4A78Ab88640EAFB107aE7BC9Ac64C35EC': {
    border: 'border-[#00CED1]/50',
    bg: 'bg-[#00CED1]/10',
    text: 'text-[#00CED1]',
    hoverText: 'hover:text-[#40E0D0]'
  },
  '0x4BB20207BAA8688904F0C35147F19B61ddc16FD0': {
    border: 'border-[#DEB887]/50',
    bg: 'bg-[#DEB887]/10',
    text: 'text-[#DEB887]',
    hoverText: 'hover:text-[#F4A460]'
  },
  '0xb8691E71F4D0aB9A6abbdeCe20fABC8C7521Cd43': {
    border: 'border-[#00FFFF]/50',
    bg: 'bg-[#00FFFF]/10',
    text: 'text-[#00FFFF]',
    hoverText: 'hover:text-[#E0FFFF]'
  },
  '0xaB203F75546C0f2905D71351f0436eFEFA4A0daC': {
    border: 'border-[#9932CC]/50',
    bg: 'bg-[#9932CC]/10',
    text: 'text-[#9932CC]',
    hoverText: 'hover:text-[#BA55D3]'
  },
  '0x1B7BAa734C00298b9429b518D621753Bb0f6efF2': {
    border: 'border-[#FF7F50]/50',
    bg: 'bg-[#FF7F50]/10',
    text: 'text-[#FF7F50]',
    hoverText: 'hover:text-[#FFA07A]'
  },
  '0xc3B7f26d6C64024D5269DB60cEFCC3807ef31C1f': {
    border: 'border-[#8FBC8F]/50',
    bg: 'bg-[#8FBC8F]/10',
    text: 'text-[#8FBC8F]',
    hoverText: 'hover:text-[#98FB98]'
  },
  '0x13c808Af0281c18a89e8438317c66Dd9645E8662': {
    border: 'border-[#E6E6FA]/50',
    bg: 'bg-[#E6E6FA]/10',
    text: 'text-[#E6E6FA]',
    hoverText: 'hover:text-[#D8BFD8]'
  },
  '0x9320249FD87CD011ACf1E3b269180B74cDD3519E': {
    border: 'border-[#B8860B]/50',
    bg: 'bg-[#B8860B]/10',
    text: 'text-[#B8860B]',
    hoverText: 'hover:text-[#DAA520]'
  },
  '0x0083d744c0949AD9091f236F33E7Fb17e69c03ee': {
    border: 'border-[#98FB98]/50',
    bg: 'bg-[#98FB98]/10',
    text: 'text-[#98FB98]',
    hoverText: 'hover:text-[#90EE90]'
  },
  '0x0e8Eb2232Fc3fB0c10756cD65D7052987D6316f4': {
    border: 'border-[#CD853F]/50',
    bg: 'bg-[#CD853F]/10',
    text: 'text-[#CD853F]',
    hoverText: 'hover:text-[#DEB887]'
  },
  '0xFE19b054F7B0cb7F4c051372Ab2bD799472583CC': {
    border: 'border-[#FFB6C1]/50',
    bg: 'bg-[#FFB6C1]/10',
    text: 'text-[#FFB6C1]',
    hoverText: 'hover:text-[#FFC0CB]'
  },
  '0x293bF003350f068698036d63eEec322B7F437eEE': {
    border: 'border-[#7B68EE]/50',
    bg: 'bg-[#7B68EE]/10',
    text: 'text-[#7B68EE]',
    hoverText: 'hover:text-[#6A5ACD]'
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
  
  // If the absolute value is 0, return empty string
  if (Math.abs(num) === 0) {
    return '';
  }
  
  // Format with 2 decimal places if less than 1 ETH, otherwise round to whole numbers
  const formattedNum = Math.abs(num) < 1 
    ? Math.abs(num).toFixed(2)
    : Math.round(Math.abs(num));
    
  return `${prefix}${formattedNum} ETH`;
};

// Add these utility functions at the top, after the imports
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url: string, retries = 3, delayMs = 2000): Promise<{ response: Response; data: EtherscanResponse }> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      // Check for rate limit
      if (data.message?.includes('Max rate limit reached')) {
        console.log(`Rate limit reached, attempt ${i + 1}/${retries}, waiting ${delayMs}ms`);
        await delay(delayMs);
        continue;
      }
      
      return { response, data };
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`Attempt ${i + 1}/${retries} failed, retrying in ${delayMs}ms`);
      await delay(delayMs);
    }
  }
  throw new Error('Max retries reached');
};

export function TransactionsTable({ onLoadingChange, walletFilter, dateRange, onTransactionsChange }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalFetched, setTotalFetched] = useState(0);
  const { priceData, isLoading: priceLoading, error: priceError } = useCryptoPrice('WETH');
  
  // Debug logs for price data
  useEffect(() => {
    console.log('RAW_DEXSCREENER_TABLE_DEBUG:', {
      priceData,
      priceLoading,
      priceError,
      hasPrice: Boolean(priceData?.price),
      priceValue: priceData?.price,
      tokenConfig: TOKEN_CONSTANTS['WETH']
    });
  }, [priceData, priceLoading, priceError]);

  const wethPrice = priceData?.price || null;

  // Check for API key early
  useEffect(() => {
    if (!ETHERSCAN_API_KEY) {
      setError('Etherscan API key not found. Please check your environment variables.');
      setIsLoading(false);
      return;
    }
  }, []);

  // Update parent loading state
  useEffect(() => {
    onLoadingChange?.(isLoading || priceLoading);
  }, [isLoading, priceLoading, onLoadingChange]);

  // Add back transaction fetching
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        if (!ETHERSCAN_API_KEY) {
          console.error('No Etherscan API key found');
          setError('Etherscan API key not found. Please check your environment variables.');
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setError(null);
        console.log('Starting to fetch transactions for', TRACKED_ADDRESSES.length, 'addresses');

        // Process addresses in batches to avoid rate limiting
        const BATCH_SIZE = 3;
        const allTransactions: Transaction[] = [];
        
        for (let i = 0; i < TRACKED_ADDRESSES.length; i += BATCH_SIZE) {
          const batch = TRACKED_ADDRESSES.slice(i, i + BATCH_SIZE);
          const batchPromises = batch.map(async ({ address, label }) => {
            try {
              console.log(`Fetching transactions for ${label} (${address})`);
              const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10000&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
              
              const { data } = await fetchWithRetry(url);
              
              console.log(`API Response for ${label}:`, {
                status: data.status,
                message: data.message,
                resultCount: Array.isArray(data.result) ? data.result.length : 'not an array'
              });

              if (data.status === '0') {
                if (data.message === 'No transactions found') {
                  console.log(`No transactions found for ${label}`);
                  return [] as Transaction[];
                }
                throw new Error(data.message || 'API Error');
              }

              if (!Array.isArray(data.result)) {
                console.error(`Invalid result format for ${label}:`, data.result);
                return [] as Transaction[];
              }

              const transactions = data.result.map((tx: EtherscanTransaction): Transaction => ({
                ...tx,
                reference: address,
                label: label
              }));
              
              console.log(`Found ${transactions.length} transactions for ${label}`);
              return transactions;
            } catch (err) {
              console.error(`Error fetching transactions for ${label}:`, err);
              return [] as Transaction[];
            }
          });

          const batchResults = await Promise.all(batchPromises);
          allTransactions.push(...batchResults.flat());
          
          // Add delay between batches to avoid rate limiting
          if (i + BATCH_SIZE < TRACKED_ADDRESSES.length) {
            await delay(1000);
          }
        }

        console.log('Total transactions fetched:', allTransactions.length);
        
        if (allTransactions.length === 0) {
          console.error('No transactions found for any address');
          setError('No transaction data available. Please try again later.');
          setIsLoading(false);
          return;
        }

        // Filter transactions
        const filteredTransactions = allTransactions.filter(tx => {
          const isToPlsSac = tx.to?.toLowerCase() === PLS_SAC_ADDRESS.toLowerCase();
          const ethValue = Number(tx.value) / Math.pow(10, 18);
          const shouldKeep = !isToPlsSac && ethValue >= 0.1;
          return shouldKeep;
        });

        console.log(`Found ${filteredTransactions.length} transactions after filtering`);

        // Sort transactions
        const sortedTransactions = filteredTransactions.sort((a, b) => 
          parseInt(b.timeStamp) - parseInt(a.timeStamp)
        );

        setTransactions(sortedTransactions);
        onTransactionsChange?.(sortedTransactions);
        setTotalFetched(sortedTransactions.length);
        setIsLoading(false);
      } catch (err) {
        console.error('Error in fetchTransactions:', err);
        setError('Failed to fetch transactions. Please try again later.');
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [onTransactionsChange]);

  const formatDollarValue = (ethAmount: number) => {
    if (priceLoading || !wethPrice) return '$...';
    const value = Math.abs(ethAmount) * wethPrice;
    return value >= 1_000_000 
      ? `$${(value / 1_000_000).toFixed(2)}M` 
      : value >= 1_000 
      ? `$${(value / 1_000).toFixed(2)}K` 
      : `$${value.toFixed(2)}`;
  };

  // Add debug log for price data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('WETH Price:', wethPrice);
    }
  }, [wethPrice]);

  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="w-full py-4 px-1 xs:px-8">
      {(isLoading || priceLoading) ? (
        <div className="space-y-4">
          <div className="text-center text-gray-400">
            {isLoading ? `Fetching transactions... Found ${totalFetched} so far` : 'Loading price data...'}
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
}

export default TransactionsTable;