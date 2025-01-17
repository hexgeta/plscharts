"use client"

import React from 'react';
import { useGasPrice } from '@/hooks/useGasPrice';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { Skeleton } from "@/components/ui/skeleton2";
import { useCryptoPrice } from "@/hooks/crypto/useCryptoPrice";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface TokenData {
  name: string;
  symbol: string;
  emoji: string;
  daysStaked: number;
  endStakeGasUnitCost: number;
}

const tokens: TokenData[] = [
  { name: 'MAXI', symbol: 'pMAXI', emoji: 'Ⓜ️', daysStaked: TOKEN_CONSTANTS.pMAXI.TOTAL_STAKED_DAYS, endStakeGasUnitCost: 70980 },
  { name: 'DECI', symbol: 'pDECI', emoji: '🛡️', daysStaked: TOKEN_CONSTANTS.pDECI.TOTAL_STAKED_DAYS, endStakeGasUnitCost: 70980 },
  { name: 'LUCKY', symbol: 'pLUCKY', emoji: '🍀', daysStaked: TOKEN_CONSTANTS.pLUCKY.TOTAL_STAKED_DAYS, endStakeGasUnitCost: 70980 },
  { name: 'TRIO', symbol: 'pTRIO', emoji: '🎲', daysStaked: TOKEN_CONSTANTS.pTRIO.TOTAL_STAKED_DAYS, endStakeGasUnitCost: 70980 },
  { name: 'BASE', symbol: 'pBASE', emoji: '🟠', daysStaked: TOKEN_CONSTANTS.pBASE.TOTAL_STAKED_DAYS, endStakeGasUnitCost: 70980 },
];

const GasTable: React.FC = () => {
  const { plsGasPrice, isLoading: gasLoading, error: gasError } = useGasPrice();
  const { priceData: plsPrice, isLoading: priceLoading } = useCryptoPrice("PLS");
  const plsTokenPrice = plsPrice?.price || 0;

  const calculateGasData = (token: TokenData) => {
    if (!plsGasPrice) return null;

    const gasUnitPriceInBeats = plsGasPrice;
    
    // Stake pool calculations
    const endStakeGasCostInPLS = (token.endStakeGasUnitCost / 1000000000) * gasUnitPriceInBeats;
    const endStakeGasCostInUSD = endStakeGasCostInPLS * plsTokenPrice;

    // Solo-stake calculations
    const soloStakeGasUnitCost = 53694 + (2310 * (token.daysStaked));
    const soloStakeGasCostInPLS = (soloStakeGasUnitCost / 1000000000) * gasUnitPriceInBeats;
    const soloStakeGasCostInUSD = soloStakeGasCostInPLS * plsTokenPrice;

    // Savings calculations
    const savingsInUSD = soloStakeGasCostInUSD - endStakeGasCostInUSD ;
    const savingsPercentage = ((soloStakeGasCostInUSD - endStakeGasCostInUSD) / soloStakeGasCostInUSD) * 100;

    return {
      gasUnitPriceInBeats,
      endStakeGasCostInPLS,
      endStakeGasCostInUSD,
      soloStakeGasUnitCost,
      soloStakeGasCostInPLS,
      soloStakeGasCostInUSD,
      savingsInUSD,
      savingsPercentage
    };
  };

  if (gasLoading || priceLoading) {
    return (
      <div className="w-full py-6 px-4">
        <Skeleton variant="table" />
      </div>
    );
  }

  if (gasError) {
    return <div className="text-center text-red-500 p-4">Error: {gasError}</div>;
  }

  return (
    <div className="w-full py-6 px-4">
      <div className="rounded-lg overflow-x-auto border border-[#333]">
        <div className="min-w-[800px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead></TableHead>
                {tokens.map(token => (
                  <TableHead key={token.symbol}>
                    {token.symbol} {token.emoji}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* General Info Section */}
              <TableRow>
                <TableCell className="text-left" colSpan={2}>
                  <div className="text-white text-sm underline font-bold">General info</div>
                </TableCell>
                {tokens.map(token => (
                  <TableCell key={token.symbol} className="text-white"></TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-white text-left" colSpan={2}>Years staked</TableCell>
                {tokens.map(token => (
                  <TableCell key={token.symbol} className="text-white">
                    {(token.daysStaked / 365).toFixed(2)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-white text-left" colSpan={2}>Gas unit price in beats</TableCell>
                {tokens.map(token => {
                  const data = calculateGasData(token);
                  return (
                    <TableCell key={token.symbol} className="text-white">
                      {data?.gasUnitPriceInBeats.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow className="border-b-4 border-[#333]">
                <TableCell className="text-white text-left" colSpan={2}>PLS token price $</TableCell>
                {tokens.map(token => (
                  <TableCell key={token.symbol} className="text-white">
                    ${plsTokenPrice.toFixed(8)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Stake Pool Section */}
              <TableRow>
                <TableCell className="text-left" colSpan={2}>
                  <div className="text-white text-sm underline font-bold">Stake pool tokens Ⓜ️ 🛡️ 🍀 🎲 🟠</div>
                </TableCell>
                {tokens.map(token => (
                  <TableCell key={token.symbol} className="text-white"></TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-white text-left" colSpan={2}>End stake gas unit cost</TableCell>
                {tokens.map(token => (
                  <TableCell key={token.symbol} className="text-white">
                    {token.endStakeGasUnitCost.toLocaleString()}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-white text-left" colSpan={2}>End stake gas cost in PLS</TableCell>
                {tokens.map(token => {
                  const data = calculateGasData(token);
                  return (
                    <TableCell key={token.symbol} className="text-white">
                      {data?.endStakeGasCostInPLS.toFixed(1)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow className="border-b-4 border-[#333]">
                <TableCell className="text-white text-left" colSpan={2}>End stake gas cost in $</TableCell>
                {tokens.map(token => {
                  const data = calculateGasData(token);
                  return (
                    <TableCell key={token.symbol} className="text-white">
                      ${data?.endStakeGasCostInUSD.toFixed(3)}
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Solo-stake Section */}
              <TableRow>
                <TableCell className="text-left" colSpan={2}>
                  <div className="text-white text-sm underline font-bold">Solo-stake ⬣</div>
                </TableCell>
                {tokens.map(token => (
                  <TableCell key={token.symbol} className="text-white"></TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-white text-left" colSpan={2}>End stake gas unit cost</TableCell>
                {tokens.map(token => {
                  const data = calculateGasData(token);
                  return (
                    <TableCell key={token.symbol} className="text-white">
                      {data?.soloStakeGasUnitCost.toLocaleString()}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="text-white text-left" colSpan={2}>End stake gas cost in PLS</TableCell>
                {tokens.map(token => {
                  const data = calculateGasData(token);
                  return (
                    <TableCell key={token.symbol} className="text-white">
                      {data?.soloStakeGasCostInPLS.toFixed(0)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow className="border-b-4 border-[#333]">
                <TableCell className="text-white text-left" colSpan={2}>End stake gas cost in $</TableCell>
                {tokens.map(token => {
                  const data = calculateGasData(token);
                  return (
                    <TableCell key={token.symbol} className="text-white">
                      ${data?.soloStakeGasCostInUSD.toFixed(2)}
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Savings Section */}
              <TableRow>
                <TableCell className="text-left" colSpan={2}>
                  <div className="text-white text-sm underline font-bold">Savings with pooling</div>
                </TableCell>
                {tokens.map(token => (
                  <TableCell key={token.symbol} className="text-white"></TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-white text-left" colSpan={2}>Δ in $ saved with stake pooling</TableCell>
                {tokens.map(token => {
                  const data = calculateGasData(token);
                  return (
                    <TableCell key={token.symbol} className="text-white">
                      ${data?.savingsInUSD.toFixed(2)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="text-white text-left" colSpan={2}>% gas saved with stake pooling</TableCell>
                {tokens.map(token => {
                  const data = calculateGasData(token);
                  return (
                    <TableCell key={token.symbol} className="text-white">
                      {data?.savingsPercentage.toFixed(2)}%
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default GasTable; 