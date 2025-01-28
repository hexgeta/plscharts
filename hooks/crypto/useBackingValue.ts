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

// Helper function to calculate stake yield for a specific period
function calculateStakeYieldForPeriod(
  data: any[],
  startDate: Date,
  endDate: Date,
  tshares: number
): number {
  return data
    .filter(entry => {
      const entryDate = new Date(entry.date)
      return entryDate >= startDate && entryDate <= endDate
    })
    .reduce((acc, entry) => acc + (entry.payoutPerTshareHEX || 0), 0) * tshares
}

export function useBackingValue(token: string) {
  const { priceData, isLoading: priceLoading } = useCryptoPrice(token)
  const { priceData: pHexPrice, isLoading: pHexLoading } = useCryptoPrice('pHEX')
  const { priceData: eHexPrice, isLoading: eHexLoading } = useCryptoPrice('eHEX')
  
  const tokenConfig = TOKEN_CONSTANTS[token]
  const isEthereumToken = token.startsWith('e')
  const endpoint = isEthereumToken ? API_ENDPOINTS.historic_ethereum : API_ENDPOINTS.historic_pulsechain

  const { data: historicData, error, isLoading: swrLoading } = useSWR(
    token ? `crypto/backing/${token}` : null,
    async () => {
      const response = await fetch(endpoint)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    }
  )

  // Process the data based on stake type
  const processedData = useSWR(
    historicData ? `crypto/backing/processed/${token}` : null,
    async () => {
      try {
        if (!tokenConfig) {
          throw new Error(`No configuration found for token: ${token}`)
        }

        // Handle different stake types
        if (tokenConfig?.STAKE_TYPE === 'rolling') {
          // Get all related stakes' backing values
          const relatedStakes = tokenConfig.RELATED_STAKES || []
          
          // Calculate combined backing value
          const combinedBackingValue = relatedStakes.reduce((total, stakeToken) => {
            const stakeConfig = TOKEN_CONSTANTS[stakeToken]
            if (!stakeConfig) return total
            
            const now = new Date()
            
            // Skip if stake hasn't started yet
            if (stakeConfig.STAKE_START_DATE && new Date(stakeConfig.STAKE_START_DATE) > now) {
              return total
            }
            
            // Skip if stake has ended
            if (stakeConfig.STAKE_END_DATE && new Date(stakeConfig.STAKE_END_DATE) < now) {
              return total
            }

            // Calculate yield only for the active stake period
            const stakeYield = calculateStakeYieldForPeriod(
              historicData,
              new Date(stakeConfig.STAKE_START_DATE),
              stakeConfig.STAKE_END_DATE ? new Date(stakeConfig.STAKE_END_DATE) : now,
              stakeConfig.TSHARES || 0
            )
            
            const stakePrinciple = stakeConfig.STAKE_PRINCIPLE || 0
            return total + stakePrinciple + stakeYield
          }, 0)

          // Calculate total supply from active stakes
          const totalSupply = relatedStakes.reduce((total, stakeToken) => {
            const stakeConfig = TOKEN_CONSTANTS[stakeToken]
            if (!stakeConfig) return total
            
            const now = new Date()
            
            if (stakeConfig.STAKE_START_DATE && new Date(stakeConfig.STAKE_START_DATE) > now) {
              return total
            }
            if (stakeConfig.STAKE_END_DATE && new Date(stakeConfig.STAKE_END_DATE) < now) {
              return total
            }
            
            return total + (stakeConfig?.TOKEN_SUPPLY || 0)
          }, 0)

          // Calculate backing ratio and market values
          const backingStakeRatio = totalSupply > 0 ? combinedBackingValue / totalSupply : 0
          const hexPrice = isEthereumToken ? eHexPrice : pHexPrice
          
          let marketStakeValue = null
          let backingDiscount = null

          if (priceData?.price && priceData.price > 0 && hexPrice?.price && hexPrice.price > 0) {
            marketStakeValue = (priceData.price * totalSupply) / hexPrice.price
            const hexRatio = priceData.price / hexPrice.price
            backingDiscount = asPercentage((hexRatio - backingStakeRatio) / backingStakeRatio)
          }

          return {
            backingStakeYield: combinedBackingValue - totalSupply, // Yield is backing value minus principle
            backingStakeValue: combinedBackingValue,
            marketStakeValue,
            backingStakeRatio,
            backingDiscount,
            lastUpdated: new Date()
          } as BackingData
        }

        // Handle fixed stakes (MAXI)
        if (tokenConfig?.STAKE_TYPE === 'fixed') {
          const endDate = tokenConfig.STAKE_END_DATE && new Date(tokenConfig.STAKE_END_DATE) < new Date() 
            ? new Date(tokenConfig.STAKE_END_DATE) 
            : new Date()

          const stakeYield = calculateStakeYieldForPeriod(
            historicData,
            new Date(tokenConfig.STAKE_START_DATE),
            endDate,
            tokenConfig.TSHARES || 0
          )

          const backingStakeValue = (tokenConfig.STAKE_PRINCIPLE || 0) + stakeYield
          const backingStakeRatio = tokenConfig.TOKEN_SUPPLY > 0 ? backingStakeValue / tokenConfig.TOKEN_SUPPLY : 0

          let marketStakeValue = null
          let backingDiscount = null

          if (priceData?.price && priceData.price > 0) {
            const hexPrice = isEthereumToken ? eHexPrice : pHexPrice
            if (hexPrice?.price && hexPrice.price > 0) {
              marketStakeValue = (priceData.price * (tokenConfig.TOKEN_SUPPLY || 0)) / hexPrice.price
              const hexRatio = priceData.price / hexPrice.price
              backingDiscount = asPercentage((hexRatio - backingStakeRatio) / backingStakeRatio)
            }
          }

          return {
            backingStakeYield: stakeYield,
            backingStakeValue,
            marketStakeValue,
            backingStakeRatio,
            backingDiscount,
            lastUpdated: new Date()
          } as BackingData
        }

        return null
      } catch (error) {
        console.error(`Error calculating ${token} backing values:`, error)
        return null
      }
    }
  )

  return {
    backingData: processedData.data,
    isLoading: swrLoading || processedData.isLoading || priceLoading || 
               (isEthereumToken ? eHexLoading : pHexLoading),
    error: error || processedData.error
  }
}