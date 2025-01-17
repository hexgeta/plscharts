import React from 'react';

interface LandingPageProps {
  onEnter: () => void;
}

export default function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <div className="h-screen w-full bg-black flex flex-col items-center justify-center gap-4">
      {/* Animated equalizer bars */}
      <div className="flex items-end gap-1 mb-6">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="w-2 bg-[#00ff00] animate-pulse"
            style={{
              height: `${Math.random() * 24 + 12}px`,
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>
      
      <h1 className="text-4xl md:text-5xl font-mono text-white mb-2">
        Welcome to Pump It™
      </h1>
      
      <p className="text-gray-400 font-mono mb-8">
        The internet radio station of crypto
      </p>

      <button
        onClick={onEnter}
        className="px-8 py-2 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-all duration-300 font-mono text-xl"
      >
        Enter
      </button>
    </div>
  );
} 