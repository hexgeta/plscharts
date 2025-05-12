import { TOKEN_CONSTANTS, TOKEN_LOGOS } from '@/constants/crypto';
import { useCryptoPrice } from '@/hooks/crypto/useCryptoPrice';
import { useBackingValue } from '@/hooks/crypto/useBackingValue';
import { formatNumber, formatPrice } from '@/utils/format';
import { Skeleton } from '@/components/ui/skeleton2';
import Image from 'next/image';
import { useState } from 'react';

const PULSE_TOKENS = ['pMAXI', 'pDECI', 'pLUCKY', 'pTRIO', 'pBASE'];
const ETH_TOKENS = ['eMAXI', 'eDECI', 'eLUCKY', 'eTRIO', 'eBASE'];

export function LoginTable() {
  const [isEthereum, setIsEthereum] = useState(false);
  
  // Load data for both networks simultaneously
  const pulseDataMap = Object.fromEntries(
    PULSE_TOKENS.map(token => [token, useCryptoPrice(token)])
  );
  const ethDataMap = Object.fromEntries(
    ETH_TOKENS.map(token => [token, useCryptoPrice(token)])
  );
  
  const pulseBackingMap = Object.fromEntries(
    PULSE_TOKENS.map(token => [token, useBackingValue(token)])
  );
  const ethBackingMap = Object.fromEntries(
    ETH_TOKENS.map(token => [token, useBackingValue(token)])
  );

  // Load both HEX prices
  const { priceData: pHexPrice } = useCryptoPrice('pHEX');
  const { priceData: eHexPrice } = useCryptoPrice('eHEX');

  // Use the appropriate data based on selected network
  const priceDataMap = isEthereum ? ethDataMap : pulseDataMap;
  const backingDataMap = isEthereum ? ethBackingMap : pulseBackingMap;
  const hexPrice = isEthereum ? eHexPrice : pHexPrice;
  const tokens = isEthereum ? ETH_TOKENS : PULSE_TOKENS;

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
              {tokens.map((token) => {
                const tokenData = TOKEN_CONSTANTS[token];
                const { priceData, isLoading: priceLoading } = priceDataMap[token];
                const { backingData, isLoading: backingLoading } = backingDataMap[token];
                
                if (!tokenData) return null;

                const daysLength = tokenData.TOTAL_STAKED_DAYS;
                const principal = (tokenData.STAKE_PRINCIPLE ?? 0) / 1_000_000;

                const priceInHex = hexPrice?.price && priceData?.price 
                  ? priceData.price / hexPrice.price 
                  : 0;

                const getDexscreenerUrl = () => {
                  const chain = tokenData.PAIR.chain === 'pulsechain' ? 'pulsechain' : 'ethereum';
                  return `https://dexscreener.com/${chain}/${tokenData.PAIR.pairAddress}`;
                };

                return (
                  <tr key={token} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 text-center">
                      <div className="flex justify-center">
                        <Image
                          src={TOKEN_LOGOS[token.replace('p', '').replace('e', '')]}
                          alt={token}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      </div>
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
                          {!backingData || backingData.backingStakeRatio === null ? "N/A" : (
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
                        {formatNumber(principal, { decimals: 0 })}M
                        <Image src={TOKEN_LOGOS.HEX} alt="HEX" width={16} height={16} className="brightness-0 invert mb-[2px]" />
                      </div>
                    </td>
                    <td className="py-3 text-center">{daysLength} D</td>
                    <td className="py-3 text-center">{formatNumber(tokenData.TSHARES || 0, { decimals: 1 })}</td>
                    <td className="py-3 text-center">
                      <a 
                        href={getDexscreenerUrl()} 
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
    </div>
  );
}

export function GoTable() {
  return <LoginTable />;
} 