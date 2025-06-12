'use client'

import { Home, PieChart, Search } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
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
  const [pressedButton, setPressedButton] = useState<string | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const handlePress = (href: string | null) => {
    if (href === null) {
      // Handle search - toggle the search state
      setIsSearchOpen(!isSearchOpen)
      setPressedButton('search')
      setTimeout(() => setPressedButton(null), 150)
    } else {
      setPressedButton(href)
      router.push(href)
      setTimeout(() => setPressedButton(null), 150)
    }
  }

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 w-screen bg-black/90 border-t border-white/20 z-[9999] h-[90px]">
      <div className="flex items-center justify-around py-3 px-4 w-full h-full">
        {NAV_ITEMS.map((item, index) => {
          const Icon = item.icon
          const isActive = item.href ? pathname === item.href : false
          const isPressed = item.href ? pressedButton === item.href : pressedButton === 'search'
          
          return (
            <button
              key={item.href || `search-${index}`}
              onClick={() => handlePress(item.href)}
              onTouchStart={() => setPressedButton(item.href || 'search')}
              onTouchEnd={() => setTimeout(() => setPressedButton(null), 100)}
              className={`flex flex-col items-center justify-center p-4 rounded-lg transition-colors duration-75 min-w-[60px] ${
                isActive || isPressed
                  ? 'text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={22} />
            </button>
          )
        })}
      </div>
      
      {/* Token Search Dialog */}
      <TokenSearch open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </div>
  )
} 