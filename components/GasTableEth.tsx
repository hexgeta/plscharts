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
  { name: 'MAXI', symbol: 'eMAXI', emoji: 'Ⓜ️', daysStaked: TOKEN_CONSTANTS.eMAXI.TOTAL_STAKED_DAYS, endStakeGasUnitCost: 70980 },
  { name: 'DECI', symbol: 'eDECI', emoji: '🛡️', daysStaked: TOKEN_CONSTANTS.eDECI.TOTAL_STAKED_DAYS, endStakeGasUnitCost: 70980 },
  { name: 'LUCKY', symbol: 'eLUCKY', emoji: '🍀', daysStaked: TOKEN_CONSTANTS.eLUCKY.TOTAL_STAKED_DAYS, endStakeGasUnitCost: 70980 },
  { name: 'TRIO', symbol: 'eTRIO', emoji: '🎲', daysStaked: TOKEN_CONSTANTS.eTRIO.TOTAL_STAKED_DAYS, endStakeGasUnitCost: 70980 },
  { name: 'BASE', symbol: 'eBASE', emoji: '🟠', daysStaked: TOKEN_CONSTANTS.eBASE.TOTAL_STAKED_DAYS, endStakeGasUnitCost: 70980 },
];

const GasTableEth: React.FC = () => {
  const { ethGasPrice, isLoading: gasLoading, error: gasError } = useGasPrice();
  const { priceData: ethPrice, isLoading: priceLoading } = useCryptoPrice("WETH");
  const ethTokenPrice = ethPrice?.price || 0;

  const calculateGasData = (token: TokenData) => {
    if (!ethGasPrice) return null;

    const gasUnitPriceInGwei = ethGasPrice;
    const gasUnitPriceInETH = gasUnitPriceInGwei * 1e-9; // Convert Gwei to ETH
    
    // Stake pool calculations
    const endStakeGasCostInETH = token.endStakeGasUnitCost * gasUnitPriceInETH;
    const endStakeGasCostInUSD = endStakeGasCostInETH * ethTokenPrice;

    // Solo-stake calculations
    const soloStakeGasUnitCost = 53694 + (2310 * (token.daysStaked));
    const soloStakeGasCostInETH = soloStakeGasUnitCost * gasUnitPriceInETH;
    const soloStakeGasCostInUSD = soloStakeGasCostInETH * ethTokenPrice;

    // Savings calculations
    const savingsInUSD = soloStakeGasCostInUSD - endStakeGasCostInUSD;
    const savingsPercentage = ((soloStakeGasCostInUSD - endStakeGasCostInUSD) / soloStakeGasCostInUSD) * 100;

    return {
      gasUnitPriceInGwei,
      endStakeGasCostInETH,
      endStakeGasCostInUSD,
      soloStakeGasUnitCost,
      soloStakeGasCostInETH,
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
                <TableCell className="text-white text-left" colSpan={2}>Gas unit price in gwei</TableCell>
                {tokens.map(token => {
                  const data = calculateGasData(token);
                  return (
                    <TableCell key={token.symbol} className="text-white">
                      {data?.gasUnitPriceInGwei.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow className="border-b-4 border-[#333]">
                <TableCell className="text-white text-left" colSpan={2}>ETH token price $</TableCell>
                {tokens.map(token => (
                  <TableCell key={token.symbol} className="text-white">
                    ${ethTokenPrice.toFixed(2)}
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
                <TableCell className="text-white text-left" colSpan={2}>End stake gas cost in ETH</TableCell>
                {tokens.map(token => {
                  const data = calculateGasData(token);
                  return (
                    <TableCell key={token.symbol} className="text-white">
                      {data?.endStakeGasCostInETH.toFixed(4)}
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
                      ${data?.endStakeGasCostInUSD.toFixed(2)}
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
                <TableCell className="text-white text-left" colSpan={2}>End stake gas cost in ETH</TableCell>
                {tokens.map(token => {
                  const data = calculateGasData(token);
                  return (
                    <TableCell key={token.symbol} className="text-white">
                      {data?.soloStakeGasCostInETH.toFixed(4)}
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

export default GasTableEth; 