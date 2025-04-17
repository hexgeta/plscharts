'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { PooledStakes, SphereLayout } from '@/components/features/pooled-stakes';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Redirect to /home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/home');
    }
  }, [isAuthenticated, router]);

  return (
    <SphereLayout>
      <PooledStakes />
    </SphereLayout>
  );
}
