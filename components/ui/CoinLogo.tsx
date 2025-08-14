import { cn } from '@/lib/utils'
import { CircleDollarSign } from 'lucide-react'
import { useState, useRef, useCallback, useEffect } from 'react'
import { cleanTickerForLogo } from '@/utils/ticker-display'

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
  // Use centralized ticker cleaning logic to ensure consistency across the app
  const baseSymbol = cleanTickerForLogo(symbol)
  
  // Determine the best format to try (check cache first, then default to svg)
  const preferredFormat = formatCache.get(baseSymbol) || 'svg'
  
  // State for tracking current format and errors
  const [currentFormat, setCurrentFormat] = useState(preferredFormat)
  const [useUppercase, setUseUppercase] = useState(false)
  
  // Build the logo path with current format
  const effectiveSymbol = useUppercase ? baseSymbol.toUpperCase() : baseSymbol
  let logoPath = baseSymbol === 'ETH' && variant === 'no-bg'
    ? '/coin-logos/eth-black-no-bg.svg'
    : `/coin-logos/${effectiveSymbol}.${currentFormat}`
  
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
    
    // If both svg and png failed with the original case, try uppercase
    if (!useUppercase && baseSymbol !== baseSymbol.toUpperCase()) {
      const upperCaseSymbol = baseSymbol.toUpperCase()
      const upperSvgPath = `/coin-logos/${upperCaseSymbol}.svg`
      const upperPngPath = `/coin-logos/${upperCaseSymbol}.png`
      
      if (!failedLogos.has(upperSvgPath)) {
        // Try uppercase svg
        setUseUppercase(true)
        setCurrentFormat('svg')
        setHasError(false)
        return
      } else if (!failedLogos.has(upperPngPath)) {
        // Try uppercase png
        setUseUppercase(true)
        setCurrentFormat('png')
        setHasError(false)
        return
      }
    }
    
    // If all attempts failed, give up
    failedLogos.add(logoPath)
    missingLogosCache.add(symbol) // Also cache by symbol
    setHasError(true)
  }, [logoPath, symbol, currentFormat, baseSymbol, useUppercase])
  
  const handleLoad = useCallback(() => {
    // Cache the working format for future use
    const cacheKey = useUppercase ? baseSymbol.toUpperCase() : baseSymbol
    formatCache.set(cacheKey, currentFormat)
  }, [baseSymbol, currentFormat, useUppercase])
  
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
        inverted ? 'brightness-0 invert' : '',
        className
      )}
      loading={priority ? 'eager' : 'lazy'}
      onError={handleError}
      onLoad={handleLoad}
    />
  )
} 