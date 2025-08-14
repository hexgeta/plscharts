import { cn } from '@/lib/utils'
import { CircleDollarSign } from 'lucide-react'
import { useState, useRef, useCallback, useEffect } from 'react'

// Cache to remember which symbols don't have logos to prevent flashing
const missingLogosCache = new Set<string>()

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

// Create a global cache to remember which logos have failed to load
const failedLogos = new Set<string>()
// Cache to remember which format works for each symbol (svg or png)
const formatCache = new Map<string, 'svg' | 'png'>()

export function CoinLogo({ 
  symbol, 
  size = 'md', 
  className,
  priority = false,
  inverted = false,
  variant = 'default'
}: CoinLogoProps) {
  // Handle different token prefixes and special deposit cases:
  // - Remove 'e' prefix for Ethereum tokens (eDECI -> DECI, eHEX -> HEX)
  // - Remove 'w' prefix for wrapped tokens (wBTC -> BTC, wETH -> ETH) but NOT 'we' tokens
  // - Keep 'we' tokens exactly as they are (weDECI stays weDECI)
  // - Keep other prefixes like 'p' for PulseChain tokens (pBAT stays pBAT)
  // - Handle deposit tokens from PHIAT/PHAME to use 'we' prefixed logos
  // - Handle pump.tires tokens to use root ticker (TRX from pump.tires -> TRX)
  let baseSymbol = symbol
  
  // Handle pump.tires tokens - extract root ticker before "from pump.tires"
  if (symbol.includes('from pump.tires')) {
    // Extract the root ticker from patterns like:
    // "TRX from pump.tires" -> "TRX"
    // "USDC from pump.tires" -> "USDC"
    // "USDT from pump.tires" -> "USDT"
    baseSymbol = symbol.split(' from pump.tires')[0].trim()
  }
  // Handle deposit tokens - extract base token and use 'we' prefix
  if (symbol.includes('(PHIAT deposit)') || symbol.includes('(PHAME deposit)')) {
    // Extract the base token name from patterns like:
    // "WETH from ETH (PHIAT deposit)" -> "weWETH"
    // "WBTC Coin from ETH (PHIAT deposit)" -> "weWBTC" 
    // "weWETH (PHIAT deposit)" -> "weWETH"
    // "PLS (PHAME deposit)" -> "wePLS"
    
    if (symbol.startsWith('we')) {
      // Already has 'we' prefix, extract before deposit info
      baseSymbol = symbol.split(' ')[0] // "weWETH (PHIAT deposit)" -> "weWETH"
    } else {
      // Extract base token and add 'we' prefix
      let baseToken = symbol
      if (symbol.includes(' from ')) {
        // "WETH from ETH (PHIAT deposit)" -> "WETH"
        baseToken = symbol.split(' from ')[0]
      } else {
        // "PLS (PHAME deposit)" -> "PLS"
        baseToken = symbol.split(' (')[0]
      }
      
      // Clean up common suffixes
      baseToken = baseToken.replace(' Coin', '').trim()
      
      baseSymbol = `we${baseToken}`
    }
  } else if (symbol.startsWith('we')) {
    // Keep 'we' tokens exactly as they are
    baseSymbol = symbol
  } else if (symbol.startsWith('e')) {
    // Remove 'e' prefix for Ethereum tokens
    baseSymbol = symbol.slice(1)
  } else if (symbol.startsWith('w')) {
    // Remove 'w' prefix for other wrapped tokens
    baseSymbol = symbol.slice(1)
  }
  
  // Determine the best format to try (check cache first, then default to svg)
  const preferredFormat = formatCache.get(baseSymbol) || 'svg'
  
  // State for tracking current format and errors
  const [currentFormat, setCurrentFormat] = useState(preferredFormat)
  
  // Build the logo path with current format
  let logoPath = baseSymbol === 'ETH' && variant === 'no-bg'
    ? '/coin-logos/eth-black-no-bg.svg'
    : `/coin-logos/${baseSymbol}.${currentFormat}`
  
  // Special case for HDRN to use white version only when inverted
  if (baseSymbol === 'HDRN' && inverted) {
    logoPath = '/coin-logos/HDRN-white.svg'
  }
  
  const [hasError, setHasError] = useState(() => failedLogos.has(logoPath))
  
  const handleError = useCallback(() => {
    // If svg failed, try png next
    if (currentFormat === 'svg') {
      const pngPath = `/coin-logos/${baseSymbol}.png`
      if (!failedLogos.has(pngPath)) {
        setCurrentFormat('png')
        setHasError(false)
        return
      }
    }
    // If png also failed or we were already trying png, give up
    failedLogos.add(logoPath)
    missingLogosCache.add(symbol) // Also cache by symbol
    setHasError(true)
  }, [logoPath, symbol, currentFormat, baseSymbol])
  
  const handleLoad = useCallback(() => {
    // Cache the working format for future use
    formatCache.set(baseSymbol, currentFormat)
  }, [baseSymbol, currentFormat])
  
  // If this symbol is known to not have a logo, don't even try loading
  const shouldSkipImage = missingLogosCache.has(symbol) || failedLogos.has(logoPath)
  
  // If image failed to load or is known missing, show the fallback icon immediately
  if (shouldSkipImage || hasError) {
    return (
      <CircleDollarSign 
        className={cn(
          LOGO_SIZES[size],
          'text-white',
          className
        )}
      />
    )
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
      onError={handleError}
      onLoad={handleLoad}
    />
  )
} 