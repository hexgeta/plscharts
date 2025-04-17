import type { NextPage } from 'next';
import { useState } from 'react';
import { TransactionsTable, Filters, Chart } from '@/components/pls-sac-addresses';
import { WalletNetwork } from '@/components/pls-sac-addresses/WalletNetwork';
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
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">PLS SAC Address Transactions</h1>
      <p className="text-white/60 text-center mb-8">
        View the main transaction movements from the Pls Sac address & its many daughter addresses. It excludes user input sac funds and focuses solely on the sac addess owners actions. It also excludes ERC20 & gas transactions.
      </p>

      {/* Filters */}
      <Filters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* Network Visualization
      <WalletNetwork 
        transactions={transactions}
        isLoading={isLoading}
      /> */}

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

export default PLSSacAddressesPage; 