'use client';

import React, { useState, useEffect } from 'react';
import { useCryptoPrice } from "@/hooks/crypto/useCryptoPrice";
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

interface StakeData {
  id: string;
  address: string;
  stakedHearts: string;
  stakeTShares: string;
  stakedDays: string;
  startDay: string;
  endDay: string;
  isActive: boolean;
  chain: 'ETH' | 'PLS';
}

const OA_ADDRESSES = [
// ACTIVE ON PLS & ETH
  "0x5280aa3cf5d6246b8a17dfa3d75db26617b73937",
  "0xa2e1734682c6a237c070d93019a7e0bf7047406c",

// ACTIVE ON ETH ONLY
  "0xfa22be2da9013c4641077bf58690040671f90c81",
  "0x1dc195d9291a10ac28ae4de8aa2c5ebe328b3324",
  "0x14be885185dbc61e98e5b63a929493b231d42969",
  "0x1d6de2f43d00ec3daa8ee37ed43cd4f855ca4b58",
  "0x31d89631ee529b9b892d8e3b78464ee36d308056",
  "0x4a107629cefcf0027bfafb3da47e7e9096c2ed85",
  "0x2d2c2ff3345de305ea06c35c958b0a4fd774abda",

// INACTIVE CURRENTLY
  "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39",
  "0x075e72a5edf65f0a5f44699c7654c1a76941ddc8",
  "0xb17c443c89b0c18e53b6f25af55297e122b30f5c",
  "0xbfc9c5878245fb9fe49c688a9c554c8a1fae71fa",
  "0x20fcb7b4e103ec482645e15715c8a2e7a437fbd6",
  "0xb628441794cd41484be092b3b5f4b2ff7271eb60",
  "0x7be74346dc745ea11035881092409088bc76db59",
  "0x1a73652bfa6c26c632af21f52aacbcbdb396d659"
];

const SUBGRAPH_URLS = {
  ETH: 'https://graph.ethereum.pulsechain.com/subgraphs/name/Codeakk/Hex',
  PLS: 'https://graph.pulsechain.com/subgraphs/name/Codeakk/Hex'
};

const calculateCurrentHexDay = () => {
  const HEX_LAUNCH_DATE = new Date('2019-12-03T00:00:00Z').getTime();
  const SECONDS_PER_DAY = 86400;
  const currentTimestamp = Date.now();
  return Math.floor((currentTimestamp - HEX_LAUNCH_DATE) / (SECONDS_PER_DAY * 1000)) - 2;
};

const formatDate = (hexDay: string) => {
  // HEX launch date in UTC
  const HEX_LAUNCH_DATE = new Date('2019-12-03T00:00:00.000Z');
  const date = new Date(HEX_LAUNCH_DATE.getTime() + ((parseInt(hexDay) - 2) * 24 * 60 * 60 * 1000));
  
  // Format in UTC to avoid timezone shifts
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  }).replace(/\//g, '.');
};

const formatNumber = (value: number | string, decimals = 1) => {
  const num = typeof value === 'string' ? Number(value) : value;
  console.log('Formatting number:', { input: value, parsed: num });
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(0)} B`;
  } else if (num >= 1000000) {
    return `${(num / 1000000).toFixed(0)} M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(decimals)} K`;
  }
  return num.toFixed(decimals);
};

const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function OAStakesTable() {
  const [stakes, setStakes] = useState<StakeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { priceData } = useCryptoPrice('pHEX');

  useEffect(() => {
    const fetchStakes = async () => {
      try {
        setIsLoading(true);
        const currentDay = calculateCurrentHexDay();
        const addresses = OA_ADDRESSES.map(addr => addr.toLowerCase()).join('","');
        
        const fetchAllStakesFromChain = async (url: string, chain: 'ETH' | 'PLS') => {
          let allStakes: any[] = [];
          let hasMore = true;
          let skip = 0;
          const first = 1000; // Fetch 1000 stakes at a time
          
          while (hasMore) {
            const query = `{
              stakeStarts(
                first: ${first},
                skip: ${skip},
                where: { stakerAddr_in: ["${addresses}"] }
                orderBy: stakeTShares
                orderDirection: desc
              ) {
                id
                stakerAddr
                stakedHearts
                stakedDays
                stakeTShares
                startDay
                endDay
              }
            }`;

            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query }),
            });

            const result = await response.json();
            console.log(`Raw ${chain} stakes data:`, result.data?.stakeStarts);
            const fetchedStakes = result.data?.stakeStarts || [];
            
            if (fetchedStakes.length > 0) {
              allStakes = [...allStakes, ...fetchedStakes];
              skip += first;
            } else {
              hasMore = false;
            }
          }
          
          return allStakes.map((stake: any) => {
            const stakeEndDay = Number(stake.startDay) + Number(stake.stakedDays);
            console.log(`Processing stake from ${chain}:`, {
              stakeTShares: stake.stakeTShares,
              formattedTShares: Number(stake.stakeTShares) / 1e12
            });
            return {
              id: `${chain}-${stake.id}`,
              address: stake.stakerAddr,
              stakedHearts: stake.stakedHearts,
              stakeTShares: stake.stakeTShares,
              stakedDays: stake.stakedDays,
              startDay: stake.startDay,
              endDay: stakeEndDay.toString(),
              isActive: currentDay < stakeEndDay,
              chain
            };
          });
        };

        // Fetch stakes from both chains
        const [ethStakes, plsStakes] = await Promise.all([
          fetchAllStakesFromChain(SUBGRAPH_URLS.ETH, 'ETH'),
          fetchAllStakesFromChain(SUBGRAPH_URLS.PLS, 'PLS')
        ]);

        const combinedStakes = [...ethStakes, ...plsStakes]
          .sort((a, b) => Number(b.stakeTShares) - Number(a.stakeTShares));

        setStakes(combinedStakes);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching stakes:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setIsLoading(false);
      }
    };

    fetchStakes();
  }, []);

  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="w-full py-4 px-1 xs:px-8">
      <div className="rounded-lg overflow-x-auto border border-[#333]">
        <div className="min-w-[800px]">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#333] hover:bg-transparent">
                <TableHead className="text-gray-400 font-800 text-center">#</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">Chain</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">Start Date</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">End Date</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">Length</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">Status</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">Address</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">Principle</TableHead>
                <TableHead className="text-gray-400 font-800 text-center">T-Shares</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i} className="border-b border-[#333]">
                    <TableCell colSpan={9}>
                      <Skeleton className="h-4 w-full bg-gray-700" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                stakes.map((stake, index) => (
                  <TableRow 
                    key={stake.id} 
                    className={`border-b border-[#333] hover:bg-[#1a1a1a] ${stake.isActive ? "" : "opacity-50"}`}
                  >
                    <TableCell className="text-white text-center">{index + 1}</TableCell>
                    <TableCell className="text-white text-center">
                      <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${stake.chain === 'ETH' ? 'border border-[#00FFFF]/50 bg-[#00FFFF]/10 text-[#00FFFF]' : 'border border-[#9945FF]/50 bg-[#9945FF]/10 text-[#9945FF]'}`}>
                        {stake.chain}
                      </span>
                    </TableCell>
                    <TableCell className="text-white text-center">{formatDate(stake.startDay)}</TableCell>
                    <TableCell className="text-white text-center">{formatDate(stake.endDay)}</TableCell>
                    <TableCell className="text-white text-center">{stake.stakedDays} D</TableCell>
                    <TableCell className="text-white text-center">
                      {stake.isActive ? 
                        <span className="inline-block px-2 py-1 rounded-md text-xs font-medium border border-green-500/50 bg-green-500/10 text-green-400">
                          Active
                        </span> : 
                        <span className="inline-block px-2 py-1 rounded-md text-xs font-medium border border-gray-500/50 bg-gray-500/10 text-gray-400">
                          Ended
                        </span>
                      }
                    </TableCell>
                    <TableCell className="text-white text-center">
                      <Link 
                        href={`https://hexscout.com/${stake.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-white/80 text-white"
                      >
                        {formatAddress(stake.address)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-white text-center">
                      {formatNumber(Number(stake.stakedHearts) / 1e8)} HEX
                    </TableCell>
                    <TableCell className="text-white text-center">
                      {(() => {
                        const tShareValue = Number(stake.stakeTShares);
                        console.log('T-Share display value:', {
                          raw: stake.stakeTShares,
                          value: tShareValue,
                          formatted: formatNumber(tShareValue)
                        });
                        return formatNumber(tShareValue);
                      })()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
} 