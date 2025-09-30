'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const MarketingBanner = () => {
  const [currentBanner, setCurrentBanner] = useState(0)
  
  const banners = [
    {
      image: '/marketing-banner-1.png',
      link: 'https://lookintomaxi.com/',
      alt: 'LookIntoMaxi - Advanced HEX pooled staking stats'
    },
    {
      image: '/marketing-banner-2.png', 
      link: '/advertise',
      alt: 'PlsCharts Advertising - Place your ad here'
    },
    {
      image: '/marketing-banner-3.png',
      link: null,
      alt: 'AgoráX - Peer-to-peer pooled HEX stake trading'
    }
  ]
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => {
        const next = (prev + 1) % banners.length
        return next
      })
    }, 10000) // Rotate every 10 seconds
    
    return () => clearInterval(interval)
  }, [banners.length])

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4,
        ease: [0.23, 1, 0.32, 1]
      }}
      className="w-full px-0 py-2 hidden md:block"
    >
      <div className="max-w-5xl mx-auto px-4">
        <div className="relative w-full h-20 rounded-lg overflow-hidden border-2 border-white/10 hover:border-white/20 transition-colors duration-300 group">
          <span className="absolute top-1 right-1 text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-300 bg-gray-800/0 px-1.5 py-0.5 rounded text-[10px] font-medium z-20">AD</span>
          
          {/* Scrolling container */}
          <div 
            className="flex h-full transition-transform duration-700 ease-in-out"
            style={{ 
              transform: `translateX(-${currentBanner * (100 / banners.length)}%)`,
              width: `${banners.length * 100}%`
            }}
          >
            {banners.map((banner, index) => {
              const content = (
                <Image
                  src={banner.image}
                  alt={banner.alt}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
              )
              
              return banner.link ? (
                <Link
                  key={index}
                  href={banner.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block relative flex-shrink-0 cursor-pointer"
                  style={{ width: `${100 / banners.length}%` }}
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={index}
                  className="block relative flex-shrink-0"
                  style={{ width: `${100 / banners.length}%` }}
                >
                  {content}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );

  /* COMMENTED OUT - Original 3 ads (can revert if needed)
  return (
    <div className="w-full px-4 py-2 hidden md:block">
      <div className="grid grid-cols-3 gap-4 max-w-5xl mx-auto px-4">
        <div className="relative">
          <span className="absolute top-1 right-1 text-xs text-gray-400 bg-gray-800/0 px-1.5 py-0.5 rounded text-[10px] font-medium z-10">AD</span>
          <Link
            href="https://www.lookintomaxi.com/" target="_blank" rel="noopener noreferrer"
            className="bg-white/5 hover:bg-white/10 rounded-lg px-6 py-2.5 border-2 border-white/10 inline-block transition-all duration-200 backdrop-blur-sm text-center w-full"
          >
            <span className="text-white block font-medium">
              LookIntoMaxi<u className="hover:text-white"></u>
            </span>
            <span className="text-xs text-[rgb(153,153,153)] block font-medium">
              Advanced HEX pooled staking stats.
            </span>
          </Link>
        </div>
        
        <div className="relative">
          <span className="absolute top-1 right-1 text-xs text-gray-400 bg-gray-800/0 px-1.5 py-0.5 rounded text-[10px] font-medium z-10">AD</span>
          <Link
            href="/advertise"
            className="bg-white/5 hover:bg-white/10 rounded-lg px-6 py-2.5 border-2 border-white/10 inline-block transition-all duration-200 backdrop-blur-sm text-center w-full"
          >
            <span className="text-white block font-medium">
              Place your ad here
            </span>
            <span className="text-xs text-[rgb(153,153,153)] block font-medium">
              See all pricing plans
            </span>
          </Link>
        </div>
        
        <div className="relative">
          <span className="absolute top-1 right-1 text-xs text-gray-400 bg-gray-800/0 px-1.5 py-0.5 rounded text-[10px] font-medium z-10">AD</span>
          <Link
            href="/advertise"
            className="bg-white/5 hover:bg-white/10 rounded-xl px-6 py-2.5 border-2 border-white/10 inline-block transition-all duration-200 backdrop-blur-sm text-center w-full"
          >
            <span className="text-white block font-medium">
            Place your ad here
            </span>
            <span className="text-xs text-[rgb(153,153,153)] block font-medium">
              See all pricing plans
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
  */
};

export default MarketingBanner;