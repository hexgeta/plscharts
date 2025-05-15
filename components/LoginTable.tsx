import { TOKEN_CONSTANTS, TOKEN_LOGOS } from '@/constants/crypto';
import { useCryptoPrice } from '@/hooks/crypto/useCryptoPrice';
import { useBackingValue } from '@/hooks/crypto/useBackingValue';
import { formatNumber, formatPrice } from '@/utils/format';
import { Skeleton } from '@/components/ui/skeleton2';
import { CoinLogo } from '@/components/ui/CoinLogo';

const TOKENS = ['pMAXI', 'pDECI', 'pLUCKY', 'pTRIO', 'pBASE'];

export function LoginTable() {
  // Move all hooks to the top level
  const priceDataMap = Object.fromEntries(
    TOKENS.map(token => [token, useCryptoPrice(token)])
  );
  const backingDataMap = Object.fromEntries(
    TOKENS.map(token => [token, useBackingValue(token)])
  );
  const { priceData: hexPrice } = useCryptoPrice('pHEX');

  return (
    <div className="w-full max-w-6xl mx-auto rounded-3xl p-4 bg-black/5 backdrop-blur-sm border-2 border-white/10 h-auto">
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
                <th className="pb-3 w-[50px] text-center"></th>
              </tr>
            </thead>
            <tbody>
              {TOKENS.map((token) => {
                const tokenData = TOKEN_CONSTANTS[token];
                const { priceData, isLoading: priceLoading } = priceDataMap[token];
                const { backingData, isLoading: backingLoading } = backingDataMap[token];
                
                if (!tokenData) return null;

                const daysLength = tokenData.TOTAL_STAKED_DAYS;
                const principal = (tokenData.STAKE_PRINCIPLE ?? 0) / 1_000_000;

                // Calculate price in HEX terms
                const priceInHex = hexPrice?.price && priceData?.price 
                  ? priceData.price / hexPrice.price 
                  : 0;

                // Get dexscreener URL based on token data
                const getDexscreenerUrl = () => {
                  if (!tokenData.PAIR) return '#';
                  const chain = tokenData.PAIR.chain === 'pulsechain' ? 'pulsechain' : 'ethereum';
                  return `https://dexscreener.com/${chain}/${tokenData.PAIR.pairAddress}`;
                };

                return (
                  <tr key={token} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 text-center">
                      <div className="flex justify-center">
                        <CoinLogo
                          symbol={token}
                          size="lg"
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
                          {formatPrice(priceData?.price || 0)}
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
                          {formatNumber(priceInHex, { decimals: 2 })}
                          <CoinLogo
                            symbol="HEX"
                            size="sm"
                            className="brightness-0 invert mb-[2px]"
                          />
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
                          {formatNumber(backingData?.backingStakeRatio || 0, { decimals: 2 })}
                          <CoinLogo
                            symbol="HEX"
                            size="sm"
                            className="brightness-0 invert mb-[2px]"
                          />
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {backingLoading ? (
                        <div className="flex justify-center">
                          <Skeleton className="h-6 w-16" />
                        </div>
                      ) : (
                        <span className={backingData?.backingDiscount && backingData.backingDiscount < 0 ? 'text-red-500' : 'text-[#01FF55]'}>
                          {backingData?.backingDiscount === null ? "N/A" : formatNumber(backingData?.backingDiscount || 0, { decimals: 0, percentage: true })}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {formatNumber(principal, { decimals: 0 })}M
                        <CoinLogo
                          symbol="HEX"
                          size="sm"
                          className="brightness-0 invert mb-[2px]"
                        />
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