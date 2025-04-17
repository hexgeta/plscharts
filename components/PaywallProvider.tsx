import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '@/hooks/useAuth';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface PaywallContextType {
  hasAccess: boolean;
  isLoading: boolean;
  checkAccess: () => Promise<void>;
  handleSubscribe: () => Promise<void>;
}

const PaywallContext = createContext<PaywallContextType | null>(null);

export const usePaywall = () => {
  const context = useContext(PaywallContext);
  if (!context) {
    throw new Error('usePaywall must be used within a PaywallProvider');
  }
  return context;
};

export const PaywallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const checkAccess = async () => {
    try {
      // First check local storage for payment verification
      const paymentVerification = localStorage.getItem('payment_verification');
      
      if (paymentVerification) {
        setHasAccess(true);
        setIsLoading(false);
        return;
      }

      // If user is authenticated, check Supabase for subscription
      if (isAuthenticated && user) {
        const response = await fetch('/api/check-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
          }),
        });

        const data = await response.json();
        if (data.hasAccess) {
          localStorage.setItem('payment_verification', 'true');
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
    }
    setIsLoading(false);
  };

  const handleSubscribe = async () => {
    try {
      // Create Stripe checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id || 'anonymous',
          price: 'price_XXX', // Replace with your Stripe price ID
        }),
      });

      const session = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({
          sessionId: session.id,
        });

        if (error) {
          console.error('Error:', error);
        }
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  // Listen for payment success
  useEffect(() => {
    if (router.query.payment_success === 'true') {
      localStorage.setItem('payment_verification', 'true');
      setHasAccess(true);
      
      // Remove query params
      const { payment_success, ...query } = router.query;
      router.replace({ pathname: router.pathname, query });
    }
  }, [router.query]);

  useEffect(() => {
    checkAccess();
  }, [isAuthenticated, user]);

  return (
    <PaywallContext.Provider value={{ hasAccess, isLoading, checkAccess, handleSubscribe }}>
      {children}
    </PaywallContext.Provider>
  );
}; 