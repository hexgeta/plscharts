import { Metadata } from 'next'
import { PhuxPoolsExample } from '@/components/PhuxPoolsExample'

export const metadata: Metadata = {
  title: 'PHUX Pools | PLSCharts',
  description: 'Explore PHUX liquidity pools on PulseChain with real-time TVL, volume, and pool composition data.',
  keywords: 'PHUX, pools, liquidity, PulseChain, DeFi, TVL, volume, tokens',
  openGraph: {
    title: 'PHUX Pools | PLSCharts',
    description: 'Explore PHUX liquidity pools on PulseChain with real-time TVL, volume, and pool composition data.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PHUX Pools | PLSCharts',
    description: 'Explore PHUX liquidity pools on PulseChain with real-time TVL, volume, and pool composition data.',
  }
}

export default function PoolsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            PHUX Pools
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Explore liquidity pools on the PHUX protocol with real-time data from the PulseChain ecosystem
          </p>
        </div>
        
        <PhuxPoolsExample />
      </div>
    </div>
  )
}
