'use client'

import { SWRConfig } from 'swr'
import { swrConfig } from '@/utils/swr-config'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { useHexDailyDataPreloader } from '@/hooks/crypto/useHexDailyData'
import { useBackgroundPreloader } from '@/hooks/crypto/useBackgroundPreloader'

// Background HEX data preloader component
function HexDataPreloader() {
  const { isPreloaded, lastUpdated } = useHexDailyDataPreloader()
  
  // Log preload status for debugging (only in development)
  if (process.env.NODE_ENV === 'development' && isPreloaded && lastUpdated) {
    console.log(`[HEX Cache] Daily data preloaded successfully at ${new Date(lastUpdated).toLocaleTimeString()}`)
  }
  
  return null // This component doesn't render anything
}

// Background portfolio data preloader component
function BackgroundPreloader() {
  useBackgroundPreloader()
  return null // This component doesn't render anything
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={swrConfig}>
      <ThemeProvider>
        <HexDataPreloader />
        <BackgroundPreloader />
        {children}
        <Toaster />
      </ThemeProvider>
    </SWRConfig>
  )
} 