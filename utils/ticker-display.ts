/**
 * Utility functions for handling ticker display and logo symbol cleaning
 * These rules ensure consistent logo selection across the entire app
 */

/**
 * Clean ticker symbols for logo lookup
 * This applies the same rules used in Portfolio.tsx settings
 */
export function cleanTickerForLogo(symbol: string): string {
  if (!symbol) return 'PLS'
  
  let cleanedSymbol = symbol.trim()
  
  // Remove V3 position ID (e.g., "HEX / WPLS 0.25% #143462" -> "HEX / WPLS 0.25%")
  cleanedSymbol = cleanedSymbol.replace(/\s+#\d+$/, '').trim()
  
  // Remove percentage fees from LP tokens (e.g., "CST 1%" -> "CST", "WPLS 0.25%" -> "WPLS")
  cleanedSymbol = cleanedSymbol.replace(/\s+\d+(\.\d+)?%$/, '').trim()
  
  // Remove farm suffix "(f)" for logo lookup - farms use same logo as their LP counterpart
  if (cleanedSymbol.endsWith(' (f)')) {
    cleanedSymbol = cleanedSymbol.replace(' (f)', '').trim()
  }
  
  // Handle pump.tires tokens: "DAI (from pump.tires)" -> "DAI"
  if (cleanedSymbol.includes('(from pump.tires)')) {
    cleanedSymbol = cleanedSymbol.replace(' (from pump.tires)', '').trim()
  }
  
  // Handle version indicators and descriptive suffixes:
  // "HEX (v1)" -> "HEX", "WPLS (Alt)" -> "WPLS", "PLS (Liquid Loans)" -> "PLS"
  cleanedSymbol = cleanedSymbol.replace(/\s*\((v1|v2|Alt|Liquid Loans)\)$/i, '').trim()
  
  // Handle PHIAT/PHAME deposit tokens
  if (cleanedSymbol.includes('(PHIAT deposit)') || cleanedSymbol.includes('(PHAME deposit)')) {
    // Extract the base token name from patterns like:
    // "WETH from ETH (PHIAT deposit)" -> "weWETH"  
    // "weWETH (PHIAT deposit)" -> "weWETH"
    // "HEX (PHIAT deposit)" -> "HEX" (native PulseChain tokens stay as-is)
    // "PLS (PHAME deposit)" -> "PLS" (native PulseChain tokens stay as-is)
    
    if (cleanedSymbol.startsWith('we')) {
      // Already has 'we' prefix, extract before deposit info
      cleanedSymbol = cleanedSymbol.split(' ')[0] // "weWETH (PHIAT deposit)" -> "weWETH"
    } else {
      // Extract base token 
      let baseToken = cleanedSymbol
      if (cleanedSymbol.includes(' from ')) {
        // "WETH from ETH (PHIAT deposit)" -> "WETH", then becomes "weWETH"
        baseToken = cleanedSymbol.split(' from ')[0]
        // Clean up common suffixes
        baseToken = baseToken.replace(' Coin', '').trim()
        cleanedSymbol = `we${baseToken}`
      } else {
        // "HEX (PHIAT deposit)" -> "HEX", "PLS (PHAME deposit)" -> "PLS"
        // Native PulseChain tokens don't get 'we' prefix
        baseToken = cleanedSymbol.split(' (')[0]
        cleanedSymbol = baseToken.trim()
      }
    }
  }
  // Handle pump.tires tokens in format "TRX from pump.tires"
  else if (cleanedSymbol.includes('from pump.tires')) {
    // Extract the root ticker from patterns like:
    // "TRX from pump.tires" -> "TRX"
    // "USDC from pump.tires" -> "USDC"
    // "USDT from pump.tires" -> "USDT"
    cleanedSymbol = cleanedSymbol.split(' from pump.tires')[0].trim()
  }
  // Handle other prefix removal rules
  else if (cleanedSymbol.startsWith('st')) {
    // Remove 'st' prefix for staked tokens and handle compound names
    // stPHIAT -> PHIAT
    // stEARN EARN -> EARN 
    // stFLEX FLEX -> FLEX
    // stPLS LL -> PLS
    const withoutSt = cleanedSymbol.slice(2)
    
    // For compound names like "stEARN EARN", extract the base token
    if (withoutSt.includes(' ')) {
      const parts = withoutSt.split(' ')
      // Use the first part as the base token (EARN from "EARN EARN")
      cleanedSymbol = parts[0]
    } else {
      cleanedSymbol = withoutSt
    }
  } else if (cleanedSymbol.startsWith('we')) {
    // Keep 'we' tokens exactly as they are
    // weDAI, weUSDC, etc.
  } else if (cleanedSymbol.startsWith('w') && cleanedSymbol.length > 1 && cleanedSymbol[1] === cleanedSymbol[1].toLowerCase()) {
    // Remove lowercase 'w' prefix for wrapped tokens like wSOL, wBNB, etc.
    // wSOL -> SOL, wBNB -> BNB
    cleanedSymbol = cleanedSymbol.slice(1)
  } else if (cleanedSymbol.startsWith('e')) {
    // Special cases: keep specific tokens as-is to use their specific logos
    if (cleanedSymbol === 'eMaximus Perps Maxi' || cleanedSymbol === 'eHEX' || cleanedSymbol === 'weHEX') {
      // Keep as-is - don't remove the 'e'/'we' prefix for tokens that have specific logos
    } else {
      // Remove 'e' prefix for other Ethereum tokens
      // eDECI -> DECI, but not eHEX -> HEX
      cleanedSymbol = cleanedSymbol.slice(1)
    }
  } else if (cleanedSymbol.startsWith('w')) {
    // Remove 'w' prefix for other wrapped tokens (but not 'we' tokens or lowercase 'w' tokens)
    // wBTC -> BTC, wETH -> ETH
    cleanedSymbol = cleanedSymbol.slice(1)
  }
  
  return cleanedSymbol
}

/**
 * Get display ticker (for showing to users)
 * This can be different from the logo ticker
 */
export function getDisplayTicker(ticker: string): string {
  if (!ticker) return ''
  
  let displayTicker = ticker.trim()
  
  // Remove farm suffix "(f)" for display - farms are already labeled with "Farm" badge
  if (displayTicker.endsWith(' (f)')) {
    displayTicker = displayTicker.replace(' (f)', '')
  }
  
  // Handle LP token pairs that contain "/" - convert "we" prefix to "e" in token names
  if (displayTicker.includes(' / ')) {
    const parts = displayTicker.split(' / ')
    const convertedParts = parts.map(part => {
      const trimmedPart = part.trim()
      if (trimmedPart.startsWith('we') && trimmedPart.length > 2) {
        return 'e' + trimmedPart.slice(2)
      }
      return trimmedPart
    })
    displayTicker = convertedParts.join(' / ')
  }
  // Convert "we" prefix to "e" for display purposes for single tokens
  // weLINK -> eLINK, weUSDC -> eUSDC, etc.
  else if (displayTicker.startsWith('we') && displayTicker.length > 2) {
    displayTicker = 'e' + displayTicker.slice(2)
  }
  
  return displayTicker
}