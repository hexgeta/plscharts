/**
 * Standardizes ticker display names across the site
 * Rules:
 * - If ticker has 'e' prefix, remove it (eHEX → HEX)  
 * - If ticker has 'we' prefix, change it to 'e' (weHEX → eHEX)
 * - All other tickers remain unchanged
 */
export function getDisplayTicker(ticker: string): string {
  if (ticker.startsWith('we')) {
    // weHEX → eHEX, weDECI → eDECI
    return 'e' + ticker.slice(2)
  } else if (ticker.startsWith('e')) {
    // eHEX → HEX, eDECI → DECI
    return ticker.slice(1)
  }
  // All other tickers remain unchanged (PLS, PLSX, HEX, etc.)
  return ticker
} 