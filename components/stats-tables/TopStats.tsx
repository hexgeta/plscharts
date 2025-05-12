import { TOKEN_LOGOS, TOKEN_CONSTANTS } from '@/constants/crypto';
import { useCryptoPrice } from '@/hooks/crypto/useCryptoPrice';
import { useBackingValue } from '@/hooks/crypto/useBackingValue';
import { useGasPrice } from '@/hooks/useGasPrice';
import { formatNumber, formatPrice } from '@/utils/format';
import { Skeleton } from '@/components/ui/skeleton2';
import Image from 'next/image';
import { useState } from 'react';

const TOKENS = [
  'MAXI',
  'DECI',
  'LUCKY',
  'TRIO',
  'BASE'
];

function getPriceChangeColor(change: number | null): string {
  if (change === null) return 'text-zinc-500';
  if (Math.abs(change) < 0.01) return 'text-zinc-500';
  return change >= 0 ? 'text-[#01FF55]' : 'text-red-500';
}

export function TopStats() {
  const [isEthereum, setIsEthereum] = useState(false);
  
  // Load HEX prices
  const { priceData: pHexPrice } = useCryptoPrice('pHEX');
  const { priceData: eHexPrice } = useCryptoPrice('eHEX');
  const hexPrice = isEthereum ? eHexPrice : pHexPrice;

  // Load gas prices
  const { plsGasPrice, ethGasPrice } = useGasPrice();
  const gasPrice = isEthereum ? ethGasPrice : plsGasPrice;

  return (
    <div className="w-full max-w-[95vw] mx-auto rounded-xl p-4 bg-black/5 backdrop-blur-sm border-2 border-white/10 h-auto relative">
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <table className="w-full min-w-[1400px]">
          <thead>
            <tr className="text-gray-400 text-normal border-b border-white/5">
              <th className="pb-3 font-normal text-center whitespace-nowrap px-4">Token</th>
              <th className="pb-3 font-normal text-center whitespace-nowrap px-4">Progress</th>
              <th className="pb-3 font-normal text-center whitespace-nowrap px-4">Price [$]</th>
              <th className="pb-3 font-normal text-center whitespace-nowrap px-4">Price [HEX]</th>
              <th className="pb-3 font-normal text-center whitespace-nowrap px-4">Backing</th>
              <th className="pb-3 font-normal text-center whitespace-nowrap px-4">Discount</th>
              <th className="pb-3 font-normal text-center whitespace-nowrap px-4">Cost/T-Share</th>
              <th className="pb-3 font-normal text-center whitespace-nowrap px-4">Principal</th>
              <th className="pb-3 font-normal text-center whitespace-nowrap px-4">Length</th>
              <th className="pb-3 font-normal text-center whitespace-nowrap px-4">T-Shares</th>
              <th className="pb-3 font-normal text-center whitespace-nowrap px-4">Gas Saving</th>
              <th className="pb-3 w-[50px] text-center relative">
                <button
                  onClick={() => setIsEthereum(!isEthereum)}
                  className="top-0 mb-16 flex items-center justify-center w-8 h-6 bg-black/20 hover:bg-black/30 transition-colors absolute right-2 pt-0 mt-0"
                >
                  <Image
                    src={isEthereum ? '/coin-logos/eth-black-no-bg.svg' : '/coin-logos/PLS.svg'}
                    alt={isEthereum ? 'Ethereum' : 'PulseChain'}
                    width={20}
                    height={20}
                    className="brightness-0 invert"
                  />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {TOKENS.map((baseToken) => {
              const token = isEthereum ? 'e' + baseToken : 'p' + baseToken;
              const { priceData, isLoading: priceLoading } = useCryptoPrice(token);
              const { backingData, isLoading: backingLoading } = useBackingValue(token);
              
              // For BASE token, use BASE3 data for calculations
              const tokenData = baseToken === 'BASE' 
                ? TOKEN_CONSTANTS[`${isEthereum ? 'e' : 'p'}BASE3`] 
                : TOKEN_CONSTANTS[token];
              
              if (!tokenData) return null;

              if (priceLoading || backingLoading) {
                return (
                  <tr key={token} className="border-t border-white/5">
                    <td className="py-3 text-center">
                      <div className="flex justify-center">
                        <Image
                          src={TOKEN_LOGOS[baseToken]}
                          alt={baseToken}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      </div>
                    </td>
                    {[...Array(10)].map((_, i) => (
                      <td key={i} className="py-3 text-center">
                        <div className="flex justify-center">
                          <Skeleton className="h-6 w-20" />
                        </div>
                      </td>
                    ))}
                    <td className="py-3 text-center">
                      <div className="flex justify-center">
                        <Skeleton className="h-6 w-6" />
                      </div>
                    </td>
                  </tr>
                );
              }

              const daysLength = tokenData.TOTAL_STAKED_DAYS ?? 0;
              const principal = (tokenData.STAKE_PRINCIPLE ?? 0) / 1_000_000;
              const priceInHex = hexPrice?.price && priceData?.price 
                ? priceData.price / hexPrice.price 
                : 0;

              // Calculate additional stats
              const startDate = tokenData.STAKE_START_DATE;
              const currentDate = new Date();
              const daysSinceStart = startDate ? Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
              const progress = daysLength > 0 ? Math.min((daysSinceStart / daysLength), 100) : 0;

              // Calculate gas savings
              const soloStakeGasUnitCost = 53694 + (2310 * daysLength);
              const endStakeGasUnitCost = 70980;
              const savingsPercentage = (-(soloStakeGasUnitCost - endStakeGasUnitCost) / soloStakeGasUnitCost);

              // Calculate cost per T-Share in USD
              const supply = tokenData.TOKEN_SUPPLY ?? 0;
              const tShares = tokenData.TSHARES ?? 0;
              const tokenPrice = priceData?.price ?? 0;
              const costPerTShare = tShares > 0 ? (supply * tokenPrice) / tShares : 0;

              return (
                <tr key={token} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 text-center">
                    <div className="flex justify-center">
                      <Image
                        src={TOKEN_LOGOS[baseToken]}
                        alt={baseToken}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    {formatNumber(progress, { decimals: 1, percentage: true })}
                  </td>
                  <td className="py-3 text-center">
                    {priceLoading ? (
                      <div className="flex justify-center">
                        <Skeleton className="h-6 w-20" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        {(!priceData?.price || priceData.price === 0) ? "N/A" : formatPrice(priceData.price)}
                      </div>
                    )}
                  </td>
                  <td className="py-3 text-center">
                    {priceLoading || !hexPrice ? (
                      <div className="flex justify-center">
                        <Skeleton className="h-6 w-20" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        {(!priceData?.price || !hexPrice.price || priceInHex === 0) ? "N/A" : (
                          <>
                            {formatNumber(priceInHex, { decimals: 2 })}
                            <Image src={TOKEN_LOGOS.HEX} alt="HEX" width={16} height={16} className="brightness-0 invert mb-[2px]" />
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 text-center">
                    {backingLoading ? (
                      <div className="flex justify-center">
                        <Skeleton className="h-6 w-20" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        {!backingData || backingData.backingStakeRatio === null || backingData.backingStakeRatio === 0 ? "N/A" : (
                          <>
                            {formatNumber(backingData.backingStakeRatio, { decimals: 2 })}
                            <Image src={TOKEN_LOGOS.HEX} alt="HEX" width={16} height={16} className="brightness-0 invert mb-[2px]" />
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 text-center">
                    {backingLoading ? (
                      <div className="flex justify-center">
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ) : (
                      <span className={backingData?.backingDiscount ? (backingData.backingDiscount < 0 ? 'text-red-500' : 'text-[#01FF55]') : ''}>
                        {!backingData || backingData.backingDiscount === null ? "N/A" : formatNumber(backingData.backingDiscount, { decimals: 0, percentage: true })}
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {!tokenPrice || costPerTShare === 0 ? "N/A" : `$${formatNumber(costPerTShare, { decimals: 1 })}`}
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {formatNumber(principal, { decimals: 0 })}M
                      <Image src={TOKEN_LOGOS.HEX} alt="HEX" width={16} height={16} className="brightness-0 invert mb-[2px]" />
                    </div>
                  </td>
                  <td className="py-3 text-center">{daysLength} D</td>
                  <td className="py-3 text-center">{formatNumber(tokenData.TSHARES || 0, { decimals: 1 })}</td>
                  <td className="py-3 text-center">
                    {formatNumber(savingsPercentage, { decimals: 0, percentage: true })}
                  </td>
                  <td className="py-3 text-center">
                    <a 
                      href={`https://dexscreener.com/${tokenData.PAIR.chain}/${tokenData.PAIR.pairAddress}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-2xl hover:opacity-80 transition-opacity inline-block"
                    >
                      →
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}