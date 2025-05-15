import { useState, useEffect } from 'react';

const WHITELIST_CACHE_KEY = 'whitelisted_email';

export function useWhitelist(email: string | null | undefined) {
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkWhitelist() {
      if (!email) {
        setIsWhitelisted(false);
        return;
      }

      // Check localStorage first
      try {
        const cachedEmail = localStorage.getItem(WHITELIST_CACHE_KEY);
        if (cachedEmail === email) {
          setIsWhitelisted(true);
          return;
        }
      } catch (err) {
        // Ignore localStorage errors
        console.warn('Failed to read from localStorage:', err);
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/whitelist/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          throw new Error('Failed to check whitelist status');
        }

        const data = await response.json();
        setIsWhitelisted(data.isWhitelisted);
        
        // Cache the result if whitelisted
        if (data.isWhitelisted) {
          try {
            localStorage.setItem(WHITELIST_CACHE_KEY, email);
          } catch (err) {
            // Ignore localStorage errors
            console.warn('Failed to write to localStorage:', err);
          }
        }
      } catch (err) {
        console.error('Error checking whitelist:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setIsWhitelisted(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkWhitelist();
  }, [email]);

  return { isWhitelisted, isLoading, error };
} 