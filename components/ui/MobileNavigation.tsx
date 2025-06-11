'use client'

import { Home, PieChart, Crown } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'

export default function MobileNavigation() {
  const router = useRouter()
  const pathname = usePathname()

  const navItems = [
    {
      icon: Home,
      label: 'Home',
      href: '/',
      isActive: pathname === '/'
    },
    {
      icon: PieChart,
      label: 'Portfolio',
      href: '/portfolio',
      isActive: pathname === '/portfolio'
    },
    {
      icon: Crown,
      label: 'Leagues',
      href: '/leagues',
      isActive: pathname === '/leagues'
    }
  ]

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 w-screen bg-black/95 border-t border-white/20 z-[9999]">
      <div className="flex items-center justify-around py-3 px-4 w-full">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center justify-center p-4 rounded-lg transition-colors min-w-[60px] ${
                item.isActive 
                  ? 'text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={22} />
            </button>
          )
        })}
      </div>
    </div>
  )
} 