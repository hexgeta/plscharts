import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CryptoData {
  id: string;
  name: string;
  symbol: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
}

const CryptoTable: React.FC = () => {
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);

  useEffect(() => {
    const fetchCryptoData = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd');
        const apiResponse = await response.json();
        const sortedData = apiResponse.sort((a: CryptoData, b: CryptoData) => 
          b.price_change_percentage_24h - a.price_change_percentage_24h
        );
        setCryptoData(sortedData);
      } catch (error) {
        console.error('Error fetching crypto data:', error);
      }
    };

    // Initial fetch
    fetchCryptoData();

    // Set up interval for real-time updates
    const interval = setInterval(() => {
      fetchCryptoData();
      console.log('Table Updated');
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full p-5 bg-black border border-white/20 rounded-xl text-white">
      <div className="py-8">
        <div>
          <h2 className="text-2xl font-semibold leading-tight mb-4">Real-time Cryptocurrency Rankings</h2>
        </div>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full rounded-lg overflow-hidden">
            <table className="min-w-full leading-normal">
              <thead>
                <tr>
                  <th className="px-5 py-3 border-b border-white/20 text-left text-xs font-semibold uppercase tracking-wider">
                    Cryptocurrency
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-left text-xs font-semibold uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-left text-xs font-semibold uppercase tracking-wider">
                    Market Cap
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-left text-xs font-semibold uppercase tracking-wider">
                    Total Volume
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-left text-xs font-semibold uppercase tracking-wider">
                    Price Change 24h
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-left text-xs font-semibold uppercase tracking-wider">
                    Price % 24h
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-left text-xs font-semibold uppercase tracking-wider">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {cryptoData.map((crypto) => (
                    <motion.tr
                      key={crypto.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <td className="px-5 py-5 border-b border-white/20 text-sm">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10">
                            <img
                              className="w-full h-full rounded-full"
                              src={crypto.image}
                              alt={crypto.name}
                            />
                          </div>
                          <div className="ml-3">
                            <p className="whitespace-no-wrap">
                              {crypto.name}
                            </p>
                            <p className="text-white/60 whitespace-no-wrap">
                              {crypto.symbol.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-5 border-b border-white/20 text-sm">
                        <p className="whitespace-no-wrap">
                          ${crypto.current_price.toLocaleString()}
                        </p>
                        <p className="text-white/60 whitespace-no-wrap">USD</p>
                      </td>
                      <td className="px-5 py-5 border-b border-white/20 text-sm">
                        <p className="text-white/60 whitespace-no-wrap">
                          ${crypto.market_cap.toLocaleString()}
                        </p>
                      </td>
                      <td className="px-5 py-5 border-b border-white/20 text-sm">
                        <p className="text-white/60 whitespace-no-wrap">
                          ${crypto.total_volume.toLocaleString()}
                        </p>
                      </td>
                      <td className="px-5 py-5 border-b border-white/20 text-sm">
                        <p className="text-white/60 whitespace-no-wrap">
                          ${crypto.price_change_24h.toFixed(2)}
                        </p>
                      </td>
                      <td className="px-5 py-5 border-b border-white/20 text-sm">
                        <p className="text-white/60 whitespace-no-wrap">
                          {crypto.price_change_percentage_24h.toFixed(2)}%
                        </p>
                      </td>
                      <td className="px-5 py-5 border-b border-white/20 text-sm">
                        {crypto.price_change_percentage_24h > 0 ? (
                          <span className="relative inline-block px-3 py-1 font-semibold text-green-500 leading-tight">
                            <span
                              aria-hidden
                              className="absolute inset-0 bg-green-500/20 rounded-full"
                            ></span>
                            <span className="relative">Upward</span>
                          </span>
                        ) : (
                          <span className="relative inline-block px-3 py-1 font-semibold text-red-500 leading-tight">
                            <span
                              aria-hidden
                              className="absolute inset-0 bg-red-500/20 rounded-full"
                            ></span>
                            <span className="relative">Downward</span>
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoTable; 