'use client'

import { useState, useEffect } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { TOKEN_CONSTANTS } from '@/constants/crypto'
import { CoinLogo } from '@/components/ui/CoinLogo'
import { getDisplayTicker } from '@/utils/ticker-display'
import { useRouter } from 'next/navigation'

interface TokenSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TokenSearch({ open, onOpenChange }: TokenSearchProps) {
  const [search, setSearch] = useState('')
  const router = useRouter()

  console.log('TokenSearch render - open:', open);

  // Priority tokens to show at the top when no search query
  const PRIORITY_TOKENS = ['PLS', 'PLSX', 'HEX', 'INC', 'eHEX', 'weHEX', 'HDRN', 'eHDRN', 'ICSA', 'eICSA']
  
  // Official tokens for specific searches (prioritize these over tokens that just contain the search term)
  const OFFICIAL_TOKENS_MAP: Record<string, string[]> = {
    'hex': ['HEX', 'eHEX', 'weHEX'],
    'pls': ['PLS', 'PLSX', 'WPLS', 'pWPLS', 'vPLS', 'uPLS', 'stPLS'],
    'hdrn': ['HDRN', 'eHDRN'],
    'inc': ['INC'],
    // Add more as needed
  }

  // Filter and sort tokens based on search query
  const filteredTokens = (() => {
    console.log('=== DEBUGGING TOKEN SEARCH ===')
    console.log('Search term:', search)
    
    let tokens = TOKEN_CONSTANTS.filter(token => {
      if (!search) return true
      const searchLower = search.toLowerCase()
      const tickerLower = token.ticker.toLowerCase()
      const nameLower = token.name.toLowerCase()
      
      // Standard matching - check if ticker or name contains search term anywhere
      const tickerMatch = tickerLower.includes(searchLower)
      const nameMatch = nameLower.includes(searchLower)
      
      const result = tickerMatch || nameMatch
      
      // Debug specific searches
      if (search.toLowerCase() === 'hex' || search.toLowerCase() === 'pls') {
        console.log(`Token: ${token.ticker}, ticker: "${tickerLower}", search: "${searchLower}", tickerMatch: ${tickerMatch}, nameMatch: ${nameMatch}, result: ${result}`)
      }
      
      return result
    })
    
    console.log('Filtered tokens count:', tokens.length)
    console.log('First 10 filtered tokens:', tokens.slice(0, 10).map(t => t.ticker))

    // Sort tokens based on priority and relevance
    tokens.sort((a, b) => {
      if (!search) {
        // No search query - show priority tokens first
        const aPriority = PRIORITY_TOKENS.indexOf(a.ticker)
        const bPriority = PRIORITY_TOKENS.indexOf(b.ticker)
        
        if (aPriority !== -1 && bPriority !== -1) {
          return aPriority - bPriority
        }
        if (aPriority !== -1) return -1
        if (bPriority !== -1) return 1
        return a.ticker.localeCompare(b.ticker)
      } else {
        // Has search query - find the correct official tokens
        const searchLower = search.toLowerCase()
        
        // Find the official tokens for this exact search term
        const officialTokens = OFFICIAL_TOKENS_MAP[searchLower] || []
        
        console.log(`Searching for: "${searchLower}", official tokens:`, officialTokens)
        
        const aIsOfficial = officialTokens.includes(a.ticker)
        const bIsOfficial = officialTokens.includes(b.ticker)
        
        console.log(`Comparing ${a.ticker} (official: ${aIsOfficial}) vs ${b.ticker} (official: ${bIsOfficial})`)
        
        // Official tokens first (in their specified order)
        if (aIsOfficial && bIsOfficial) {
          const aIndex = officialTokens.indexOf(a.ticker)
          const bIndex = officialTokens.indexOf(b.ticker)
          console.log(`Both official: ${a.ticker} index ${aIndex}, ${b.ticker} index ${bIndex}`)
          return aIndex - bIndex
        }
        if (aIsOfficial) {
          console.log(`${a.ticker} is official, ${b.ticker} is not - a wins`)
          return -1
        }
        if (bIsOfficial) {
          console.log(`${b.ticker} is official, ${a.ticker} is not - b wins`)
          return 1
        }
        
        // Then exact matches
        const aExact = a.ticker.toLowerCase() === searchLower
        const bExact = b.ticker.toLowerCase() === searchLower
        if (aExact && !bExact) return -1
        if (bExact && !aExact) return 1
        
        // Then ticker matches vs name matches
        const aTickerMatch = a.ticker.toLowerCase().includes(searchLower)
        const bTickerMatch = b.ticker.toLowerCase().includes(searchLower)
        if (aTickerMatch && !bTickerMatch) return -1
        if (bTickerMatch && !aTickerMatch) return 1
        
        // Finally alphabetical
        return a.ticker.localeCompare(b.ticker)
      }
    })

    console.log('Final sorted tokens:', tokens.slice(0, 10).map(t => t.ticker))

    return tokens.slice(0, 50) // Limit to 50 results for performance
  })()

  const handleTokenSelect = (token: typeof TOKEN_CONSTANTS[0]) => {
    // Close the dialog
    handleOpenChange(false)
    setSearch('')
    
    // Navigate to a token page or handle selection
    // For now, let's try to navigate to a potential token page
    // You can customize this based on your routing structure
    if (token.dexs && token.dexs !== "0x0" && token.dexs !== null) {
      const chainName = token.chain === 1 ? 'ethereum' : 'pulsechain'
      const dexAddress = Array.isArray(token.dexs) ? token.dexs[0] : token.dexs
      window.location.href = `https://dexscreener.com/${chainName}/${dexAddress}`
    }
  }

  // Clear search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  // Wrap onOpenChange to add debugging
  const handleOpenChange = (newOpen: boolean) => {
    console.log('TokenSearch onOpenChange called with:', newOpen);
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden p-0 max-w-[360px] sm:max-w-[480px] rounded-xl">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <CommandInput 
            placeholder="Search tokens..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="scrollbar-hide">
            <CommandEmpty>No tokens found.</CommandEmpty>
            <CommandGroup heading="Tokens">
              {filteredTokens.map((token) => (
                <CommandItem
                  key={`${token.chain}-${token.a}-${token.ticker}`}
                  value={`${token.ticker} ${token.name}`}
                  onSelect={() => handleTokenSelect(token)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <CoinLogo 
                    symbol={token.ticker === 'eHEX' ? 'eHEX' : token.ticker}
                    size="sm"
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{getDisplayTicker(token.ticker)}</span>
                    <span className="text-sm text-muted-foreground">{token.name}</span>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xs text-muted-foreground">
                      {token.chain === 1 ? 'ETH' : 'PLS'}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
} 