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

const GasTableYearlySummaryPLS: React.FC = () => {
  const { plsGasPrice, isLoading: gasLoading, error: gasError } = useGasPrice();
  const { priceData: plsPrice, isLoading: plsPriceLoading } = useCryptoPrice("PLS");

  const plsTokenPrice = plsPrice?.price || 0;
  const endStakeGasUnitCost = 70980; // Same as in GasTable

  const calculateGasCosts = (years: number) => {
    if (!plsGasPrice) return null;

    const days = years * 365;
    const gasUnits = 53694 + (2310 * days);

    // PLS calculations for solo staking
    const gasUnitPriceInBeats = plsGasPrice;
    const soloStakeGasCostInPLS = (gasUnits / 1000000000) * gasUnitPriceInBeats;
    const soloStakeCost = soloStakeGasCostInPLS * plsTokenPrice;

    // Pooled stake calculations (using endStakeGasUnitCost)
    const endStakeGasCostInPLS = (endStakeGasUnitCost / 1000000000) * gasUnitPriceInBeats;
    const pooledStakeCost = endStakeGasCostInPLS * plsTokenPrice;

    // Savings calculation
    const savingsPercent = ((soloStakeCost - pooledStakeCost) / soloStakeCost) * 100;

    return {
      soloStakeCost,
      pooledStakeCost,
      savingsPercent
    };
  };

  if (gasLoading || plsPriceLoading) {
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
                      ${costs?.soloStakeCost.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      ${costs?.pooledStakeCost.toFixed(3)}
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

export default GasTableYearlySummaryPLS; 