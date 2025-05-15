import { useEffect, useRef } from 'react'

interface AudioPlayerProps {
  src: string
  preload?: 'none' | 'metadata' | 'auto'
  onLoad?: () => void
  onError?: (error: Error) => void
}

const AUDIO_CACHE = new Set<string>()

export function preloadAudio(src: string) {
  if (AUDIO_CACHE.has(src)) return

  const audio = new Audio()
  audio.src = src
  audio.preload = 'auto'
  AUDIO_CACHE.add(src)
}

export function AudioPlayer({ 
  src, 
  preload = 'auto',
  onLoad,
  onError 
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoad = () => {
      AUDIO_CACHE.add(src)
      onLoad?.()
    }

    const handleError = () => {
      onError?.(new Error(`Failed to load audio: ${src}`))
    }

    audio.addEventListener('loadeddata', handleLoad)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('loadeddata', handleLoad)
      audio.removeEventListener('error', handleError)
    }
  }, [src, onLoad, onError])

  return (
    <audio 
      ref={audioRef}
      src={src}
      preload={preload}
    />
  )
} 