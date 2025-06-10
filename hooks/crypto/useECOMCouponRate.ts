import { useMemo } from 'react'
import { useTokenPrices } from './useTokenPrices'

export interface ECOMCouponRateData {
  couponRate: number | null
  isLoading: boolean
  error: string | null
  eHexPrice: number
  eComPrice: number
  tShares: number
  stakedDays: number
  eComStartBonus: number | null
}

export function useECOMCouponRate(
  stakedDays: number = 5555,
  eHexPrincipal: number = 100000,
  shareRate: number = 	41770.5 // Ethereum share rate from CSV
): ECOMCouponRateData {
  // Fetch prices for eHEX and eCOM tokens
  const { prices, isLoading, error } = useTokenPrices(['eHEX', 'eCOM'])
  
  // Calculate T-Shares based on eHEX principal and share rate
  const tShares = useMemo(() => {
    // Using the provided value from CSV for Ethereum: 9.735370
    return 9.735370
  }, [eHexPrincipal, shareRate])

  // Calculate eCOM start bonus using the Excel formula
  const eComStartBonus = useMemo(() => {
    if (!prices?.eHEX?.price || !prices?.eCOM?.price) return null
    
    // Check if staked days > 364 (equivalent to E7>364 in Excel)
    if (stakedDays <= 364) {
      return null // Invalid stake length
    }

    try {
      // Excel formula for eCOM Start Bonus:
      // =IF(E7>364, (((((H7*1000000000000)*((E7*(10^15))/5555))/(10^15))*(10^10))/((10*(10^10))-(6*(10^10)*(((E7-365)*(10^10))/5190)/(10^10)))), "Invalid Stake Length")
      
      // Where:
      // E7 = stakedDays = 5555
      // H7 = tShares = 9.735370 (Ethereum T-Shares)
      
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
      
      // Final calculation - this gives us the eCOM start bonus amount in eCOM tokens
      const result = numerator / denominator
      
      return result
      
    } catch (err) {
      console.error('Error calculating eCOM start bonus:', err)
      return null
    }
  }, [prices, stakedDays, tShares])

  // Calculate eCOM coupon rate percentage
  const couponRate = useMemo(() => {
    if (!eComStartBonus || !prices?.eHEX?.price || !prices?.eCOM?.price) return null
    
    try {
      // eCOM Coupon Rate = (eCOM Start Bonus * eCOM Price) / (eHEX Principal * eHEX Price) * 100
      const eComBonusValue = eComStartBonus * prices.eCOM.price // USD value of eCOM bonus
      const eHexStakeValue = eHexPrincipal * prices.eHEX.price // USD value of eHEX stake
      const rate = (eComBonusValue / eHexStakeValue) * 100 // Convert to percentage
      
      return rate
      
    } catch (err) {
      console.error('Error calculating eCOM coupon rate:', err)
      return null
    }
  }, [eComStartBonus, prices, eHexPrincipal])

  return {
    couponRate,
    isLoading,
    error: error?.message || null,
    eHexPrice: prices?.eHEX?.price || 0,
    eComPrice: prices?.eCOM?.price || 0,
    tShares,
    stakedDays,
    eComStartBonus
  }
} 