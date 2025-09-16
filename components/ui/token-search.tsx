'use client'

import { useState, useEffect, useMemo } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { TOKEN_CONSTANTS } from '@/constants/crypto'
import { MORE_COINS } from '@/constants/more-coins'
import { CoinLogo } from '@/components/ui/CoinLogo'
import { getDisplayTicker } from '@/utils/ticker-display'
import { useRouter } from 'next/navigation'
import { Icons } from '@/components/ui/icons'

interface TokenSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TokenSearch({ open, onOpenChange }: TokenSearchProps) {
  // Universal search component that supports both:
  // 1. Token search - find and navigate to token charts
  // 2. Wallet search - enter any Ethereum address to view portfolio in detective mode
  const [search, setSearch] = useState('')
  const router = useRouter()


  // Combine all available tokens from both constants files
  const ALL_TOKENS = useMemo(() => [...TOKEN_CONSTANTS, ...MORE_COINS], [])
  
  
  // Debug: Check if specific tokens are in the array
  const extractorToken = ALL_TOKENS.find(token => token.ticker === 'Extractor')
  const stmToken = ALL_TOKENS.find(token => token.ticker === 'STM')
  
  // Debug: Check for the specific contract addresses
  const contractSearch1 = ALL_TOKENS.find(token => token.a && token.a.toLowerCase() === '0xb6a3af5d5198e19abf5eaba0fa074c881fdc970a')
  const contractSearch2 = ALL_TOKENS.find(token => token.a && token.a.toLowerCase() === '0x62bd78d40a9fcb4d29f6ff183cfbcaf2f5ca9b52')
  
  // Test exact matching logic
  if (stmToken) {
    const testSearch = '0x62bd78d40A9FCb4D29F6fF183CFbcaf2f5ca9B52'.toLowerCase()
    const tokenContract = stmToken.a ? stmToken.a.toLowerCase() : ''
  }

  // Validate Ethereum address format
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/i.test(address)
  }

  // Check if search looks like it could be an address (starts with 0x and has some hex chars)
  const looksLikeAddress = (search: string): boolean => {
    return /^0x[a-fA-F0-9]{6,}$/i.test(search)
  }

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
    
    let tokens = ALL_TOKENS.filter(token => {
      if (!search) return true
      const searchLower = search.toLowerCase()
      const tickerLower = token.ticker.toLowerCase()
      const nameLower = token.name.toLowerCase()
      const contractLower = token.a ? token.a.toLowerCase() : ''
      
      // Standard matching - check if ticker, name, or contract address contains search term
      const tickerMatch = tickerLower.includes(searchLower)
      const nameMatch = nameLower.includes(searchLower)
      const contractMatch = contractLower.includes(searchLower)
      
      const result = tickerMatch || nameMatch || contractMatch
      
      // Debug specific searches
      if (search.toLowerCase() === 'hex' || search.toLowerCase() === 'pls' || search.toLowerCase().includes('0xb6a3af5d') || search.toLowerCase().includes('0x62bd78d')) {
        console.log(`Token: ${token.ticker}, ticker: "${tickerLower}", name: "${nameLower}", contract: "${contractLower}", search: "${searchLower}", tickerMatch: ${tickerMatch}, nameMatch: ${nameMatch}, contractMatch: ${contractMatch}, result: ${result}`)
      }
      
      return result
    })
    
    console.log('Filtered tokens count:', tokens.length)
    console.log('First 10 filtered tokens:', tokens.slice(0, 10).map(t => t.ticker))
    
    // Debug contract address searches specifically
    if (search.toLowerCase().includes('0x62bd78d') || search.toLowerCase().includes('0xb6a3af5d')) {
      console.log('=== CONTRACT ADDRESS SEARCH DEBUG ===')
      console.log('Search term:', search)
      console.log('looksLikeAddress(search):', looksLikeAddress(search))
      console.log('isValidAddress(search):', isValidAddress(search))
      console.log('filteredTokens.length:', tokens.length)
      console.log('filteredTokens:', tokens.map(t => ({ ticker: t.ticker, contract: t.a })))
    }

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
        
        // Prioritize exact contract address matches above all else
        const aContractExact = a.a && a.a.toLowerCase() === searchLower
        const bContractExact = b.a && b.a.toLowerCase() === searchLower
        if (aContractExact && !bContractExact) return -1
        if (bContractExact && !aContractExact) return 1
        
        const aTickerExact = a.ticker.toLowerCase() === searchLower
        const bTickerExact = b.ticker.toLowerCase() === searchLower
        if (aTickerExact && !bTickerExact) return -1
        if (bTickerExact && !aTickerExact) return 1
        
        // Then contract address matches, then ticker matches, then name matches
        const aContractMatch = a.a && a.a.toLowerCase().includes(searchLower)
        const bContractMatch = b.a && b.a.toLowerCase().includes(searchLower)
        const aTickerMatch = a.ticker.toLowerCase().includes(searchLower)
        const bTickerMatch = b.ticker.toLowerCase().includes(searchLower)
        
        if (aContractMatch && !bContractMatch) return -1
        if (bContractMatch && !aContractMatch) return 1
        if (aTickerMatch && !bTickerMatch) return -1
        if (bTickerMatch && !aTickerMatch) return 1
        
        // Finally alphabetical
        return a.ticker.localeCompare(b.ticker)
      }
    })

    console.log('Final sorted tokens:', tokens.slice(0, 10).map(t => t.ticker))

    return tokens.slice(0, 50) // Limit to 50 results for performance
  })()

  const handleTokenSelect = (token: typeof ALL_TOKENS[0]) => {
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

  const handleAddressSelect = (address: string) => {
    // Close the dialog
    handleOpenChange(false)
    setSearch('')
    
    // Navigate to the clean URL format (Next.js rewrites will handle routing to /address/[address])
    router.push(`/${address}`)
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
            placeholder="Search tokens, contract addresses, or wallet addresses..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="scrollbar-hide">
            <CommandEmpty>
              {looksLikeAddress(search) && !isValidAddress(search) 
                ? "Invalid address format. Please enter a valid Ethereum address (0x + 40 hex characters)."
                : "No tokens found."
              }
            </CommandEmpty>
            
            {/* Address Search Results */}
            {looksLikeAddress(search) && (
              <CommandGroup heading="Wallet Address">
                <CommandItem
                  value={search}
                  onSelect={() => isValidAddress(search) && handleAddressSelect(search)}
                  className={`flex items-center gap-3 cursor-pointer ${
                    !isValidAddress(search) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={!isValidAddress(search)}
                >
                  <div className="w-8 h-8 flex items-center justify-center">
                    <Icons.users className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium">
                      {isValidAddress(search) ? 'View Wallet' : 'Invalid Address'}
                    </span>
                    <span className="text-sm text-muted-foreground font-mono">
                      {isValidAddress(search) ? `0x...${search.slice(-4)}` : search}
                    </span>
                  </div>
                  {isValidAddress(search) && (
                    <div className="ml-auto">
                      <span className="text-xs text-muted-foreground">
                        Detective Mode
                      </span>
                    </div>
                  )}
                </CommandItem>
              </CommandGroup>
            )}

            {/* Token Search Results */}
            {(() => {
              console.log('About to render tokens. filteredTokens.length:', filteredTokens.length)
              console.log('looksLikeAddress(search):', looksLikeAddress(search))
              return filteredTokens.length > 0
            })() && (
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
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
} 