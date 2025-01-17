import React, { useState, useRef, useEffect } from 'react';
import { getAudioUrl, testSupabaseConnection } from '@/utils/supabaseStorage';

interface MusicPlayerProps {
  playlist: string[];
  autoPlay?: boolean;
}

export default function MusicPlayer({ playlist, autoPlay = false }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [audioUrls, setAudioUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const init = async () => {
      const isConnected = await testSupabaseConnection();
      if (!isConnected) {
        console.error('Failed to connect to Supabase storage');
        return;
      }

      setIsLoading(true);
      const urls = await Promise.all(
        playlist.map(async (fileName) => {
          const url = await getAudioUrl(fileName);
          return url || '';
        })
      );
      setAudioUrls(urls.filter(url => url !== ''));
      setIsLoading(false);
    };

    init();
  }, [playlist]);

  // Handle autoPlay
  useEffect(() => {
    if (autoPlay && !isPlaying && audioRef.current && !isLoading) {
      fadeAudio(true);
      setIsPlaying(true);
    }
  }, [autoPlay, isLoading]);

  const fadeAudio = (fadeIn: boolean) => {
    if (!audioRef.current) return;

    // Clear any existing fade
    if (fadeInterval.current) {
      clearInterval(fadeInterval.current);
    }

    const audio = audioRef.current;
    const fadeStep = 0.05;
    const interval = 50; // 50ms between volume changes

    if (fadeIn) {
      audio.volume = 0;
      audio.play();
    }

    fadeInterval.current = setInterval(() => {
      if (!audio) return;

      if (fadeIn) {
        if (audio.volume + fadeStep <= 1) {
          audio.volume = Math.min(1, audio.volume + fadeStep);
        } else {
          clearInterval(fadeInterval.current);
        }
      } else {
        if (audio.volume - fadeStep >= 0) {
          audio.volume = Math.max(0, audio.volume - fadeStep);
        } else {
          audio.pause();
          audio.volume = 1; // Reset volume for next play
          clearInterval(fadeInterval.current);
        }
      }
    }, interval);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        fadeAudio(false);
      } else {
        fadeAudio(true);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTrackEnd = () => {
    setCurrentTrackIndex((prevIndex) => (prevIndex + 1) % audioUrls.length);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fadeInterval.current) {
        clearInterval(fadeInterval.current);
      }
    };
  }, []);

  // Handle track changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      if (isPlaying) {
        fadeAudio(true);
      }
    }
  }, [currentTrackIndex]);

  if (isLoading || audioUrls.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-2 right-2 z-20">
      <button
        onClick={togglePlay}
        className="text-white/50 hover:text-white p-3 rounded-full transition-all w-12 h-12 flex items-center justify-center"
      >
        {isPlaying ? (
          <div className="flex space-x-[3px]">
            <div className="w-[3px] h-[14px] bg-current rounded-sm"></div>
            <div className="w-[3px] h-[14px] bg-current rounded-sm"></div>
          </div>
        ) : (
          <div className="ml-[2px] w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-current border-b-[8px] border-b-transparent"></div>
        )}
      </button>
      <audio ref={audioRef} onEnded={handleTrackEnd}>
        <source src={audioUrls[currentTrackIndex]} type="audio/mp3" />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
} 