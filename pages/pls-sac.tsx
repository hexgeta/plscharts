import type { NextPage } from 'next';
import { useState } from 'react';
import { TransactionsTable, Filters, Chart } from '@/components/pls-sac-addresses';
import { DateRange } from 'react-day-picker';

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

const PLSSacAddressesPage: NextPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [walletFilter, setWalletFilter] = useState<'all' | 'main' | 'daughter1' | 'daughter2'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">PLS SAC Address Transactions</h1>
      <p className="text-white/60 text-center mb-8">
        View the main transaction movements from the Pls Sac address & its many daughter addresses. It excludes user input sac funds and focuses solely on the sac addess owner's actions. It also excludes ERC20 & gas transactions.
      </p>

      {/* Filters */}
      <Filters
        walletFilter={walletFilter}
        dateRange={dateRange}
        onWalletFilterChange={setWalletFilter}
        onDateRangeChange={setDateRange}
      />

      {/* Chart */}
      <Chart 
        transactions={transactions}
        isLoading={isLoading}
        dateRange={dateRange}
      />

      {/* Table */}
      <TransactionsTable 
        onLoadingChange={setIsLoading}
        walletFilter={walletFilter}
        dateRange={dateRange}
        onTransactionsChange={setTransactions}
      />
    </div>
  );
};

export default PLSSacAddressesPage; 