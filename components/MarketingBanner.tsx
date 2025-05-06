'use client'

import { useEffect, useState } from 'react'
import { getAuthUserCount } from '@/utils/supabase/auth'
import { useAuth } from '@/hooks/useAuth'

const MarketingBanner = () => {
  const [userCount, setUserCount] = useState<number | null>(null)
  const { signIn } = useAuth()

  useEffect(() => {
    async function fetchUserCount() {
      const count = await getAuthUserCount()
      setUserCount(count)
    }
    fetchUserCount()
  }, [])

  return (
    <div className="hidden md:block fixed top-0 left-0 right-0 w-full px-4 py-2 z-[200] bg-black/0 ">
      <div className="flex justify-center">
        <button
          onClick={signIn}
          className="bg-white/5 hover:bg-white/10 rounded-full px-6 py-2.5 border border-white/10 inline-block transition-all duration-200 backdrop-blur-sm"
        >
          <span className="text-[rgb(153,153,153)] text-center block font-medium ">
            Get lifetime access to advanced pool staking stats for just $99. <u>Sign in with X</u>
          </span>
        </button>
      </div>
    </div>
  );
};

export default MarketingBanner; 