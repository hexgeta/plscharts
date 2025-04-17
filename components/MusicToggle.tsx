'use client'

import { useState, useEffect } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

export function MusicToggle() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audioElement = new Audio('/music/ambient.mp3') // Replace with your music file path
    audioElement.loop = true
    setAudio(audioElement)

    return () => {
      audioElement.pause()
      audioElement.src = ''
    }
  }, [])

  const toggleMusic = () => {
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  return (
    <button
      onClick={toggleMusic}
      className="fixed top-6 right-6 z-999 p-3 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 hover:bg-black/40 transition-colors"
      aria-label="Toggle music"
    >
      {isPlaying ? (
        <Volume2 className="w-6 h-6 text-white" />
      ) : (
        <VolumeX className="w-6 h-6 text-white" />
      )}
    </button>
  )
} 