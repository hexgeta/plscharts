import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function LiveRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Generate a random ID to force Twitter to fetch new metadata
    const randomId = Math.random().toString(36).substring(7);
    router.replace(`/live/${randomId}`);
  }, []);

  return null;
}