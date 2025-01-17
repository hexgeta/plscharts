"use client"

import React from 'react';
import { useGasPrice } from '@/hooks/useGasPrice';
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

const GasTableComparison: React.FC = () => {
  const { ethGasPrice, plsGasPrice, isLoading: gasLoading, error: gasError } = useGasPrice();
  const { priceData: ethPrice, isLoading: ethPriceLoading } = useCryptoPrice("WETH");
  const { priceData: plsPrice, isLoading: plsPriceLoading } = useCryptoPrice("PLS");

  const ethTokenPrice = ethPrice?.price || 0;
  const plsTokenPrice = plsPrice?.price || 0;

  const calculateGasCosts = (years: number) => {
    if (!ethGasPrice || !plsGasPrice) return null;

    const days = years * 365;
    const gasUnits = 53694 + (2310 * days);

    // ETH calculations
    const gasUnitPriceInGwei = ethGasPrice;
    const gasUnitPriceInETH = gasUnitPriceInGwei * 1e-9; // Convert Gwei to ETH
    const ethCost = gasUnits * gasUnitPriceInETH;
    const ethCostUSD = ethCost * ethTokenPrice;

    // PLS calculations
    const plsCost = (gasUnits / 1000000000) * plsGasPrice;
    const plsCostUSD = plsCost * plsTokenPrice;

    // Savings calculation
    const savingsPercent = ((ethCostUSD - plsCostUSD) / ethCostUSD) * 100;

    return {
      ethCostUSD,
      plsCostUSD,
      savingsPercent
    };
  };

  if (gasLoading || ethPriceLoading || plsPriceLoading) {
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
      <div className="rounded-lg overflow-x-auto border border-[#333]  max-w-[650px]">
        <div className="min-w-[200px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Stake Length (yrs)</TableHead>
                <TableHead className="text-center">Ethereum </TableHead>
                <TableHead className="text-center">PulseChain</TableHead>
                <TableHead className="text-center">% Saving</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map(year => {
                const costs = calculateGasCosts(year);
                return (
                  <TableRow key={year}>
                    <TableCell className="text-white text-center whitespace-nowrap">
                      {year}
                    </TableCell>
                    <TableCell className="text-white text-center">
                      ${costs?.ethCostUSD.toFixed(0)}
                    </TableCell>
                    <TableCell className="text-white text-center">
                      ${costs?.plsCostUSD.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-white text-center">
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

export default GasTableComparison; 