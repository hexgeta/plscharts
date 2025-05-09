'use client'

import { useEffect, useState } from 'react'
import { getAuthUserCount } from '@/utils/supabase/auth'
import { useAuth } from '@/hooks/useAuth'
import { useWhitelist } from '@/hooks/useWhitelist'

// Create a custom event for banner visibility
const BANNER_VISIBILITY_EVENT = 'bannerVisibilityChange'

const MarketingBanner = () => {
  const [userCount, setUserCount] = useState<number | null>(null)
  const { signIn, user } = useAuth()
  const { isWhitelisted } = useWhitelist(user?.email)

  useEffect(() => {
    async function fetchUserCount() {
      const count = await getAuthUserCount()
      setUserCount(count)
    }
    fetchUserCount()
  }, [])

  // Emit banner visibility event when mounted/unmounted or when isWhitelisted changes
  useEffect(() => {
    const isVisible = !isWhitelisted
    document.documentElement.style.setProperty('--banner-visible', isVisible ? '1' : '0')
    const event = new CustomEvent(BANNER_VISIBILITY_EVENT, { detail: { isVisible } })
    window.dispatchEvent(event)
  }, [isWhitelisted])

  // Don't render banner at all if user is whitelisted
  if (isWhitelisted) {
    return null
  }

  return (
    <div className="absolute top-0 left-0 right-0 w-full px-4 py-2 z-[200] bg-black/0 hidden md:block h-[52px]">
      <div className="flex justify-center">
        <button
          onClick={signIn}
          className="bg-white/5 hover:bg-white/10 rounded-full px-6 py-2.5 border border-white/10 inline-block transition-all duration-200 backdrop-blur-sm"
        >
          <span className="text-[rgb(153,153,153)] text-center block font-medium">
            Get lifetime access to advanced pool staking stats for just $99. <u>Sign in with X</u>
          </span>
        </button>
      </div>
    </div>
  );
};

export default MarketingBanner; 