import { createContext, useContext, useCallback, useState } from 'react';
import { useTokenPrices, TokenPriceData, TokenPrices } from '@/hooks/crypto/useTokenPrices';
import { KeyedMutator } from 'swr';

interface CryptoPriceContextType {
  prices: Record<string, TokenPriceData>;
  isLoading: boolean;
  error: any;
  refetch: () => void;
  addTokens: (newTokens: string[]) => void;
  removeTokens: (tokensToRemove: string[]) => void;
}

const CryptoPriceContext = createContext<CryptoPriceContextType>({
  prices: {},
  isLoading: true,
  error: null,
  refetch: () => {},
  addTokens: () => {},
  removeTokens: () => {}
});

export function CryptoPriceProvider({ 
  children, 
  tokens: initialTokens 
}: { 
  children: React.ReactNode; 
  tokens: string[] 
}) {
  const [trackedTokens, setTrackedTokens] = useState<string[]>(initialTokens);
  const { 
    prices, 
    isLoading, 
    error, 
    mutate 
  }: { 
    prices: TokenPrices; 
    isLoading: boolean; 
    error: any; 
    mutate: KeyedMutator<TokenPrices> 
  } = useTokenPrices(trackedTokens);

  const refetch = useCallback(() => {
    mutate();
  }, [mutate]);

  const addTokens = useCallback((newTokens: string[]) => {
    setTrackedTokens(prev => {
      const uniqueNewTokens = newTokens.filter(token => !prev.includes(token));
      return [...prev, ...uniqueNewTokens];
    });
  }, []);

  const removeTokens = useCallback((tokensToRemove: string[]) => {
    setTrackedTokens(prev => 
      prev.filter(token => !tokensToRemove.includes(token))
    );
  }, []);

  return (
    <CryptoPriceContext.Provider 
      value={{ 
        prices, 
        isLoading, 
        error,
        refetch,
        addTokens,
        removeTokens
      }}
    >
      {children}
    </CryptoPriceContext.Provider>
  );
}

export function useCryptoPrices() {
  const context = useContext(CryptoPriceContext);
  if (!context) {
    throw new Error('useCryptoPrices must be used within a CryptoPriceProvider');
  }
  return context;
} 