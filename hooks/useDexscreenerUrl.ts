import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { useMemo } from 'react';

export function useDexscreenerUrl(token: string) {
  const url = useMemo(() => {
    if (!token) return null;
    
    const tokenConfig = TOKEN_CONSTANTS[token];
    if (!tokenConfig) return null;
    
    if (!tokenConfig.PAIR?.chain || !tokenConfig.PAIR?.pairAddress) {
      return null;
    }

    const { chain, pairAddress } = tokenConfig.PAIR;
    const chainName = chain === 'pulsechain' ? 'pulsechain' : 'ethereum';
    
    return `https://dexscreener.com/${chainName}/${pairAddress}`;
  }, [token]);

  return url;
} 