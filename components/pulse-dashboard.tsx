import { Card } from './ui/card'
import Image from 'next/image'
import { useCryptoPrice } from '@/hooks/crypto/useCryptoPrice'
import { formatNumber, formatPrice } from '@/utils/format'

const TOKENS = [
  {
    symbol: 'PLS',
    name: 'Pulse',
    logo: '/coin-logos/maxi/PLS.svg',
  },
  {
    symbol: 'PLSX',
    name: 'PulseX',
    logo: '/coin-logos/maxi/PLSX.svg',
  },
  {
    symbol: 'INC',
    name: 'Incentive',
    logo: '/coin-logos/maxi/INC.svg',
  },
  {
    symbol: 'HEX',
    name: 'HEX on PulseChain',
    logo: '/coin-logos/maxi/HEX.svg',
  },
]

const TIMEFRAMES = [
  { label: '5m', disabled: true },
  { label: '1h', disabled: true },
  { label: '6h', disabled: true },
  { label: '24h', disabled: false },
  { label: '7d', disabled: true },
  { label: '30d', disabled: true },
  { label: '90d', disabled: true },
  { label: 'ATL', disabled: true },
]

function getPriceChangeColor(change: number): string {
  if (Math.abs(change * 100) < 1) return 'text-zinc-500'
  return change >= 0 ? 'text-[#01FF55]' : 'text-red-500'
}

function TokenCard({ symbol, name, logo }: { symbol: string; name: string; logo: string }) {
  const { priceData, isLoading } = useCryptoPrice(symbol)

  return (
    <Card className="bg-black/20 backdrop-blur-sm text-white p-4 rounded-xl border-2 border-white/10 flex flex-col gap-2 min-w-[260px]">
      <div className="flex items-center gap-2 mb-2">
        <Image src={logo} alt={`${symbol} logo`} width={28} height={28} />
        <div className="text-xl font-bold">{symbol}</div>
        <span className="text-zinc-400 text-xs">{name}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold">
          {isLoading || !priceData ? <span className="opacity-50">$0.0000</span> : formatPrice(priceData.price)}
        </div>
        <div className={`text-xs font-bold ${getPriceChangeColor(priceData?.priceChange24h ?? 0)}`}>
          {isLoading || !priceData ? '' : formatNumber(priceData.priceChange24h, { decimals: 1, percentage: true, alreadyPercentage: true })}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 mt-2 text-sm">
        <div>
          <div className="text-zinc-500">Market Cap</div>
          <div className="font-semibold">{isLoading || !priceData ? '--' : `$${formatNumber(priceData.marketCap, { decimals: 1, compact: true })}`}</div>
        </div>
        <div>
          <div className="text-zinc-500">Supply</div>
          <div className="font-semibold">{isLoading || !priceData ? '--' : formatNumber(priceData.supply, { decimals: 1, compact: true })}</div>
        </div>
        <div>
          <div className="text-zinc-500">Volume</div>
          <div className="font-semibold">{isLoading || !priceData ? '--' : `$${formatNumber(priceData.volume24h, { decimals: 1, compact: true })}`}</div>
        </div>
      </div>
    </Card>
  )
}

export default function PulseDashboard() {
  return (
    <div className="bg-transparent p-0 min-h-screen flex flex-col items-center">
      <div className="max-w-7xl w-full mx-auto space-y-4 mb-0">
        {/* Timeframe Selector */}
        <div className="flex justify-end gap-2 mb-4">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.label}
              className={`px-3 py-1 rounded-full text-xs font-semibold border border-white/10 ${tf.disabled ? 'opacity-30 cursor-not-allowed' : 'bg-white/10 text-white'}`}
              disabled={tf.disabled || tf.label !== '24h'}
            >
              {tf.label}
            </button>
          ))}
        </div>
        {/* Main Token Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TOKENS.map(token => (
            <TokenCard key={token.symbol} {...token} />
          ))}
        </div>
      </div>
    </div>
  )
} 