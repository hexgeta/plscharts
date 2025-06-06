import { cn } from '@/lib/utils'

const LOGO_SIZES = {
  sm: 'w-4 h-4',   // 16px
  md: 'w-6 h-6',   // 24px
  lg: 'w-8 h-8',   // 32px
  xl: 'w-10 h-10', // 40px
} as const

interface CoinLogoProps {
  symbol: string
  size?: keyof typeof LOGO_SIZES
  className?: string
  priority?: boolean
  inverted?: boolean
  variant?: 'default' | 'no-bg'
}

export function CoinLogo({ 
  symbol, 
  size = 'md', 
  className,
  priority = false,
  inverted = false,
  variant = 'default'
}: CoinLogoProps) {
  // Remove 'w' prefix for wrapped tokens (wBTC -> BTC, wETH -> ETH)
  // Keep other prefixes like 'p' for PulseChain tokens (pBAT stays pBAT)
  const baseSymbol = symbol.startsWith('w') ? symbol.slice(1) : symbol
  
  // Special case for ETH with no background
  let logoPath = baseSymbol === 'ETH' && variant === 'no-bg'
    ? '/coin-logos/eth-black-no-bg.svg'
    : `/coin-logos/${baseSymbol}.svg`
  
  // Special case for HDRN to use white version only when inverted
  if (baseSymbol === 'HDRN' && inverted) {
    logoPath = '/coin-logos/HDRN-white.svg'
  }
  
  return (
    <img
      src={logoPath}
      alt={`${symbol} logo`}
      draggable="false"
      className={cn(
        LOGO_SIZES[size],
        'object-contain',
        '',
        inverted ? 'brightness-0 invert' : '',
        className
      )}
      loading={priority ? 'eager' : 'lazy'}
      onError={(e) => {
        // Fallback to default logo if the image fails to load
        e.currentTarget.src = '/coin-logos/default.svg'
      }}
    />
  )
} 