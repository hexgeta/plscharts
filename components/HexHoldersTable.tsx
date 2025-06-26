'use client';

import { useState, useMemo } from 'react';
import { useHexHolders } from '@/hooks/crypto/useHexHolders';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/utils/format';
import { format } from 'date-fns';
import Image from 'next/image';

// League thresholds in percentages (matching LeagueTable.tsx)
const LEAGUES = [
  { name: 'Poseidon', percentage: 10, icon: '/other-images/poseidon.png' },
  { name: 'Whale', percentage: 1, icon: '/other-images/whale.png' },
  { name: 'Shark', percentage: 0.1, icon: '/other-images/shark.png' },
  { name: 'Dolphin', percentage: 0.01, icon: '/other-images/dolphin.png' },
  { name: 'Squid', percentage: 0.001, icon: '/other-images/squid.png' },
  { name: 'Turtle', percentage: 0.0001, icon: '/other-images/turtle.png' },
  { name: 'Crab', percentage: 0.00001, icon: '/other-images/crab.png' },
  { name: 'Shrimp', percentage: 0.000001, icon: '/other-images/shrimp.png' },
  { name: 'Shell', percentage: 0.0000001, icon: '/other-images/shell.png' }
];

const ITEMS_PER_PAGE = 100;

function getLeague(balance: number, totalSupply: number) {
  const percentage = (balance / totalSupply) * 100;
  return LEAGUES.find(league => percentage >= league.percentage) || LEAGUES[LEAGUES.length - 1];
}

// Add new formatting function
function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000_000) {
    return (num / 1_000_000_000_000).toFixed(2) + 'T';
  }
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  }
  return formatNumber(num);
}

export function HexHoldersTable() {
  const { holders, isLoading, error } = useHexHolders();
  const [page, setPage] = useState(1);

  // Calculate league statistics
  const leagueStats = useMemo(() => {
    return LEAGUES.map(league => {
      const holdersInLeague = holders.filter(holder => {
        const holderLeague = getLeague(holder.balance, holders.reduce((sum, holder) => sum + holder.balance, 0));
        return holderLeague.name === league.name;
      });
      return {
        ...league,
        count: holdersInLeague.length,
        totalBalance: holdersInLeague.reduce((sum, holder) => sum + holder.balance, 0)
      };
    });
  }, [holders]);

  if (isLoading) {
    return (
      <Card className="w-full p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading holder data...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full p-4">
        <div className="flex items-center justify-center min-h-[400px] text-destructive">
          Error loading holder data: {error}
        </div>
      </Card>
    );
  }

  if (!holders.length) {
    return (
      <Card className="w-full p-4">
        <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
          No holder data available
        </div>
      </Card>
    );
  }

  // Calculate statistics
  const totalBalance = holders.reduce((sum, holder) => sum + holder.balance, 0);
  const contractHolders = holders.filter(h => h.isContract);
  const contractBalance = contractHolders.reduce((sum, holder) => sum + holder.balance, 0);
  const latestDate = holders[0].date;

  // Calculate pagination
  const totalPages = Math.ceil(holders.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const displayedHolders = holders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <Card className="w-full">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">HEX Holder Distribution</h2>
          <div className="text-sm text-muted-foreground">
            Last updated: {format(new Date(latestDate), 'PPP')}
          </div>
        </div>
        
        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <div className="text-sm text-muted-foreground">Total Holders</div>
            <div className="text-2xl font-bold">{formatNumber(holders.length)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total HEX</div>
            <div className="text-2xl font-bold">{formatLargeNumber(totalBalance)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Contract Holders</div>
            <div className="text-2xl font-bold">
              {formatNumber(contractHolders.length)}
              <span className="text-sm text-muted-foreground ml-2">
                ({((contractBalance / totalBalance) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">EOA Holders</div>
            <div className="text-2xl font-bold">
              {formatNumber(holders.length - contractHolders.length)}
              <span className="text-sm text-muted-foreground ml-2">
                ({(((totalBalance - contractBalance) / totalBalance) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* League Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {leagueStats.map(league => (
            <div key={league.name} className="flex items-center space-x-2 p-2 rounded-lg bg-card/50">
              <Image
                src={league.icon}
                alt={league.name}
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <div>
                <div className="text-sm font-medium">{league.name}</div>
                <div className="text-sm text-muted-foreground">
                  {formatNumber(league.count)} holders
                </div>
                <div className="text-xs text-muted-foreground">
                  {((league.count / holders.length) * 100).toFixed(1)}% of total
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Rank</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">% of Supply</TableHead>
              <TableHead className="text-right">Type</TableHead>
              <TableHead className="text-right">League</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedHolders.map((holder, index) => {
              const league = getLeague(holder.balance, holders.reduce((sum, holder) => sum + holder.balance, 0));
              return (
                <TableRow key={holder.address}>
                  <TableCell className="font-medium">{startIndex + index + 1}</TableCell>
                  <TableCell className="font-mono">
                    <a 
                      href={`https://scan.pulsechain.com/address/${holder.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary"
                    >
                      {holder.address.slice(0, 6)}...{holder.address.slice(-4)}
                    </a>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(holder.balance)}
                  </TableCell>
                  <TableCell className="text-right">
                    {((holder.balance / totalBalance) * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      holder.isContract 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    }`}>
                      {holder.isContract ? 'Contract' : 'EOA'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <span>{league.name}</span>
                      <Image
                        src={league.icon}
                        alt={league.name}
                        width={24}
                        height={24}
                        className="w-6 h-6"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      <div className="flex justify-between items-center p-4 border-t">
        <Button 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          variant="outline"
        >
          Previous
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {page} of {totalPages} ({formatNumber(holders.length)} total holders)
        </div>
        <Button 
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          variant="outline"
        >
          Next
        </Button>
      </div>
    </Card>
  );
} 