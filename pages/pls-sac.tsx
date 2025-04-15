import type { NextPage } from 'next';
import { useState } from 'react';
import { TransactionsTable, Filters } from '@/components/pls-sac-addresses';
import { DateRange } from 'react-day-picker';

const PLSSacAddressesPage: NextPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [walletFilter, setWalletFilter] = useState<'all' | 'main' | 'daughter1' | 'daughter2'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">PLS SAC Address Transactions</h1>
      <p className="text-white/60 text-center mb-8">
        View the main transactions from the Pls Sac address & 2 of its daughter addresses. It excludes user input sac funds and focuses solely on the sac addess owner's actions. It also excludes ERC20 & gas transactions.
      </p>

      {/* Filters
      <Filters
        walletFilter={walletFilter}
        dateRange={dateRange}
        onWalletFilterChange={setWalletFilter}
        onDateRangeChange={setDateRange}
      /> */}

      {/* Table */}
      <TransactionsTable 
        onLoadingChange={setIsLoading}
        walletFilter={walletFilter}
        dateRange={dateRange}
      />
    </div>
  );
};

export default PLSSacAddressesPage; 