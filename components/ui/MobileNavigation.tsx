'use client'

import { Home, PieChart, Search } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TokenSearch } from '@/components/ui/token-search'

// Static nav configuration - could be moved to constants
const NAV_ITEMS = [
  {
    icon: Home,
    label: 'Home',
    href: '/'
  },
  {
    icon: PieChart,
    label: 'Portfolio',
    href: '/portfolio'
  },
  {
    icon: Search,
    label: 'Search',
    href: null // Special case for search - handled differently
  }
]

export default function MobileNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [activeButton, setActiveButton] = useState<string | null>(null)
  const [pressedButton, setPressedButton] = useState<string | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const handlePress = (href: string | null) => {
    const identifier = href || 'search'
    
    // Immediately clear any previous active button and set new one
    setActiveButton(identifier)
    
    if (href === null) {
      // Handle search - toggle the search state
      setIsSearchOpen(!isSearchOpen)
      // Reset search button after a moment since it doesn't navigate
      setTimeout(() => setActiveButton(null), 300)
    } else {
      router.push(href)
      // Keep it white - don't reset until user clicks another button
    }
  }

  const handleTouchStart = (identifier: string) => {
    setPressedButton(identifier)
  }

  const handleTouchEnd = () => {
    setPressedButton(null)
  }

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 w-screen bg-black/90 border-t border-white/20 z-[9999] h-[90px]">
      <div className="flex items-center justify-around py-3 px-4 w-full h-full">
        {NAV_ITEMS.map((item, index) => {
          const Icon = item.icon
          const identifier = item.href || 'search'
          const isCurrentlyActive = activeButton === identifier
          const isPageActive = item.href ? pathname === item.href : false
          const isPressed = pressedButton === identifier
          
          return (
            <motion.button
              key={item.href || `search-${index}`}
              onClick={() => handlePress(item.href)}
              onTouchStart={() => handleTouchStart(identifier)}
              onTouchEnd={handleTouchEnd}
              onMouseDown={() => handleTouchStart(identifier)}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
              className={`flex flex-col items-center justify-center p-4 rounded-lg min-w-[60px] ${
                isCurrentlyActive || isPageActive
                  ? 'text-white' 
                  : 'text-gray-400'
              }`}
              animate={{
                scale: isPressed ? 0.65 : 1,
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
                duration: 0.15
              }}
            >
              <Icon size={22} />
            </motion.button>
          )
        })}
      </div>
      
      {/* Token Search Dialog */}
      <TokenSearch open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </div>
  )
} 