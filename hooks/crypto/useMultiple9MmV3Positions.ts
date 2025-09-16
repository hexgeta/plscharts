import { useMemo } from 'react'
import { use9MmV3Positions } from './use9MmV3Positions'

interface MultipleV3PositionsResult {
  positions: any[]
  rawPositions: any[]
  isLoading: boolean
  error: any
  totalValue: number
  totalCurrentValue: number
  totalFeesValue: number
  positionCount: number
  refetch: () => void
}

export function useMultiple9MmV3Positions(
  addresses: string[], 
  options: { getTokenPrice?: (symbol: string) => number } = {}
): MultipleV3PositionsResult {
  
  // Since we can't call hooks dynamically, we'll use a fixed number of hook calls
  // and only use the ones that correspond to actual addresses
  const address1 = addresses[0] || null
  const address2 = addresses[1] || null
  const address3 = addresses[2] || null
  const address4 = addresses[3] || null
  const address5 = addresses[4] || null
  const address6 = addresses[5] || null
  const address7 = addresses[6] || null
  const address8 = addresses[7] || null
  const address9 = addresses[8] || null
  const address10 = addresses[9] || null
  const address11 = addresses[10] || null
  const address12 = addresses[11] || null
  const address13 = addresses[12] || null
  const address14 = addresses[13] || null
  const address15 = addresses[14] || null
  const address16 = addresses[15] || null
  const address17 = addresses[16] || null
  const address18 = addresses[17] || null
  const address19 = addresses[18] || null
  const address20 = addresses[19] || null
  
  // Call the hook for each address
  const result1 = use9MmV3Positions(address1, options)
  const result2 = use9MmV3Positions(address2, options)
  const result3 = use9MmV3Positions(address3, options)
  const result4 = use9MmV3Positions(address4, options)
  const result5 = use9MmV3Positions(address5, options)
  const result6 = use9MmV3Positions(address6, options)
  const result7 = use9MmV3Positions(address7, options)
  const result8 = use9MmV3Positions(address8, options)
  const result9 = use9MmV3Positions(address9, options)
  const result10 = use9MmV3Positions(address10, options)
  const result11 = use9MmV3Positions(address11, options)
  const result12 = use9MmV3Positions(address12, options)
  const result13 = use9MmV3Positions(address13, options)
  const result14 = use9MmV3Positions(address14, options)
  const result15 = use9MmV3Positions(address15, options)
  const result16 = use9MmV3Positions(address16, options)
  const result17 = use9MmV3Positions(address17, options)
  const result18 = use9MmV3Positions(address18, options)
  const result19 = use9MmV3Positions(address19, options)
  const result20 = use9MmV3Positions(address20, options)
  
  // Combine all results
  const allResults = [
    result1, result2, result3, result4, result5,
    result6, result7, result8, result9, result10,
    result11, result12, result13, result14, result15,
    result16, result17, result18, result19, result20
  ]
  
  // Filter out results for null addresses (only use results for actual addresses)
  const validResults = allResults.slice(0, addresses.length)
  
  return useMemo(() => {
    const positions = validResults.flatMap(result => result.positions || [])
    const rawPositions = validResults.flatMap(result => result.rawPositions || [])
    const isLoading = validResults.some(result => result.isLoading)
    const error = validResults.find(result => result.error)?.error || null
    const totalValue = validResults.reduce((sum, result) => sum + (result.totalValue || 0), 0)
    const totalCurrentValue = validResults.reduce((sum, result) => sum + (result.totalCurrentValue || 0), 0)
    const totalFeesValue = validResults.reduce((sum, result) => sum + (result.totalFeesValue || 0), 0)
    const positionCount = positions.length
    
    const refetch = () => {
      validResults.forEach(result => {
        if (result.refetch) {
          result.refetch()
        }
      })
    }
    
    return {
      positions,
      rawPositions,
      isLoading,
      error,
      totalValue,
      totalCurrentValue,
      totalFeesValue,
      positionCount,
      refetch
    }
  }, [validResults, addresses.length])
}
