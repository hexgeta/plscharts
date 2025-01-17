"use client"

import React from 'react';
import { useGasPrice } from '@/hooks/useGasPrice';
import { Skeleton } from "@/components/ui/skeleton2";
import { useCryptoPrice } from "@/hooks/crypto/useCryptoPrice";
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const GasTableYearlySummary: React.FC = () => {
  const { ethGasPrice, isLoading: gasLoading, error: gasError } = useGasPrice();
  const { priceData: ethPrice, isLoading: ethPriceLoading } = useCryptoPrice("WETH");

  const ethTokenPrice = ethPrice?.price || 0;
  const endStakeGasUnitCost = 70980; // Same as in GasTableEth

  const calculateGasCosts = (years: number) => {
    if (!ethGasPrice) return null;

    const days = years * 365;
    const gasUnits = 53694 + (2310 * days);

    // ETH calculations for solo staking
    const gasUnitPriceInGwei = ethGasPrice;
    const gasUnitPriceInETH = gasUnitPriceInGwei * 1e-9; // Convert Gwei to ETH
    const ethCost = gasUnits * gasUnitPriceInETH;
    const soloStakeCost = ethCost * ethTokenPrice;

    // Pooled stake calculations (using endStakeGasUnitCost)
    const endStakeGasCostInETH = endStakeGasUnitCost * gasUnitPriceInETH;
    const pooledStakeCost = endStakeGasCostInETH * ethTokenPrice;

    // Savings calculation
    const savingsPercent = ((soloStakeCost - pooledStakeCost) / soloStakeCost) * 100;

    return {
      soloStakeCost,
      pooledStakeCost,
      savingsPercent
    };
  };

  if (gasLoading || ethPriceLoading) {
    return (
      <div className="w-full py-6 px-4">
        <Skeleton variant="table" />
      </div>
    );
  }

  if (gasError) {
    return <div className="text-center text-red-500 p-4">Error: {gasError}</div>;
  }

  const years = Array.from({ length: 15 }, (_, i) => i + 1);

  return (
    <div className="w-full py-6 px-4">
      <div className="rounded-lg overflow-x-auto border border-[#333] max-w-[650px]">
        <div className="min-w-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stake Length (yrs)</TableHead>
                <TableHead>Solo-stake •</TableHead>
                <TableHead>
                  <span className="flex items-center justify-center gap-1">
                    <span className="text-blue-500">Ⓜ️</span>
                    <span className="text-orange-500">🛡️</span>
                    <span className="text-green-500">🍀</span>
                    <span className="text-gray-400">🎲</span>
                    <span className="text-yellow-500">🟠</span>
                  </span>
                </TableHead>
                <TableHead>% Saving</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map(year => {
                const costs = calculateGasCosts(year);
                return (
                  <TableRow key={year}>
                    <TableCell>
                      {year}
                    </TableCell>
                    <TableCell>
                      ${costs?.soloStakeCost.toFixed(0)}
                    </TableCell>
                    <TableCell>
                      ${costs?.pooledStakeCost.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {costs?.savingsPercent.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default GasTableYearlySummary; 