import { cn } from '@/lib/utils'

interface FontLoaderProps {
  weight?: 'regular' | 'bold'
  priority?: boolean
}

export function FontLoader({ 
  weight = 'regular',
  priority = false 
}: FontLoaderProps) {
  const fontPath = `/fonts/Archia/archia-${weight}.woff2`
  
  return (
    <link
      rel="preload"
      href={fontPath}
      as="font"
      type="font/woff2"
      crossOrigin="anonymous"
      fetchPriority={priority ? 'high' : 'auto'}
    />
  )
} 