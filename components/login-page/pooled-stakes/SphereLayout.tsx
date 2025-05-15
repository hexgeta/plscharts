import { ReactNode, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useMusic } from '@/contexts/MusicContext';
import { usePooledStakesData } from '@/hooks/usePooledStakesData';
import { VisualizationSettings, SphereType } from '@/components/login-page/VisualizationSphere';
import {
  MAXI_SPHERE_CONFIG,
  DECI_SPHERE_CONFIG,
  LUCKY_SPHERE_CONFIG,
  TRIO_SPHERE_CONFIG,
  BASE_SPHERE_CONFIG
} from '@/components/login-page/sphereConfigs';

const VisualizationSphere = dynamic(() => import('@/components/login-page/VisualizationSphere'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-black" />
});

const MusicPlayer = dynamic(() => import('@/components/MusicPlayer'), {
  ssr: false,
  loading: () => null
});

interface SphereLayoutProps {
  children: ReactNode;
  showMusicPlayer?: boolean;
}

interface SphereConfig {
  settings: VisualizationSettings;
  type: SphereType;
  music: string;
}

const SPHERES: SphereConfig[] = [
  { 
    settings: MAXI_SPHERE_CONFIG,
    type: 'MAXI',
    music: 'maxi.mp3'
  },
  { 
    settings: DECI_SPHERE_CONFIG,
    type: 'DECI',
    music: 'deci.mp3'
  },
  { 
    settings: LUCKY_SPHERE_CONFIG,
    type: 'LUCKY',
    music: 'lucky.mp3'
  },
  { 
    settings: TRIO_SPHERE_CONFIG,
    type: 'TRIO',
    music: 'trio.mp3'
  },
  { 
    settings: BASE_SPHERE_CONFIG,
    type: 'BASE',
    music: 'base2.mp3'
  }
];

export default function SphereLayout({ children, showMusicPlayer = true }: SphereLayoutProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [sphereIndex] = useState(() => Math.floor(Math.random() * SPHERES.length));
  const [startAnimation, setStartAnimation] = useState(false);
  const [shouldPlayMusic, setShouldPlayMusic] = useState(false);
  const { setIsPlaying, setCurrentTrack } = useMusic();
  const { data: rawSphereData, isLoading: isTableLoading } = usePooledStakesData();

  // Transform data to match VisualizationSphere format
  const sphereData = rawSphereData?.map(stake => ({
    date: new Date(stake.length * 24 * 60 * 60 * 1000).toISOString(),
    backingRatio: stake.backing
  })) || [];

  // Effect to set initial music track and pause it
  useEffect(() => {
    setCurrentTrack(SPHERES[sphereIndex].music);
    setIsPlaying(false); // Ensure music starts paused
  }, [sphereIndex, setCurrentTrack, setIsPlaying]);

  useEffect(() => {
    // Check if we should skip splash screen
    const hasSeenSplash = localStorage.getItem('hasSeenSplash');
    if (hasSeenSplash) {
      setShowSplash(false);
      setStartAnimation(true);
      setShouldPlayMusic(false); // Don't auto-play music
    }
  }, []);

  const handleEnter = () => {
    localStorage.setItem('hasSeenSplash', 'true');
    setShowSplash(false);
    setStartAnimation(true);
    setShouldPlayMusic(false); // Don't auto-play music when entering
  };

  const currentSphere = SPHERES[sphereIndex];

  if (showSplash) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-black text-white">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">LookIntoMaxi</h1>
        <p className="text-gray-400 mb-8">
          Advanced HEX & pooled staking analytics.
        </p>
        <button 
          onClick={handleEnter}
          className="bg-white text-black px-8 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors"
        >
          Enter Site
        </button>
      </div>
    );
  }

  return (
    <main className="h-screen w-full bg-black relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        {/* Sphere visualization as background */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full">
            <VisualizationSphere 
              settings={currentSphere.settings}
              type={currentSphere.type}
              showMusicPlayer={false}
            />
          </div>
        </div>

        {/* Dark gradient overlays */}
        <div className="absolute top-0 left-0 w-full h-[30vh] bg-gradient-to-b from-black to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-[30vh] bg-gradient-to-t from-black to-transparent pointer-events-none" />
      </div>

      {/* Content container */}
      <div 
        className={`relative z-10 h-full flex flex-col transition-opacity duration-1000 ${
          startAnimation ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex-1 overflow-auto px-4 py-8">
          <div className="h-full flex items-center justify-center">
            {children}
          </div>
        </div>
      </div>

      {/* Music Player */}
      {showMusicPlayer && (
        <div className="fixed bottom-20 right-4 z-[999]">
          <MusicPlayer 
            playlist={[currentSphere.music]} 
            autoPlay={false} // Set autoPlay to false
          />
        </div>
      )}
    </main>
  );
} 