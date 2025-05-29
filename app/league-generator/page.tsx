'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import LeagueTable from '../../components/LeagueTable'
import { motion } from 'framer-motion'
import { useCustomTokenData } from '../../hooks/crypto/useCustomTokenData'

interface LeagueGeneratorFormData {
  contractAddress: string
  chain: 'ethereum' | 'pulsechain'
  supplyDeduction: number
  logoFile: File | null
}

function LeagueGeneratorContent() {
  const searchParams = useSearchParams()
  
  const [formData, setFormData] = useState<LeagueGeneratorFormData>({
    contractAddress: '',
    chain: 'pulsechain',
    supplyDeduction: 0,
    logoFile: null
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Load data from URL parameters on mount
  useEffect(() => {
    console.log('useEffect running, searchParams:', searchParams)
    console.log('Current URL:', window.location.href)
    
    const chainParam = searchParams.get('c')
    const addressParam = searchParams.get('a')
    
    console.log('URL params:', { chainParam, addressParam }) // Debug log
    console.log('Address param length:', addressParam?.length)
    
    if (addressParam && addressParam.length > 0) {
      console.log('Setting form data with:', { addressParam, chainParam })
      const validChain = chainParam === 'ethereum' ? 'ethereum' : 'pulsechain'
      
      setFormData(prev => ({
        ...prev,
        contractAddress: addressParam,
        chain: validChain
      }))
      
      console.log('Opening dialog...')
      // Auto-open dialog if we have a valid contract address
      setIsDialogOpen(true)
    } else {
      console.log('No valid address param found')
    }
  }, [searchParams])

  const handleInputChange = (field: keyof LeagueGeneratorFormData, value: string | number | File) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.contractAddress) {
      alert('Please fill in Contract Address')
      return
    }

    // Open the dialog
    setIsDialogOpen(true)
  }

  return (
    <div className="bg-black text-white min-h-screen p-4 sm:p-6">
      <div className="max-w-lg mx-auto py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-center mb-8">League Generator</h1>
          <p className="text-gray-400 text-center mb-4">
            Generate league tables for any token on Ethereum or PulseChain
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-black border-2 border-white/10 rounded-2xl p-6">
              <div className="space-y-6">
                {/* Contract Address */}
                <div>
                  <label htmlFor="contractAddress" className="block text-sm font-medium text-gray-300 mb-2">
                    Token Contract Address
                  </label>
                  <input
                    type="text"
                    id="contractAddress"
                    value={formData.contractAddress}
                    onChange={(e) => handleInputChange('contractAddress', e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-gray-900 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/40 transition-colors"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The contract address of the token to analyze
                  </p>
                </div>

                {/* Chain Selection */}
                <div>
                  <label htmlFor="chain" className="block text-sm font-medium text-gray-300 mb-2">
                    Blockchain
                  </label>
                  <select
                    id="chain"
                    value={formData.chain}
                    onChange={(e) => handleInputChange('chain', e.target.value as 'ethereum' | 'pulsechain')}
                    className="w-full px-4 py-3 bg-gray-900 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40 transition-colors"
                  >
                    <option value="pulsechain">PulseChain</option>
                    <option value="ethereum">Ethereum</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select the blockchain where the token contract exists
                  </p>
                </div>

                {/* Supply Deduction */}
                <div>
                  <label htmlFor="supplyDeduction" className="block text-sm font-medium text-gray-300 mb-2">
                    Supply Deduction (optional)
                  </label>
                  <input
                    type="number"
                    id="supplyDeduction"
                    value={formData.supplyDeduction}
                    onChange={(e) => handleInputChange('supplyDeduction', parseFloat(e.target.value) || 0)}
                    onFocus={(e) => {
                      if (formData.supplyDeduction === 0) {
                        e.target.value = ''
                      }
                    }}
                    placeholder="0"
                    min="0"
                    step="any"
                    className="w-full px-4 py-3 bg-gray-900 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Amount to subtract from total supply (e.g., burned tokens, locked tokens)
                  </p>
                </div>

                {/* Logo File */}
                <div>
                  <label htmlFor="logoFile" className="block text-sm font-medium text-gray-300 mb-2">
                    Logo File (Optional)
                  </label>
                  <input
                    type="file"
                    id="logoFile"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0]
                        handleInputChange('logoFile', file)
                      }
                    }}
                    className="w-full px-4 py-3 bg-gray-900 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/40 transition-colors"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload a logo file for the token
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <button
                  type="submit"
                  className="w-full bg-white hover:bg-gray-100 text-black px-6 py-4 rounded-lg text-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  Generate League
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl w-full max-w-[400px] max-h-[90vh] bg-black border-2 border-white/10 rounded-lg overflow-y-auto">
                <div className="mt-4 pb-4">
                  {isDialogOpen && (
                    <CustomLeagueTable 
                      contractAddress={formData.contractAddress}
                      chain={formData.chain}
                      supplyDeduction={formData.supplyDeduction}
                      logoFile={formData.logoFile}
                    />
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </form>

          {/* Info Section */}
          <div className="mt-12 bg-gray-900/50 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">How it works</h3>
            <ul className="text-gray-400 space-y-2 text-sm">
              <li>• Enter any token contract address</li>
              <li>• Select the blockchain (Ethereum or PulseChain)</li>
              <li>• Optionally upload a custom logo image</li>
              <li>• Add supply deduction for burned or locked tokens</li>
              <li>• View league tables with real-time data from the blockchain</li>
            </ul>
          </div>

          {/* Example section */}
          
        </motion.div>
      </div>
    </div>
  )
}

// Custom LeagueTable component that uses blockchain data
function CustomLeagueTable({ 
  contractAddress, 
  chain, 
  supplyDeduction,
  logoFile
}: {
  contractAddress: string
  chain: 'ethereum' | 'pulsechain'
  supplyDeduction: number
  logoFile: File | null
}) {
  const { data, loading, error } = useCustomTokenData(contractAddress, chain)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center border-b border-white/10 pb-4">
        </div>
        <div className="text-center text-gray-400 py-8">
          Loading token data from blockchain...
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <div className="text-center border-b border-white/10 pb-4">
        </div>
        <div className="text-center text-red-400 py-8">
          <p>Error loading token data</p>
          <p className="text-sm text-gray-500 mt-2">{error || 'Failed to fetch token data'}</p>
        </div>
      </div>
    )
  }

  // Apply supply deduction
  const adjustedSupply = data.totalSupply && supplyDeduction ? data.totalSupply - supplyDeduction : data.totalSupply

  return (
    <div className="space-y-4">
      <CustomLeagueDisplay 
        tokenSymbol={data.symbol || 'TOKEN'}
        totalSupply={adjustedSupply}
        price={data.price}
        supplyDeduction={supplyDeduction}
        logoFile={logoFile}
      />
    </div>
  )
}

// Custom league display component that doesn't use the constants file
function CustomLeagueDisplay({
  tokenSymbol,
  totalSupply,
  price,
  supplyDeduction,
  logoFile
}: {
  tokenSymbol: string
  totalSupply: number | null
  price: number | null
  supplyDeduction: number
  logoFile: File | null
}) {
  // Sea creature ranks from highest to lowest (same as LeagueTable)
  const LEAGUE_RANKS = [
    { name: 'Poseidon', icon: '/poseidon.png', percentage: 10 },
    { name: 'Whale', icon: '/whale.png', percentage: 1 },
    { name: 'Shark', icon: '/shark.png', percentage: 0.1 },
    { name: 'Dolphin', icon: '/dolphin.png', percentage: 0.01 },
    { name: 'Squid', icon: '/squid.png', percentage: 0.001 },
    { name: 'Turtle', icon: '/turtle.png', percentage: 0.0001 },
    { name: 'Crab', icon: '/crab.png', percentage: 0.00001 },
    { name: 'Shrimp', icon: '/shrimp.png', percentage: 0.000001 },
    { name: 'Shell', icon: '/shell.png', percentage: 0.0000001 }
  ]

  // Create URL from uploaded logo file
  const logoUrl = logoFile ? URL.createObjectURL(logoFile) : null

  const formatCompactNumber = (num: number | null): string => {
    if (num === null || num === undefined || isNaN(num)) return '0'
    
    // Handle very large numbers first
    if (num >= 1000e12) {  // 1000T+ 
      const value = num / 1e15
      return Math.round(value) + 'Q'
    }
    if (num >= 1000e9) {   // 1000B+ = 1T+
      const value = num / 1e12
      return Math.round(value) + 'T'
    }
    if (num >= 1000e6) {   // 1000M+ = 1B+
      const value = num / 1e9
      return Math.round(value) + 'B'
    }
    if (num >= 1000e3) {   // 1000K+ = 1M+
      const value = num / 1e6
      return Math.round(value) + 'M'
    }
    if (num >= 1e3) {      // 1K+
      const value = num / 1e3
      return Math.round(value) + 'K'
    }
    if (num >= 1) {
      return Math.round(num).toString()
    }
    if (num >= 0.01) {
      return num.toFixed(2)
    }
    if (num >= 0.001) {
      return num.toFixed(3)
    }
    return num.toFixed(4)
  }

  const formatMarketCap = (num: number | null): string => {
    if (num === null || num === undefined || isNaN(num)) return '$0'
    
    if (num >= 1000) {
      // For large numbers, show raw value with no decimals (no sig fig rounding)
      return '$' + Math.round(num).toLocaleString('en-US', { maximumFractionDigits: 0 })
    }
    
    // Only apply 3 significant figures rounding to numbers < 1000
    const roundToSignificantFigures = (n: number, sig: number) => {
      if (n === 0) return 0
      const factor = Math.pow(10, sig - Math.floor(Math.log10(Math.abs(n))) - 1)
      return Math.round(n * factor) / factor
    }
    
    const rounded = roundToSignificantFigures(num, 3)
    
    if (rounded >= 100) {
      // For 100-999, no decimals needed (3 sig figs already)
      return '$' + Math.round(rounded).toString()
    }
    if (rounded >= 10) {
      // For 10-99, show 1 decimal for 3 sig figs
      return '$' + rounded.toFixed(1)
    }
    if (rounded >= 1) {
      // For 1-9, show 2 decimals for 3 sig figs
      return '$' + rounded.toFixed(2)
    }
    // For < 1, show enough decimals for 3 sig figs
    return '$' + rounded.toPrecision(3)
  }

  if (!totalSupply || totalSupply <= 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No supply data available
      </div>
    )
  }

  const totalMarketCap = price && totalSupply ? totalSupply * price : 0

  return (
    <div className="w-full">
      {/* Header */}
      <div className={`grid items-center gap-4 my-2 ${logoUrl ? 'grid-cols-3' : 'grid-cols-[auto_1fr_auto]'}`}>
        <div className="flex items-center space-x-3">
          {logoUrl && (
            <img 
              src={logoUrl} 
              alt={tokenSymbol}
              className="w-6 h-6 rounded-full object-cover"
            />
          )}
          <div>
            <div className="text-white font-bold text-sm">{tokenSymbol}</div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-400 text-xs">Market Cap</div>
          <div className="text-white font-bold text-sm">
            {price ? formatMarketCap(totalMarketCap) : 'No price'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-xs">Supply</div>
          <div className="text-white font-bold text-sm">{formatCompactNumber(totalSupply)}</div>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-white/10 mb-2"></div>

      {/* League Table */}
      <div className="space-y-1">
        {LEAGUE_RANKS.map((rank) => {
          const minTokens = (totalSupply * rank.percentage) / 100
          const marketCap = price ? minTokens * price : 0
          
          return (
            <div
              key={rank.name}
              className="grid grid-cols-3 items-center gap-4 py-1"
            >
              {/* Rank Info - Left Aligned */}
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 relative">
                  <img
                    src={rank.icon}
                    alt={rank.name}
                    className="w-6 h-6 object-contain"
                  />
                </div>
                <div className="text-white font-bold text-xs">
                  {rank.name}
                </div>
              </div>

              {/* Market Cap - Center Aligned */}
              <div className="text-white font-medium text-center text-xs md:text-sm">
                {price ? formatMarketCap(marketCap) : 'No price'}
              </div>

              {/* Supply Required - Right Aligned */}
              <div className="text-gray-400 text-right flex items-center justify-end text-sm mr-0">
                {formatCompactNumber(minTokens)}
                <span className="ml-0 text-xs text-white">
                  {tokenSymbol}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function LeagueGeneratorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LeagueGeneratorContent />
    </Suspense>
  )
} 