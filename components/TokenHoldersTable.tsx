import React from 'react';
import { useState } from 'react';
import useSWR from 'swr';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton2";
import { Input } from "@/components/ui/input";
import { ArrowUpRight } from "lucide-react";
import MatrixBackground from './MatrixBackground';

// ... existing interfaces ...

const TokenHoldersTable: React.FC = () => {
  const [searchAddress, setSearchAddress] = useState('');
  
  const { data: balances, error, isLoading } = useSWR<TokenBalance[]>(
    `/api/token-holders?contractAddress=${DECI_TOKEN_ADDRESS}`,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
      errorRetryCount: 3,
      onError: (err) => {
        console.error('SWR Error:', err);
      }
    }
  );

  const filteredBalances = balances?.filter(balance => 
    searchAddress ? balance.address.toLowerCase().includes(searchAddress.toLowerCase()) : true
  ) ?? [];

  if (isLoading) {
    return (
      <>
        <MatrixBackground />
        <div className="w-full py-6 px-4">
          <Skeleton variant="table" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <MatrixBackground />
        <div className="text-center text-red-500 p-4">
          Error: {error instanceof Error ? error.message : 'Failed to fetch token holders'}
          <br />
          <small className="text-gray-400">Please try refreshing the page</small>
        </div>
      </>
    );
  }

  if (filteredBalances.length === 0) {
    return (
      <>
        <MatrixBackground />
        <div className="text-center text-gray-500 p-4">No token holders found</div>
      </>
    );
  }

  return (
    <>
      <MatrixBackground />
      <div className="w-full py-6 px-4 relative">
        <div className="mb-4">
          <Input
            placeholder="Search by address..."
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            className="max-w-sm bg-black/50 text-white border-gray-700"
          />
        </div>
        <div className="rounded-lg overflow-x-auto border border-[#333] bg-black/50 backdrop-blur-sm">
          <div className="min-w-[800px]">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Owner Address</TableHead>
                  <TableHead className="text-gray-300">Balance</TableHead>
                  <TableHead className="text-gray-300">% Supply</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBalances.map((balance, index) => (
                  <TableRow 
                    key={index} 
                    className="border-gray-700 hover:bg-white/5"
                  >
                    <TableCell className="font-mono text-gray-300">
                      {balance.address}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {formatBalance(balance.balance)}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {balance.percentage.toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      <a
                        href={`https://portfolio.lookintomaxi.com?wallet1=${balance.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block hover:opacity-70"
                      >
                        <ArrowUpRight className="h-4 w-4 text-gray-300" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  );
};

export default TokenHoldersTable; 