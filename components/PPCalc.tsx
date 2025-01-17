'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

interface ApiData {
  price_Pulsechain: number
  payoutPerTshare_Pulsechain: number
  tshareRateHEX_Pulsechain: number
}

interface CalculatedStats {
  // Solo Stake Stats
  soloGasCostPLS: number
  soloGasCostUSD: number
  soloGasCostHEX: number
  soloFeeYieldPercent: number
  soloAPY: number

  // Pool Party Stake Stats
  totalFee: number
  totalFeeInHEX: number
  feePercentYield: number
  tShares: number
  hexYield: number
  roi: number
  poolAPY: number

  // Existing Maxi Pooled Stakes
  maxiHexAPY: number
  deciHexAPY: number
  luckyHexAPY: number
  trioHexAPY: number
  baseHexAPY: number
  
  // Effective $ APY
  maxiEffectiveAPY: number
  deciEffectiveAPY: number
  luckyEffectiveAPY: number
  trioEffectiveAPY: number
  baseEffectiveAPY: number
}

export default function PPCalc() {
  const [apiData, setApiData] = useState<ApiData | null>(null)
  const [pulsePrice, setPulsePrice] = useState<number | null>(null)
  const [globalGasPrice, setGlobalGasPrice] = useState<number | null>(null)
  const [raisedHex, setRaisedHex] = useState(100000)
  const [stakeLength, setStakeLength] = useState(1555)
  const [organiserFee, setOrganiserFee] = useState(1)
  const [stats, setStats] = useState<CalculatedStats>({
    soloGasCostPLS: 0,
    soloGasCostUSD: 0,
    soloGasCostHEX: 0,
    soloFeeYieldPercent: 0,
    soloAPY: 0,
    totalFee: 0,
    totalFeeInHEX: 0,
    feePercentYield: 0,
    tShares: 0,
    hexYield: 0,
    roi: 0,
    poolAPY: 0,
    maxiHexAPY: 0,
    deciHexAPY: 0,
    luckyHexAPY: 0,
    trioHexAPY: 0,
    baseHexAPY: 0,
    maxiEffectiveAPY: 0,
    deciEffectiveAPY: 0,
    luckyEffectiveAPY: 0,
    trioEffectiveAPY: 0,
    baseEffectiveAPY: 0
  })
  const [tokenPrices, setTokenPrices] = useState<{
    maxi: number | null
    deci: number | null
    lucky: number | null
    trio: number | null
    base: number | null
  }>({
    maxi: null,
    deci: null,
    lucky: null,
    trio: null,
    base: null
  })

  // Fetch PLS price
  const fetchPulsechainPrice = async () => {
    const tokenAddress = '0xA1077a294dDE1B09bB078844df40758a5D0f9a27'
    const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    
    try {
      const response = await fetch(url)
      const data = await response.json()
      const targetPairAddress = '0xe56043671df55de5cdf8459710433c10324de0ae'.toLowerCase()
      const pair = data.pairs.find(p => p.pairAddress.toLowerCase() === targetPairAddress)

      if (pair && pair.priceUsd) {
        setPulsePrice(parseFloat(pair.priceUsd))
      }
    } catch (error) {
      console.error("Error fetching Pulsechain price:", error)
    }
  }

  // Fetch gas price
  const fetchGasPrice = async () => {
    try {
      const response = await fetch('https://api.scan.pulsechain.com/api/v2/stats')
      const data = await response.json()
      if (data?.gas_prices?.average) {
        setGlobalGasPrice(data.gas_prices.average)
      }
    } catch (error) {
      console.error("Error fetching gas price:", error)
    }
  }

  // Fetch HEX data
  useEffect(() => {
    const fetchHexData = async () => {
      try {
        const response = await fetch('https://hexdailystats.com/livedata')
        const data = await response.json()
        setApiData(data)
      } catch (error) {
        console.error('Error fetching HEX data:', error)
      }
    }

    fetchHexData()
    fetchPulsechainPrice()
    fetchGasPrice()
  }, [])

  // Token price fetch functions
  const fetchTokenPriceMaxi = async () => {
    const url = "https://api.dexscreener.com/latest/dex/tokens/0x0d86EB9f43C57f6FF3BC9E23D8F9d82503f0e84b"
    try {
      const response = await fetch(url)
      const data = await response.json()
      const targetPairAddress = '0xd63204ffcefd8f8cbf7390bbcd78536468c085a2'.toLowerCase()
      const pair = data.pairs.find(p => p.pairAddress.toLowerCase() === targetPairAddress)
      return pair?.priceUsd ? parseFloat(pair.priceUsd) : null
    } catch (error) {
      console.error("Error fetching Maxi price:", error)
      return null
    }
  }

  const fetchTokenPriceDeci = async () => {
    const url = "https://api.dexscreener.com/latest/dex/tokens/0x6b32022693210cD2Cfc466b9Ac0085DE8fC34eA6"
    try {
      const response = await fetch(url)
      const data = await response.json()
      const targetPairAddress = '0x969af590981bb9d19ff38638fa3bd88aed13603a'.toLowerCase()
      const pair = data.pairs.find(p => p.pairAddress.toLowerCase() === targetPairAddress)
      return pair?.priceUsd ? parseFloat(pair.priceUsd) : null
    } catch (error) {
      console.error("Error fetching Deci price:", error)
      return null
    }
  }

  const fetchTokenPriceLucky = async () => {
    const url = "https://api.dexscreener.com/latest/dex/tokens/0x6B0956258fF7bd7645aa35369B55B61b8e6d6140"
    try {
      const response = await fetch(url)
      const data = await response.json()
      const targetPairAddress = '0x52d4b3f479537a15d0b37b6cdbdb2634cc78525e'.toLowerCase()
      const pair = data.pairs.find(p => p.pairAddress.toLowerCase() === targetPairAddress)
      return pair?.priceUsd ? parseFloat(pair.priceUsd) : null
    } catch (error) {
      console.error("Error fetching Lucky price:", error)
      return null
    }
  }

  const fetchTokenPriceTrio = async () => {
    const url = "https://api.dexscreener.com/latest/dex/tokens/0xF55cD1e399e1cc3D95303048897a680be3313308"
    try {
      const response = await fetch(url)
      const data = await response.json()
      const targetPairAddress = '0x0b0f8f6c86c506b70e2a488a451e5ea7995d05c9'.toLowerCase()
      const pair = data.pairs.find(p => p.pairAddress.toLowerCase() === targetPairAddress)
      return pair?.priceUsd ? parseFloat(pair.priceUsd) : null
    } catch (error) {
      console.error("Error fetching Trio price:", error)
      return null
    }
  }

  const fetchTokenPriceBase = async () => {
    const url = "https://api.dexscreener.com/latest/dex/tokens/0xe9f84d418B008888A992Ff8c6D22389C2C3504e0"
    try {
      const response = await fetch(url)
      const data = await response.json()
      const targetPairAddress = '0xb39490b46d02146f59e80c6061bb3e56b824d672'.toLowerCase()
      const pair = data.pairs.find(p => p.pairAddress.toLowerCase() === targetPairAddress)
      return pair?.priceUsd ? parseFloat(pair.priceUsd) : null
    } catch (error) {
      console.error("Error fetching Base price:", error)
      return null
    }
  }

  // Fetch all token prices
  const fetchAllTokenPrices = async () => {
    const [maxi, deci, lucky, trio, base] = await Promise.all([
      fetchTokenPriceMaxi(),
      fetchTokenPriceDeci(),
      fetchTokenPriceLucky(),
      fetchTokenPriceTrio(),
      fetchTokenPriceBase()
    ])

    setTokenPrices({ maxi, deci, lucky, trio, base })
  }

  // Add this to your useEffect
  useEffect(() => {
    fetchAllTokenPrices()
    const interval = setInterval(fetchAllTokenPrices, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Add this useEffect to handle calculations whenever inputs change
  useEffect(() => {
    if (!apiData || !pulsePrice || !globalGasPrice) return;

    // Solo Stake Calculations
    const gasUnits = 53694 + (stakeLength * 2310);
    const soloGasCostPLS = (globalGasPrice / 1000000000) * gasUnits;
    const soloGasCostUSD = soloGasCostPLS * pulsePrice;
    const soloGasCostHEX = soloGasCostUSD / apiData.price_Pulsechain;

    // Calculate T-shares
    const firstMultiplier = Math.min(1 + (stakeLength / 365.25 / 2.35), 2);
    const secondMultiplier = Math.min(1 + (Math.log10(raisedHex / 1000) / 0.5), 2);
    const effectiveHex = raisedHex * firstMultiplier * secondMultiplier;
    const tShares = effectiveHex / apiData.tshareRateHEX_Pulsechain;

    // Calculate yields and APY
    const hexYield = tShares * stakeLength * apiData.payoutPerTshare_Pulsechain;
    const roi = (hexYield / raisedHex) * 100;
    const poolAPY = (roi / stakeLength) * 365.25;
    const soloAPY = ((hexYield - soloGasCostHEX) / raisedHex / stakeLength) * 365.25 * 100;

    // Pool Party Calculations
    const platformFee = 0.5; // 0.5% platform fee
    const totalFee = platformFee + organiserFee;
    const totalFeeInHEX = raisedHex * (totalFee / 100);
    const feePercentYield = (totalFeeInHEX / hexYield) * 100;
    const soloFeeYieldPercent = (soloGasCostHEX / hexYield) * 100;

    setStats({
      soloGasCostPLS,
      soloGasCostUSD,
      soloGasCostHEX,
      soloFeeYieldPercent,
      soloAPY,
      totalFee,
      totalFeeInHEX,
      feePercentYield,
      tShares,
      hexYield,
      roi,
      poolAPY,
      maxiHexAPY: 0, // These will be calculated separately
      deciHexAPY: 0,
      luckyHexAPY: 0,
      trioHexAPY: 0,
      baseHexAPY: 0,
      maxiEffectiveAPY: 0,
      deciEffectiveAPY: 0,
      luckyEffectiveAPY: 0,
      trioEffectiveAPY: 0,
      baseEffectiveAPY: 0
    });

  }, [apiData, pulsePrice, globalGasPrice, raisedHex, stakeLength, organiserFee]);

  // Add this useEffect to fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch HEX data
        const hexResponse = await fetch('https://hexdailystats.com/livedata');
        const hexData = await hexResponse.json();
        setApiData(hexData);

        // Fetch PLS price
        const plsResponse = await fetch('https://api.dexscreener.com/latest/dex/tokens/0xA1077a294dDE1B09bB078844df40758a5D0f9a27');
        const plsData = await plsResponse.json();
        const targetPairAddress = '0xe56043671df55de5cdf8459710433c10324de0ae'.toLowerCase();
        const pair = plsData.pairs.find(p => p.pairAddress.toLowerCase() === targetPairAddress);
        if (pair?.priceUsd) {
          setPulsePrice(parseFloat(pair.priceUsd));
        }

        // Fetch gas price
        const gasResponse = await fetch('https://api.scan.pulsechain.com/api/v2/stats');
        const gasData = await gasResponse.json();
        if (gasData?.gas_prices?.average) {
          setGlobalGasPrice(gasData.gas_prices.average);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchInitialData();
    const interval = setInterval(fetchInitialData, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="p-6">
      <div className="space-y-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div>
            <Label htmlFor="raised-hex">Estimated raised HEX</Label>
            <Input
              id="raised-hex"
              type="number"
              value={raisedHex}
              onChange={(e) => setRaisedHex(Number(e.target.value))}
              className="w-[30%] font-mono"
              placeholder="e.g. 100,000"
            />
          </div>

          {/* Stake Length Slider */}
          <div className="space-y-2">
            <Label>Stake length in days: {stakeLength}d</Label>
            <div className="relative">
              <Slider
                value={[stakeLength]}
                onValueChange={(value) => setStakeLength(value[0])}
                min={1}
                max={5555}
                step={1}
                className="h-4 bg-[#00d0ff] rounded-full"
              />
            </div>
          </div>

          {/* Organiser Fee Slider */}
          <div className="space-y-2">
            <Label>Your organiser fee: {organiserFee}%</Label>
            <div className="relative">
              <Slider
                value={[organiserFee]}
                onValueChange={(value) => setOrganiserFee(value[0])}
                min={0}
                max={5}
                step={0.1}
                className="h-4 bg-[#ff68b3] rounded-full"
              />
            </div>
          </div>

          {/* Stats Display */}
          <div className="mt-8 p-6 border-2 border-dashed border-gray-300 rounded-lg space-y-6">
            <h3 className="font-bold text-xl">Your Solo vs Pooled Stake Stats 🔥</h3>
            
            {/* Solo-Stake Section */}
            <div className="space-y-2">
              <h4 className="font-bold underline">Solo-Stake</h4>
              <p><strong>Solo End-stake Gas Cost in PLS:</strong> {stats.soloGasCostPLS.toFixed(1)} PLS</p>
              <p><strong>Solo End-stake Gas Cost in $:</strong> ${stats.soloGasCostUSD.toFixed(2)}</p>
              <p><strong>Solo End-stake Gas Cost in HEX:</strong> {stats.soloGasCostHEX.toFixed(2)} HEX</p>
              <p><strong>End-stake Fee as a % of Yield:</strong> {stats.soloFeeYieldPercent.toFixed(3)}%</p>
              <p><strong>Solo APY:</strong> {stats.soloAPY.toFixed(1)}%</p>
            </div>

            {/* Pool Party Stake Section */}
            <div className="space-y-2">
              <h4 className="font-bold underline">Pool Party Stake</h4>
              <p><strong>Total fee:</strong> {stats.totalFee.toFixed(2)}%</p>
              <p><strong>Total Fee in HEX:</strong> {stats.totalFeeInHEX.toFixed(0)}</p>
              <p><strong>Fee as a % of Yield:</strong> {stats.feePercentYield.toFixed(3)}%</p>
              <p><strong>T-Shares:</strong> {stats.tShares.toFixed(1)}</p>
              <p><strong>HEX Yield:</strong> {stats.hexYield.toFixed(0)}</p>
              <p><strong>ROI:</strong> {stats.roi.toFixed(1)}%</p>
              <p><strong>Pool APY:</strong> {stats.poolAPY.toFixed(1)}%</p>
            </div>

            {/* Existing Maxi Pooled Stakes Section */}
            <div className="space-y-2">
              <h4 className="font-bold underline">Existing Maxi Pooled Stakes</h4>
              <p><strong>Ⓜ️ HEX APY:</strong> {stats.maxiHexAPY.toFixed(1)}%</p>
              <p><strong>🛡️ HEX APY:</strong> {stats.deciHexAPY.toFixed(1)}%</p>
              <p><strong>🍀 HEX APY:</strong> {stats.luckyHexAPY.toFixed(1)}%</p>
              <p><strong>🎲 HEX APY:</strong> {stats.trioHexAPY.toFixed(1)}%</p>
              <p><strong>🟠 HEX APY:</strong> {stats.baseHexAPY.toFixed(1)}%</p>

              <p><strong>Ⓜ️ Effective $ APY:</strong> {stats.maxiEffectiveAPY.toFixed(1)}%</p>
              <p><strong>🛡️ Effective $ APY:</strong> {stats.deciEffectiveAPY.toFixed(1)}%</p>
              <p><strong>🍀 Effective $ APY:</strong> {stats.luckyEffectiveAPY.toFixed(1)}%</p>
              <p><strong>🎲 Effective $ APY:</strong> {stats.trioEffectiveAPY.toFixed(1)}%</p>
              <p><strong>🟠 Effective $ APY:</strong> {stats.baseEffectiveAPY.toFixed(1)}%</p>
            </div>

            {/* Footer Notes */}
            <div className="mt-8 space-y-4 text-sm italic text-gray-600">
              <p>*APY stats take into account all fees (Pool Party platform fee & PLS end-stake gas fee)</p>
              <p>*Effective $ APY is the resulting HEX APY you would get from a pooled HEX stake by buying it at its current premium/discount</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
