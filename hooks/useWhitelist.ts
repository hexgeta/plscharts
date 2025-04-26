import { useState, useEffect } from 'react';

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