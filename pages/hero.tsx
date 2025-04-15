import { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { PooledStakes } from '@/components/PooledStakes'

// Dynamically import components that need client-side rendering
const SimpleSphere = dynamic(() => import("./sphere/maxi"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-black" />
})

const MusicPlayer = dynamic(() => import('@/components/MusicPlayer'), {
  ssr: false,
  loading: () => null
})

export const metadata: Metadata = {
  title: 'MAXI Yield Sphere',
  description: 'Visualizing cumulative yield accumulation',
}

// Hide navigation for this page
export const hideNav = true

// Add getServerSideProps to ensure proper SSR
export async function getServerSideProps() {
  return {
    props: {
      // Add any props you need here
    }
  }
}

export default function HeroSectionDemo() {
  return (
    <main className="min-h-screen w-full bg-black relative flex flex-col">
      {/* Music Player */}
      <div className="fixed bottom-4 right-4 z-[999]">
        <MusicPlayer playlist={['maxi.mp3']} autoPlay={false} />
      </div>

      {/* Sphere visualization as background */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center">
        <div className="w-full h-full mr-8 scale-[1]">
          <SimpleSphere />
        </div>
      </div>

      {/* Content overlay */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Dark gradient overlay at the top */}
        <div className="absolute top-0 left-0 w-full h-[30vh] bg-gradient-to-b from-black to-transparent z-20" />

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center px-4">
          <PooledStakes />
        </div>

        {/* Dark gradient overlay at the bottom */}
        <div className="absolute bottom-0 left-0 w-full h-[30vh] bg-gradient-to-t from-black to-transparent z-20" />
      </div>
    </main>
  )
}

// Remove any layout inheritance
HeroSectionDemo.getLayout = (page: React.ReactNode) => page
