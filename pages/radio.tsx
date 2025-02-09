import React, { useEffect, useState } from 'react';
import CryptoDashboard from '@/components/crypto-dashboard';
import MatrixBackground from '@/components/MatrixBackground';
import MusicPlayer from '@/components/MusicPlayer';
import TimeDisplay from '@/components/TimeDisplay';

const playlist = [
  '3.mp3'
];

export default function Livestream() {
  const [hasEntered, setHasEntered] = useState(false);
  const [shouldPlayMusic, setShouldPlayMusic] = useState(false);

  const handleEnter = () => {
    setHasEntered(true);
    setShouldPlayMusic(true);
  };

  return (
    <div className="radio-page min-h-screen">
      <div className="relative z-10 min-h-screen w-full flex items-start md:items-center justify-center p-4 pt-2 md:py-4">
        <div className="w-full max-w-6xl md:-mt-">
          <MatrixBackground />
          <TimeDisplay />
          <CryptoDashboard />
        </div>
      </div>
      <MusicPlayer playlist={playlist} autoPlay={shouldPlayMusic} />

      {/* Overlay */}
      {!hasEntered && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center gap-4">
          <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">MAXI Volume Radio™</h1>
            <p className="text-center text-gray-400 mb-8 max-w-xs">
              Celebrating the cheapest t-shares in Hexico to some sweet tunes
            </p>
            <button 
              onClick={handleEnter}
              className="bg-white text-black px-8 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors"
            >
              Start
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 