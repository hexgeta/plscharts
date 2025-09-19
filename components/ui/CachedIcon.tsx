import React, { memo, useMemo } from 'react'
import { Icons, type IconName } from './icons'
import { cn } from '@/lib/utils'

interface CachedIconProps {
  name: IconName
  className?: string
  size?: number
  color?: string
  strokeWidth?: number
  'aria-label'?: string
}

// Icon cache to store rendered icons
const iconCache = new Map<string, React.ReactElement>()

// Generate cache key from props
const getCacheKey = (props: CachedIconProps): string => {
  return `${props.name}-${props.className || ''}-${props.size || 24}-${props.color || 'currentColor'}-${props.strokeWidth || 2}`
}

export const CachedIcon = memo<CachedIconProps>((props) => {
  const { name, className, size = 24, color = 'currentColor', strokeWidth = 2, 'aria-label': ariaLabel } = props
  
  const cachedIcon = useMemo(() => {
    const cacheKey = getCacheKey(props)
    
    // Check if icon is already cached
    if (iconCache.has(cacheKey)) {
      return iconCache.get(cacheKey)!
    }
    
    // Get the icon component
    const IconComponent = Icons[name]
    
    if (!IconComponent) {
      return null
    }
    
    // Create the icon element
    const iconElement = (
      <IconComponent
        className={cn('inline-block', className)}
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        aria-label={ariaLabel || name}
      />
    )
    
    // Cache the icon for future use
    iconCache.set(cacheKey, iconElement)
    
    return iconElement
  }, [name, className, size, color, strokeWidth, ariaLabel])
  
  return cachedIcon
})

CachedIcon.displayName = 'CachedIcon'

// Utility function to clear icon cache (useful for memory management)
export const clearIconCache = () => {
  iconCache.clear()
}

// Utility function to get cache size
export const getIconCacheSize = () => {
  return iconCache.size
} 