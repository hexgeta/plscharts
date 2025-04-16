import React, { createContext, useContext, ReactNode } from 'react';
import { useCryptoPrice } from '@/hooks/crypto/useCryptoPrice';

interface CryptoPriceContextType {
  wethPrice: number | null;
  isLoading: boolean;
  error: Error | null;
}

const CryptoPriceContext = createContext<CryptoPriceContextType>({
  wethPrice: null,
  isLoading: false,
  error: null,
});

export function CryptoPriceProvider({ children }: { children: ReactNode }) {
  const { priceData, isLoading, error } = useCryptoPrice('WETH');

  console.log('CryptoPriceProvider WETH Data:', {
    priceData,
    isLoading,
    error,
    hasPrice: Boolean(priceData?.price),
    priceValue: priceData?.price
  });

  const value = {
    wethPrice: priceData?.price || null,
    isLoading,
    error,
  };

  return (
    <CryptoPriceContext.Provider value={value}>
      {children}
    </CryptoPriceContext.Provider>
  );
}

export function useCryptoPriceContext() {
  const context = useContext(CryptoPriceContext);
  if (context === undefined) {
    throw new Error('useCryptoPriceContext must be used within a CryptoPriceProvider');
  }
  return context;
} 