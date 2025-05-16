'use client'

import useSWR from 'swr';
import { TOKEN_CONSTANTS } from '@/constants/crypto';

// Token contract addresses (not pair addresses)
const TOKEN_ADDRESSES: Record<string, string> = {
  PLS: 'native', // Native PLS uses different endpoint
  PLSX: '0x075F2FF48DF8a77B63B21AD5C61D62BC2150e333', // PLSX token contract
  INC: '0x2fa878Ab3F87CC1C9607B0129766B192E13d20B5', // INCENTIVE token contract
  pHEX: '0x57964407C8F06561c4A8b1A0f4B8897f6c5eD47E', // pHEX token contract
  eHEX: '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39'  // eHEX token contract
};

async function fetchSupplies() {
  try {
    console.log('[useSupplies] Starting to fetch supplies');
    const supplies: Record<string, string> = {};

    // Get tokens with contract addresses
    const tokens = Object.entries(TOKEN_CONSTANTS)
      .filter(([_, config]) => config.contractAddress);
    
    console.log('[useSupplies] Tokens to fetch:', tokens.map(([token]) => token));

    // Process each token
    for (const [token, config] of tokens) {
      try {
        console.log(`[useSupplies] Fetching supply for ${token}`);
        
        if (config.contractAddress === 'native') {
          // Special handling for PLS as native token
          const response = await fetch("https://api.scan.pulsechain.com/api?module=stats&action=coinsupply");
          const supply = await response.text();
          supplies[token] = supply;
          console.log(`[useSupplies] PLS native supply:`, supply);
        } else {
          // For other tokens, use their contract address
          const url = `https://api.scan.pulsechain.com/api?module=stats&action=tokensupply&contractaddress=${config.contractAddress}`;
          console.log(`[useSupplies] Fetching from URL:`, url);
          
          const response = await fetch(url);
          const data = await response.json();
          console.log(`[useSupplies] Response for ${token}:`, data);
          
          if (data.status === '1' && data.result) {
            supplies[token] = data.result;
            console.log(`[useSupplies] Supply for ${token}:`, data.result);
          } else {
            console.warn(`[useSupplies] Invalid response for ${token}:`, data);
          }
        }
      } catch (error) {
        console.error(`[useSupplies] Error fetching supply for ${token}:`, error);
      }
    }

    console.log('[useSupplies] Final supplies:', supplies);
    return supplies;
  } catch (error) {
    console.error("[useSupplies] Error fetching supplies:", error);
    throw error;
  }
}

export function useSupplies() {
  const { data, error, isLoading, mutate } = useSWR(
    'tokenSupplies',
    fetchSupplies,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Only revalidate once per minute
    }
  );

  // Log hook state changes
  console.log('[useSupplies] Hook state:', {
    hasData: !!data,
    isLoading,
    hasError: !!error,
    data
  });

  return {
    supplies: data,
    isLoading,
    isError: error,
    mutate
  };
} 