import type { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { TransactionsTable, Chart, SummaryCard } from '@/components/ehex-transactions';
import { DateRange } from 'react-day-picker';
import { useCryptoPrice } from '@/hooks/crypto/useCryptoPrice';

const BANKX_CONTRACT = '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39'; // Update if BankX uses a different contract
const TARGET_ADDRESS = '0x705C053d69eB3B8aCc7C404690bD297700cCf169';

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

const BankXPage: NextPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [ethBalance, setEthBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const { priceData: ehexPriceData, isLoading: ehexPriceLoading } = useCryptoPrice('eHEX');
  const { priceData: ethPriceData, isLoading: ethPriceLoading } = useCryptoPrice('WETH');
  const { priceData: usdcPriceData, isLoading: usdcPriceLoading } = useCryptoPrice('USDC');
  const ehexPrice = ehexPriceData?.price || null;
  const ethPrice = ethPriceData?.price || null;
  const usdcPrice = usdcPriceData?.price || null;

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const res = await fetch('/api/bankx-balances');
        const data = await res.json();
        setBalance(data.ehex ?? 0);
        setEthBalance(data.eth ?? 0);
        setUsdcBalance(data.usdc ?? 0);
      } catch (err) {
        setBalance(0);
        setEthBalance(0);
        setUsdcBalance(0);
      }
    };
    fetchBalances();
  }, []);

  const formatNumber = (value: number | string, decimals = 1) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(decimals)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(decimals)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  };

  // Calculate total eHEX sold
  const totalEhexSold = transactions.reduce((acc, tx) => acc + (Number(tx.value) / Math.pow(10, 8)), 0);
  const totalEhexSoldUsd = ehexPrice ? totalEhexSold * ehexPrice : null;

  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">BankX Dump Tracker</h1>
      <p className="text-white/60 text-center mb-8">
        Tracks eHEX sells from the BankX wallet 0x705C053d69eB3B8aCc7C404690bD297700cCf169 on Ethereum USD Values based on today's price.
      </p>

      {/* Summary Cards */}
      <div className="flex flex-col md:flex-row gap-6 mb-4 justify-center items-stretch w-full max-w-6xl mx-auto">
        <SummaryCard
          title="Total eHEX in Wallet"
          value={`${formatNumber(balance, 0)} eHEX`}
          usdValue={ehexPrice ? `$${formatNumber(balance * ehexPrice, 2)}` : '-'}
          isLoading={ehexPriceLoading}
        />
        <SummaryCard
          title="Total ETH in Wallet"
          value={`${formatNumber(ethBalance, 4)} ETH`}
          usdValue={ethPrice ? `$${formatNumber(ethBalance * ethPrice, 2)}` : '-'}
          isLoading={ethPriceLoading}
        />
        <SummaryCard
          title="Total USDC in Wallet"
          value={`${formatNumber(usdcBalance, 2)} USDC`}
          usdValue={usdcBalance ? `$${formatNumber(usdcBalance, 2)}` : '-'}
          isLoading={usdcPriceLoading}
        />
        <SummaryCard
          title="Total eHEX Sold"
          value={`${formatNumber(totalEhexSold, 0)} eHEX`}
          usdValue={totalEhexSoldUsd ? `$${formatNumber(totalEhexSoldUsd, 2)}` : '-'}
          isLoading={ehexPriceLoading || isLoading}
        />
      </div>

      {/* Chart */}
      <Chart 
        transactions={transactions}
        isLoading={isLoading}
        dateRange={dateRange}
      />

      {/* Table */}
      <TransactionsTable 
        onLoadingChange={setIsLoading}
        dateRange={dateRange}
        onTransactionsChange={setTransactions}
      />
    </div>
  );
};

export default BankXPage; 