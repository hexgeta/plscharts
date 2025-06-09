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
  // Handle different token prefixes:
  // - Remove 'e' prefix for Ethereum tokens (eDECI -> DECI, eHEX -> HEX)
  // - Remove 'w' prefix for wrapped tokens (wBTC -> BTC, wETH -> ETH) but NOT 'we' tokens
  // - Keep 'we' tokens exactly as they are (weDECI stays weDECI)
  // - Keep other prefixes like 'p' for PulseChain tokens (pBAT stays pBAT)
  let baseSymbol = symbol
  if (symbol.startsWith('we')) {
    // Keep 'we' tokens exactly as they are
    baseSymbol = symbol
  } else if (symbol.startsWith('e')) {
    // Remove 'e' prefix for Ethereum tokens
    baseSymbol = symbol.slice(1)
  } else if (symbol.startsWith('w')) {
    // Remove 'w' prefix for other wrapped tokens
    baseSymbol = symbol.slice(1)
  }
  
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