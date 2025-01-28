import { TOKEN_CONSTANTS, API_ENDPOINTS } from '@/constants/crypto'
import useSWR from 'swr'
import { useCryptoPrice } from './useCryptoPrice'

// Add a branded type for percentages
type Percentage = number & { __brand: 'percentage' }

interface BackingData {
  backingStakeYield: number
  backingStakeValue: number
  marketStakeValue: number | null
  backingStakeRatio: number
  backingDiscount: Percentage | null
  lastUpdated: Date
}

// Helper function to create a percentage
function asPercentage(num: number): Percentage {
  return num as Percentage
}

export function useBackingValue(token: string) {
  const { priceData, isLoading: priceLoading } = useCryptoPrice(token)
  const { priceData: pHexPrice, isLoading: pHexLoading } = useCryptoPrice('pHEX')
  const { priceData: eHexPrice, isLoading: eHexLoading } = useCryptoPrice('eHEX')
  
  // Determine if this is an Ethereum token
  const isEthereumToken = token.startsWith('e')
  const endpoint = isEthereumToken ? API_ENDPOINTS.historic_ethereum : API_ENDPOINTS.historic_pulsechain
  
  const { data, error, isLoading: swrLoading } = useSWR(
    token ? `crypto/backing/${token}` : null,
    async () => {
      try {
        const response = await fetch(endpoint)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        const tokenConfig = TOKEN_CONSTANTS[token]
        if (!tokenConfig) {
          throw new Error(`No configuration found for token: ${token}`)
        }

        const startDate = tokenConfig.STAKE_START_DATE
        if (!startDate) {
          return null
        }

        const relevantData = data?.filter(entry => new Date(entry.date) >= startDate)
        if (!relevantData?.length) {
          return null
        }

        // Calculate payout sum based on token
        let payoutSum
        const today = new Date()
        if (token === 'pMAXI' || token === 'eMAXI') {
          const endDate = tokenConfig.STAKE_END_DATE && new Date(tokenConfig.STAKE_END_DATE) < today 
            ? new Date(tokenConfig.STAKE_END_DATE) 
            : today
          payoutSum = relevantData
            .filter(entry => {
              const entryDate = new Date(entry.date)
              return entryDate <= endDate
            })
            .reduce((acc, entry) => acc + (entry.payoutPerTshareHEX || 0), 0)
        } else {
          // Use the same sum for all other tokens
          const otherTokensStartDate = new Date('2022-09-27')
          const endDate = tokenConfig.STAKE_END_DATE && new Date(tokenConfig.STAKE_END_DATE) < today 
            ? new Date(tokenConfig.STAKE_END_DATE) 
            : today
          const otherTokensData = data?.filter(entry => {
            const entryDate = new Date(entry.date)
            return entryDate >= otherTokensStartDate && entryDate <= endDate
          })
          payoutSum = otherTokensData.reduce((acc, entry) => acc + (entry.payoutPerTshareHEX || 0), 0)
        }

        // Calculate price-independent values
        const backingStakeYield = payoutSum * (tokenConfig.TSHARES || 0)
        const stakePrinciple = tokenConfig.STAKE_PRINCIPLE || 0
        const backingStakeValue = stakePrinciple + backingStakeYield
        const backingStakeRatio = tokenConfig.TOKEN_SUPPLY > 0 ? backingStakeValue / tokenConfig.TOKEN_SUPPLY : 0

        // Use eHEX price for Ethereum tokens, pHEX price for Pulsechain tokens
        const hexPrice = isEthereumToken ? eHexPrice : pHexPrice

        // Calculate price-dependent values if prices are available
        let marketStakeValue = null
        let backingDiscount = null

        // Only calculate if we have valid token price
        if (priceData?.price && priceData.price > 0) {
          // If we have HEX price, calculate the values
          if (hexPrice?.price && hexPrice.price > 0) {
            marketStakeValue = (priceData.price * (tokenConfig.TOKEN_SUPPLY || 0)) / hexPrice.price
            const hexRatio = priceData.price / hexPrice.price
            backingDiscount = asPercentage((hexRatio - backingStakeRatio) / backingStakeRatio)
          }
          // If HEX price is still loading, return null to maintain loading state
          else if (isEthereumToken ? eHexLoading : pHexLoading) {
            return null
          }
        }

        // If we have a token price but couldn't calculate backing discount, keep loading
        if (priceData?.price && priceData.price > 0 && backingDiscount === null) {
          return null
        }

        return {
          backingStakeYield,
          backingStakeValue,
          marketStakeValue,
          backingStakeRatio,
          backingDiscount,
          lastUpdated: new Date()
        }
      } catch (error) {
        console.error(`Error calculating ${token} backing values:`, error)
        return null
      }
    },
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  )

  // Keep loading if we're still fetching data or if we have a token price but no backing discount
  const isLoading = swrLoading || 
    (priceData?.price && priceData.price > 0 && (!data || data.backingDiscount === null))

  return {
    backingData: data,
    isLoading,
    error
  }
}