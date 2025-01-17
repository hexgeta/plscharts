import { useState, useEffect } from 'react';

interface GasPrices {
  ethGasPrice: number | null;
  plsGasPrice: number | null;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
}

export function useGasPrice() {
  const [gasPrices, setGasPrices] = useState<GasPrices>({
    ethGasPrice: null,
    plsGasPrice: null,
    lastUpdated: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const fetchGasPrices = async () => {
      try {
        // Fetch PulseChain gas price
        const plsResponse = await fetch('https://api.scan.pulsechain.com/api/v2/stats');
        const plsData = await plsResponse.json();
        
        // Fetch Ethereum gas price
        const ethResponse = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=XWBMBT8X77S6Y9EB3DT3GBA1APJWT32VXS');
        const ethData = await ethResponse.json();

        setGasPrices({
          ethGasPrice: ethData.status === '1' ? Number(ethData.result.ProposeGasPrice) : null,
          plsGasPrice: plsData?.gas_prices?.average || null,
          lastUpdated: new Date(),
          isLoading: false,
          error: null
        });
      } catch (error) {
        setGasPrices(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to fetch gas prices'
        }));
      }
    };

    fetchGasPrices();
  }, []);

  return gasPrices;
} 