import { useCryptoPrice } from '@/hooks/crypto/useCryptoPrice'
import { useState, useEffect, useRef } from 'react'
import NumberFlow from '@number-flow/react'
import Image from 'next/image'
import { formatNumber } from '@/utils/format'

// Configuration
const CONFIG = {
  PRICE_NOISE: 0.4,    // Increased for ETH's larger price movements
  UPDATE_INTERVAL: 150,     // Visual updates every 100ms for smooth display
  MOMENTUM_FACTOR: 0.8,     // How much previous movement influences next movement (0-1)
  STILL_CHANCE: 0.25,      // Chance of staying still on each update (0-1)
}

function getPriceChangeColor(change: number): string {
  if (Math.abs(change * 100) < 1) return 'text-zinc-500'
  return change >= 0 ? 'text-[#01FF55]' : 'text-red-500'
}

export default function LiveEthPrice() {
  const { priceData, isLoading, error } = useCryptoPrice('WETH')
  const [displayPrice, setDisplayPrice] = useState(0)
  const [priceColor, setPriceColor] = useState('text-white')
  const lastPrice = useRef(0)
  const realPrice = useRef(0)
  const lastNoise = useRef(0)

  // Update real price when API data changes
  useEffect(() => {
    if (priceData?.price) {
      realPrice.current = priceData.price
      // Only update display price directly if not using noise
      if (!CONFIG.PRICE_NOISE) {
        setDisplayPrice(priceData.price)
      }
    }
  }, [priceData?.price])

  // Price noise effect
  useEffect(() => {
    if (!CONFIG.PRICE_NOISE || !realPrice.current) return

    const generatePriceNoise = () => {
      // Chance to stay still
      if (Math.random() < CONFIG.STILL_CHANCE) {
        return;
      }

      // Generate new noise with momentum from previous noise
      const randomNoise = (Math.random() - 0.5) * CONFIG.PRICE_NOISE
      const momentumNoise = (lastNoise.current * CONFIG.MOMENTUM_FACTOR) + 
                           (randomNoise * (1 - CONFIG.MOMENTUM_FACTOR))
      
      lastNoise.current = momentumNoise
      const newPrice = realPrice.current + momentumNoise
      
      // Only change color if the price differs at 2 decimal places
      const formattedNewPrice = newPrice.toFixed(2)
      const formattedLastPrice = lastPrice.current.toFixed(2)
      
      if (formattedNewPrice !== formattedLastPrice) {
        const isIncreasing = parseFloat(formattedNewPrice) > parseFloat(formattedLastPrice)
        setPriceColor(isIncreasing ? 'text-[#01FF55]' : 'text-red-500')
      }
      
      lastPrice.current = newPrice
      setDisplayPrice(newPrice)
    }

    const interval = setInterval(generatePriceNoise, CONFIG.UPDATE_INTERVAL)
    return () => clearInterval(interval)
  }, [realPrice.current])

  // Update color on real price changes when noise is disabled
  useEffect(() => {
    if (CONFIG.PRICE_NOISE) return // Skip if using noise effect

    if (priceData?.price) {
      const formattedNewPrice = priceData.price.toFixed(2)
      const formattedLastPrice = lastPrice.current.toFixed(2)
      
      if (formattedNewPrice !== formattedLastPrice) {
        const isIncreasing = parseFloat(formattedNewPrice) > parseFloat(formattedLastPrice)
        setPriceColor(isIncreasing ? 'text-[#01FF55]' : 'text-red-500')
      }
      lastPrice.current = priceData.price
    }
  }, [priceData?.price])

  const currentPrice = CONFIG.PRICE_NOISE ? displayPrice : (priceData?.price || 0)

  if (error) {
    console.error('Price fetch error:', error)
    return <div className="text-red-500">Error loading price</div>
  }

  if (isLoading) {
    return <div className="text-white">Loading...</div>
  }

  return (
    <div className="flex justify-center items-center gap-6">
      <div className="relative w-16 h-16">
        <Image
          src="/coin-logos/ETH.svg"
          alt="ETH Logo"
          fill
          className="object-contain"
        />
      </div>
      <div className="grid grid-cols-[auto_auto] items-center gap-8">
        <div className={`${priceColor} text-7xl font-bold tabular-nums w-[320px] text-left`}>
          <NumberFlow
            value={Math.abs(currentPrice)}
            format={{ style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }}
            animated={false}
          />
        </div>
        {priceData?.priceChange24h !== undefined && (
          <div className={`text-3xl font-bold ${getPriceChangeColor(priceData.priceChange24h)}`}>
            {formatNumber(priceData.priceChange24h, { decimals: 1, percentage: true })}
          </div>
        )}
      </div>
    </div>
  )
} 