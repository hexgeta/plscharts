import { Metadata } from 'next'
import SimpleSphere from "./sphere/maxi"
import { PooledStakes } from '@/components/PooledStakes'
import MusicPlayer from '@/components/MusicPlayer'

export const metadata: Metadata = {
  title: 'MAXI Yield Sphere',
  description: 'Visualizing cumulative yield accumulation',
}

// Hide navigation for this page
export const hideNav = true

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
