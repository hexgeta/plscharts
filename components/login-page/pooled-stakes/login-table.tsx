import { TOKEN_CONSTANTS, TOKEN_LOGOS } from '@/constants/crypto';
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices';
import { useBackingValue } from '@/hooks/crypto/useBackingValue';
import { formatNumber, formatPrice } from '@/utils/format';
import { Skeleton } from '@/components/ui/skeleton2';
import { useState } from 'react';
import { CoinLogo } from '@/components/ui/CoinLogo';
import Link from 'next/link';
import { useDexscreenerUrl } from '@/hooks/useDexscreenerUrl';

const PULSE_TOKENS = ['pMAXI', 'pDECI', 'pLUCKY', 'pTRIO', 'pBASE'];
const ETH_TOKENS = ['eMAXI', 'eDECI', 'eLUCKY', 'eTRIO', 'eBASE'];
const ALL_TOKENS = [...PULSE_TOKENS, 'pHEX', ...ETH_TOKENS, 'eHEX'];

export function LoginTable() {
  const [isEthereum, setIsEthereum] = useState(false);
  
  // Load all token prices in a single request
  const { prices, isLoading } = useTokenPrices(ALL_TOKENS);
  
  const pulseBackingMap = Object.fromEntries(
    PULSE_TOKENS.map(token => [token, useBackingValue(token)])
  );
  const ethBackingMap = Object.fromEntries(
    ETH_TOKENS.map(token => [token, useBackingValue(token)])
  );

  // Use the appropriate data based on selected network
  const tokens = isEthereum ? ETH_TOKENS : PULSE_TOKENS;
  const backingDataMap = isEthereum ? ethBackingMap : pulseBackingMap;
  const hexPrice = isEthereum ? prices?.eHEX : prices?.pHEX;

  return (
    <div className="w-full max-w-6xl mx-auto rounded-xl p-4 bg-black/5 backdrop-blur-sm border-2 border-white/10 h-auto relative">
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-normal border-b border-white/5">
                <th className="pb-3 font-normal text-center">Token</th>
                <th className="pb-3 font-normal text-center">Price ($)</th>
                <th className="pb-3 font-normal text-center">Price (HEX)</th>
                <th className="pb-3 font-normal text-center">Backing</th>
                <th className="pb-3 font-normal text-center">Premium</th>
                <th className="pb-3 font-normal text-center">Principal</th>
                <th className="pb-3 font-normal text-center">Length</th>
                <th className="pb-3 font-normal text-center">T-Shares</th>
                <th className="pb-3 w-[50px] text-center relative">
                  <button
                    onClick={() => setIsEthereum(!isEthereum)}
                    className="top-0 mb-16 flex items-center justify-center w-8 h-6 bg-black/20 hover:bg-black/30 transition-colors absolute right-2 pt-0 mt-0"
                  >
                    <CoinLogo
                      symbol={isEthereum ? 'ETH' : 'PLS'}
                      size="sm"
                      className="brightness-0 invert rounded-none"
                      variant={isEthereum ? 'no-bg' : 'default'}
                    />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token) => {
                const tokenData = TOKEN_CONSTANTS[token];
                const tokenPriceData = prices?.[token];
                const { backingData, isLoading: backingLoading } = backingDataMap[token];
                const dexscreenerUrl = useDexscreenerUrl(token);
                
                if (!tokenData) return null;

                const daysLength = tokenData.TOTAL_STAKED_DAYS;
                const principal = (tokenData.STAKE_PRINCIPLE ?? 0) / 1_000_000;

                const priceInHex = hexPrice?.price && tokenPriceData?.price 
                  ? tokenPriceData.price / hexPrice.price 
                  : 0;

                return (
                  <tr key={token} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 text-center">
                      <div className="flex justify-center">
                        <CoinLogo
                          symbol={token.replace('p', '').replace('e', '')}
                          size="lg"
                        />
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      {isLoading ? (
                        <div className="flex justify-center">
                          <Skeleton className="h-6 w-20" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          {(!tokenPriceData?.price || tokenPriceData.price === 0) ? "N/A" : formatPrice(tokenPriceData.price)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {isLoading || !hexPrice ? (
                        <div className="flex justify-center">
                          <Skeleton className="h-6 w-20" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          {(!tokenPriceData?.price || !hexPrice.price || priceInHex === 0) ? "N/A" : (
                            <>
                              {formatNumber(priceInHex, { decimals: 2 })}
                              <CoinLogo
                                symbol="HEX"
                                size="sm"
                                inverted={true}
                                className="mb-[2px]"
                              />
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
                          {!backingData || backingData.backingStakeRatio === null ? "N/A" : (
                            <>
                              {formatNumber(backingData.backingStakeRatio, { decimals: 2 })}
                              <CoinLogo
                                symbol="HEX"
                                size="sm"
                                inverted={true}
                                className="mb-[2px]"
                              />
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
                        {formatNumber(principal, { decimals: 0 })}M
                        <CoinLogo
                          symbol="HEX"
                          size="sm"
                          inverted={true}
                          className="mb-[2px]"
                        />
                      </div>
                    </td>
                    <td className="py-3 text-center">{daysLength} D</td>
                    <td className="py-3 text-center">{formatNumber(tokenData.TSHARES || 0, { decimals: 1 })}</td>
                    <td className="py-3 text-center">
                      {dexscreenerUrl && (
                        <Link
                          href={dexscreenerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/60 hover:text-white transition-colors duration-100 ease-in-out flex items-center justify-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chart-line" aria-hidden="true">
                            <path d="M3 3v16a2 2 0 0 0 2 2h16"></path>
                            <path d="m19 9-5 5-4-4-3 3"></path>
                          </svg>
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function GoTable() {
  return <LoginTable />;
} 