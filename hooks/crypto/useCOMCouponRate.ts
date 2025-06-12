import { useMemo } from 'react'
import { useTokenPrices } from './useTokenPrices'
import { useHexDailyDataCache } from './useHexDailyData'

export interface COMCouponRateData {
  couponRate: number | null
  isLoading: boolean
  error: string | null
  hexPrice: number
  comPrice: number
  tShares: number | null
  stakedDays: number
  comStartBonus: number | null
}

export function useCOMCouponRate(
  stakedDays: number = 5555,
  hexPrincipal: number = 100000,
  chain: 'ETH' | 'PLS' = 'PLS' // Default to PLS chain
): COMCouponRateData {
  // Fetch prices for HEX and COM tokens
  const { prices, isLoading, error } = useTokenPrices(['HEX', 'COM'])
  
  // Get latest share rate from cache
  const { getLatestShareRate, isReady: cacheReady } = useHexDailyDataCache()
  
  // Get dynamic share rate from cached data
  const shareRate = useMemo(() => {
    if (!cacheReady) return null
    
    const latestShareRate = getLatestShareRate(chain)
    if (latestShareRate?.shareRate) {
      return parseFloat(latestShareRate.shareRate)
    }
    
    return null
  }, [cacheReady, getLatestShareRate, chain])
  
  // Calculate T-Shares based on hex principal, stake length, and share rate
  const tShares = useMemo(() => {
    if (!shareRate) return null
    
    // Big Pay Bonus (BPB)
    // =IF(E5<150000000,((E5/(150*10^7))*E5),E5*0.1)
    let bpb: number
    if (hexPrincipal < 150000000) {
      bpb = ((hexPrincipal / (150 * Math.pow(10, 7))) * hexPrincipal)
    } else {
      bpb = hexPrincipal * 0.1
    }
    
    // Long Pay Bonus (LPB)
    // =(E7-1)/1820*E5
    const lpb = ((stakedDays - 1) / 1820) * hexPrincipal
    
    // Total HEX for T-Share calculation: principle + BPB + LPB
    const totalHexForTShares = hexPrincipal + bpb + lpb
    
    // Convert to T-Shares using share rate (multiply by 10 for correct T-Share amount)
    return (totalHexForTShares / shareRate) * 10
  }, [hexPrincipal, stakedDays, shareRate])

  // Calculate COM start bonus using the Excel formula
  const comStartBonus = useMemo(() => {
    if (!prices?.HEX?.price || !prices?.COM?.price || !tShares) return null
    
    // Check if staked days > 364 (equivalent to E7>364 in Excel)
    if (stakedDays <= 364) {
      return null // Invalid stake length
    }

    try {
      // Excel formula for COM Start Bonus:
      // =IF(E7>364, (((((H7*1000000000000)*((E7*(10^15))/5555))/(10^15))*(10^10))/((10*(10^10))-(6*(10^10)*(((E7-365)*(10^10))/5190)/(10^10)))), "Invalid Stake Length")
      
      // Where:
      // E7 = stakedDays = 5555
      // H7 = tShares = 9.808192
      
      // Numerator calculation
      const numeratorPart1 = tShares * 1000000000000 // H7 * 1e12
      const numeratorPart2 = (stakedDays * Math.pow(10, 15)) / 5555 // (E7 * 1e15) / 5555
      const numeratorPart3 = (numeratorPart1 * numeratorPart2) / Math.pow(10, 15) // Divide by 1e15
      const numerator = numeratorPart3 * Math.pow(10, 10) // Multiply by 1e10
      
      // Denominator calculation
      const denominatorPart1 = 10 * Math.pow(10, 10) // 10 * 1e10 = 1e11
      const denominatorPart2Inner = ((stakedDays - 365) * Math.pow(10, 10)) / 5190 / Math.pow(10, 10) // ((E7-365)*1e10)/5190/1e10
      const denominatorPart2 = 6 * Math.pow(10, 10) * denominatorPart2Inner // 6 * 1e10 * inner
      const denominator = denominatorPart1 - denominatorPart2
      
      // Final calculation - this gives us the COM start bonus amount in COM tokens
      const result = numerator / denominator
      
      return result
      
    } catch (err) {
      console.error('Error calculating COM start bonus:', err)
      return null
    }
  }, [prices, stakedDays, tShares])

  // Calculate COM coupon rate percentage
  const couponRate = useMemo(() => {
    if (!comStartBonus || !prices?.HEX?.price || !prices?.COM?.price) return null
    
    try {
      // COM Coupon Rate = (COM Start Bonus * COM Price) / (HEX Principal * HEX Price) * 100
      const comBonusValue = comStartBonus * prices.COM.price // USD value of COM bonus
      const hexStakeValue = hexPrincipal * prices.HEX.price // USD value of HEX stake
      const rate = (comBonusValue / hexStakeValue) * 100 // Convert to percentage
      
      return rate
      
    } catch (err) {
      console.error('Error calculating COM coupon rate:', err)
      return null
    }
  }, [comStartBonus, prices, hexPrincipal])

  return {
    couponRate,
    isLoading,
    error: error?.message || null,
    hexPrice: prices?.HEX?.price || 0,
    comPrice: prices?.COM?.price || 0,
    tShares,
    stakedDays,
    comStartBonus
  }
} 