import { ReactNode, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useMusic } from '../../../contexts/MusicContext';
import { usePooledStakesData } from '../../../hooks/usePooledStakesData';

// Sphere components with consistent loading states
const MaxiSphere = dynamic(() => import("../../../pages/sphere-2/maxi"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-black" />
});

const TrioSphere = dynamic(() => import("../../../pages/sphere-2/trio"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-black" />
});

const LuckySphere = dynamic(() => import("../../../pages/sphere-2/lucky"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-black" />
});

const DeciSphere = dynamic(() => import("../../../pages/sphere-2/deci"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-black" />
});

const BaseSphere = dynamic(() => import("../../../pages/sphere-2/base"), {
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

const SPHERES = [
  { component: MaxiSphere, music: 'maxi.mp3' },
  { component: TrioSphere, music: 'trio.mp3' },
  { component: LuckySphere, music: 'lucky.mp3' },
  { component: DeciSphere, music: 'deci.mp3' },
  { component: BaseSphere, music: 'base.mp3' },
];

export default function SphereLayout({ children, showMusicPlayer = true }: SphereLayoutProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [selectedSphere, setSelectedSphere] = useState(SPHERES[0]);
  const [startAnimation, setStartAnimation] = useState(false);
  const [shouldPlayMusic, setShouldPlayMusic] = useState(false);
  const { setIsPlaying, setCurrentTrack } = useMusic();
  const { isLoading: isTableLoading } = usePooledStakesData();

  useEffect(() => {
    // Always use MAXI sphere
    setSelectedSphere(SPHERES[0]);
    setCurrentTrack(SPHERES[0].music);

    // Check if we should skip splash screen
    const hasSeenSplash = localStorage.getItem('hasSeenSplash');
    if (hasSeenSplash) {
      setShowSplash(false);
      setStartAnimation(true);
      setShouldPlayMusic(true);
    }
  }, []);

  const handleEnter = () => {
    localStorage.setItem('hasSeenSplash', 'true');
    setShowSplash(false);
    setStartAnimation(true);
    setShouldPlayMusic(true);
  };

  const SelectedSphereComponent = selectedSphere.component;

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
            <SelectedSphereComponent startAnimation={startAnimation} />
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
            playlist={[selectedSphere.music]} 
            autoPlay={shouldPlayMusic} 
          />
        </div>
      )}
    </main>
  );
} 