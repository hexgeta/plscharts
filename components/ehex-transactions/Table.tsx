import React, { useEffect, useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton2";
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DateRange } from 'react-day-picker';
import { useCryptoPrice } from '@/hooks/crypto/useCryptoPrice';

const EHEX_CONTRACT = '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39';
const TARGET_ADDRESS = '0x705C053d69eB3B8aCc7C404690bD297700cCf169';
const ETHERSCAN_API_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;

interface EtherscanERC20Tx {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
}

interface Transaction extends EtherscanERC20Tx {
  direction: 'sell' | 'buy';
}

interface TableProps {
  onLoadingChange: (loading: boolean) => void;
  dateRange: DateRange | undefined;
  onTransactionsChange: (transactions: Transaction[]) => void;
}

const formatAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatValue = (value: string, decimals: string) => {
  const divisor = Math.pow(10, Number(decimals));
  const num = Number(value) / divisor;
  return num < 1 ? num.toFixed(4) : num.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const formatDollarValue = (value: string, decimals: string, price: number | null, priceLoading: boolean) => {
  if (priceLoading || !price) return '$...';
  const ehexValue = Number(value) / Math.pow(10, Number(decimals));
  const usd = ehexValue * price;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(2)}K`;
  return `$${usd.toFixed(2)}`;
};

export const TransactionsTable: React.FC<TableProps> = ({
  onLoadingChange,
  dateRange,
  onTransactionsChange,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { priceData, isLoading: priceLoading } = useCryptoPrice('eHEX');
  const ehexPrice = priceData?.price || null;

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      onLoadingChange(true);
      setError(null);
      try {
        if (!ETHERSCAN_API_KEY) {
          setError('Etherscan API key not found.');
          setIsLoading(false);
          onLoadingChange(false);
          return;
        }
        const url = `https://api.etherscan.io/api?module=account&action=tokentx&address=${TARGET_ADDRESS}&contractaddress=${EHEX_CONTRACT}&page=1&offset=1000&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!Array.isArray(data.result)) {
          setError('No transaction data found.');
          setIsLoading(false);
          onLoadingChange(false);
          return;
        }
        const sells = data.result.filter((tx: EtherscanERC20Tx) => tx.from.toLowerCase() === TARGET_ADDRESS.toLowerCase())
          .map((tx: EtherscanERC20Tx) => ({ ...tx, direction: 'sell' as const }));
        setTransactions(sells);
        onTransactionsChange(sells);
      } catch (err) {
        setError('Failed to fetch transactions.');
      } finally {
        setIsLoading(false);
        onLoadingChange(false);
      }
    };
    fetchTransactions();
  }, [dateRange, onLoadingChange, onTransactionsChange]);

  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="w-full py-4 px-1 xs:px-8">
      {isLoading ? (
        <div className="space-y-4">
          <div className="text-center text-gray-400">Loading eHEX sell transactions...</div>
          <div className="rounded-lg border border-[#333] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#333] hover:bg-transparent">
                  <TableHead className="text-gray-400 font-800 text-center w-[40px]">#</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">Date</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">Tx Hash</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">From</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">To</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">Value</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">Type</TableHead>
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
                    <TableCell><Skeleton className="h-6 w-24 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 mx-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center text-gray-400 py-8">No eHEX sell transactions found.</div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-[#333] overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#333] hover:bg-transparent">
                  <TableHead className="text-gray-400 font-800 text-center w-[40px]">#</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">Date</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">Tx Hash</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">From</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">To</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">Type</TableHead>
                  <TableHead className="text-gray-400 font-800 text-center">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx, index) => (
                  <TableRow key={tx.hash} className={cn("border-b border-[#333] hover:bg-[#1a1a1a] transition-all duration-300")}
                  >
                    <TableCell className="text-white text-center">{index + 1}</TableCell>
                    <TableCell className="text-white text-center">{new Date(Number(tx.timeStamp) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</TableCell>
                    <TableCell className="text-white text-center">
                      <Link href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/80 text-white">
                        {formatAddress(tx.hash)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-white text-center">
                      <Link href={`https://etherscan.io/address/${tx.from}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/80 text-white">
                        {formatAddress(tx.from)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-white text-center">
                      <Link href={`https://etherscan.io/address/${tx.to}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/80 text-white">
                        {formatAddress(tx.to)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-white text-center">
                      <span className="inline-block px-2 py-1 rounded-md text-xs font-medium bg-red-700/80 text-white">Sell</span>
                    </TableCell>
                    <TableCell className="text-white text-center transition-all duration-300">
                      <div>{formatValue(tx.value, tx.tokenDecimal)} eHEX</div>
                      <div className="text-gray-400 text-xs mt-0.5">{formatDollarValue(tx.value, tx.tokenDecimal, ehexPrice, priceLoading)}</div>
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