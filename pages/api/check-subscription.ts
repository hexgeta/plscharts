import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/utils/supabase/client';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;
    const supabase = createClient();

    // Get user's subscription data from your database
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (error || !subscription) {
      return res.status(200).json({ hasAccess: false });
    }

    // Verify subscription status with Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    );

    // Check if subscription is active
    const hasAccess = stripeSubscription.status === 'active';

    res.status(200).json({ hasAccess });
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({ message: 'Error checking subscription' });
  }
} 