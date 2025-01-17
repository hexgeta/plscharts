import Image from 'next/image'
import { Card } from "@/components/ui/card"
import { TokenData } from '@/types/crypto'
import { TOKEN_LOGOS } from '@/constants/crypto'
import { useCryptoPrice } from '@/hooks/crypto/useCryptoPrice'
import { useCryptoRatio } from '@/hooks/crypto/useCryptoRatio'
import { useBackingValue } from '@/hooks/crypto/useBackingValue'
import { formatNumber, formatPrice, formatHexRatio, formatBacking } from '@/utils/format'
import { Skeleton } from '@/components/ui/skeleton2'

interface CryptoCardProps {
  data: TokenData
  variant?: 'default' | 'wide'
}

function convertSymbol(symbol: string): string {
  const [base, chain] = symbol.split('-')
  if (!chain) return symbol // If no chain specified, return as is
  
  const prefix = chain === 'PLS' ? 'p' : 'e'
  return `${prefix}${base}`
}

function getPriceChangeColor(change: number): string {
  if (Math.abs(change * 100) < 1) return 'text-zinc-500'
  return change >= 0 ? 'text-[#01FF55]' : 'text-red-500'
}

export function CryptoCard({ data, variant = 'default' }: CryptoCardProps) {
  const { priceData, isLoading: priceLoading } = useCryptoPrice(data.symbol)
  const { ratioData, isLoading: ratioLoading } = useCryptoRatio(data.symbol)
  const { backingData, isLoading: backingLoading } = useBackingValue(data.symbol)
  
  const baseSymbol = data.symbol.slice(1)
  const showBacking = baseSymbol !== 'HEX'

  // Check if each piece of data is ready
  const hasPriceData = !priceLoading && priceData
  const hasRatioData = !ratioLoading && ratioData
  const hasBackingData = !backingLoading && backingData

  if (variant === 'wide') {
    return (
      <Card className="bg-black/20 backdrop-blur-sm text-white p-4 rounded-xl h-[100px] md:h-auto border-2 border-white/10">
        <div className="flex items-center">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {TOKEN_LOGOS[baseSymbol] && (
                <Image
                  src={TOKEN_LOGOS[baseSymbol]}
                  alt={`${baseSymbol} logo`}
                  width={24}
                  height={24}
                  className={baseSymbol === 'HEX' ? '' : 'rounded-full'}
                />
              )}
              <div className="text-xl font-bold">{data.symbol}</div>
            </div>
            <div className="flex items-baseline gap-2">
              {!hasPriceData ? (
                <div className="skeleton h-8 w-24 rounded" />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">
                    {priceData.price === 0 ? "N/A" : formatPrice(priceData.price)}
                  </div>
                  <div className={`text-xs font-bold ${getPriceChangeColor(priceData.priceChange24h)}`}>
                    {priceData.price === 0 ? "" : formatNumber(priceData.priceChange24h, { decimals: 1, percentage: true })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-black/20 backdrop-blur-sm text-white p-4 rounded-xl border-2 border-white/10">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {TOKEN_LOGOS[baseSymbol] && (
            <Image
              src={TOKEN_LOGOS[baseSymbol]}
              alt={`${baseSymbol} logo`}
              width={24}
              height={24}
              className={baseSymbol === 'HEX' ? '' : 'rounded-full'}
            />
          )}
          <div className="text-xl font-bold">{data.symbol}</div>
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          {!hasPriceData ? (
            <Skeleton className="text-2xl font-bold">$0.0271</Skeleton>
          ) : (
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {priceData.price === 0 ? "N/A" : formatPrice(priceData.price)}
              </div>
              <div className={`text-xs font-bold ${getPriceChangeColor(priceData.priceChange24h)}`}>
                {priceData.price === 0 ? "" : formatNumber(priceData.priceChange24h, { decimals: 1, percentage: true })}
              </div>
            </div>
          )}
        </div>
        <div className="text-sm text-zinc-500">
          {!hasRatioData || ratioLoading ? (
            <Skeleton>1.18 HEX</Skeleton>
          ) : (
            ratioData.hexRatio === 0 ? "N/A HEX" : formatHexRatio(ratioData.hexRatio) + " HEX"
          )}
        </div>
        {showBacking && (
          <>
            <hr className="border-zinc-800 my-2" />
            {!hasBackingData || backingLoading ? (
              <div className="space-y-2 text-sm text-zinc-500">
                <Skeleton>Stake backing: 1.92</Skeleton>
                <Skeleton>Backing discount: -38.46%</Skeleton>
              </div>
            ) : (
              <>
                <div className="text-sm text-zinc-500">
                  Stake backing: {formatNumber(backingData.backingStakeRatio, { decimals: 2 })}
                </div>
                <div className="text-sm text-zinc-500">
                  Backing discount: {backingData.backingDiscount === null ? "N/A" : formatNumber(backingData.backingDiscount, { decimals: 2, percentage: true })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

