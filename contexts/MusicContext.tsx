import React, { createContext, useContext, useState } from 'react';

interface MusicContextType {
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTrack: string;
  setCurrentTrack: (track: string) => void;
}

const MusicContext = createContext<MusicContextType>({
  isPlaying: false,
  setIsPlaying: () => {},
  currentTrack: '',
  setCurrentTrack: () => {},
});

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState('');

  return (
    <MusicContext.Provider value={{ isPlaying, setIsPlaying, currentTrack, setCurrentTrack }}>
      {children}
    </MusicContext.Provider>
  );
}

export const useMusic = () => useContext(MusicContext); 