import { cn } from '@/lib/utils'

interface FontLoaderProps {
  priority?: boolean
}

export function FontLoader({ 
  priority = false 
}: FontLoaderProps) {
  return (
    <>
      {/* Primary: Departure Mono - High Priority */}
      <link
        rel="preload"
        href="/fonts/Archia/departure-mono-regular.otf"
        as="font"
        type="font/otf"
        crossOrigin="anonymous"
        fetchPriority={priority ? 'high' : 'auto'}
      />
      
      {/* Backup: Archia Regular - Lower Priority */}
      <link
        rel="preload"
        href="/fonts/Archia/archia-regular.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
        fetchPriority="low"
      />
    </>
  )
} 