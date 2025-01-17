import { useState, useEffect } from 'react';
import Moralis from 'moralis';

export function useMoralis() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initMoralis = async () => {
      try {
        if (!Moralis.Core.isStarted) {
          await Moralis.start({
            apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjM1NmZjYjhiLTQwMGMtNDQ3OC04NTQ5LWYyMmM0ZjBkZjlmMSIsIm9yZ0lkIjoiMzcwNTEzIiwidXNlcklkIjoiMzgwNzg4IiwidHlwZUlkIjoiZDFjMTdiNWYtMjdhOS00ZWE0LTg1ZmItNjhlYzEyNWE4ODI1IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MDQxOTMwMjEsImV4cCI6NDg1OTk1MzAyMX0.kdU86rIA4yJDtXZx9BCG7QmkBteRb3S1OvwOBAWGVuk"
          });
        }
        if (isMounted) {
          setIsInitialized(true);
        }
      } catch (e) {
        if (isMounted) {
          setError(e instanceof Error ? e.message : 'Failed to initialize Moralis');
          setIsInitialized(false);
        }
      }
    };

    initMoralis();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isInitialized, error };
} 