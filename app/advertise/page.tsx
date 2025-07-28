'use client';

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function AdvertisePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="bg-black h-screen" />;
  }

  return (
    <div className="min-h-screen max-w-5xl mx-auto bg-black text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent">
            Advertise on PlsCharts
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
            Reach thousands of active PulseChain traders, investors, and DeFi enthusiasts daily
          </p>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-12 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className="text-2xl md:text-3xl font-bold text-gray-500 line-through">$150</span>
              <div className="text-4xl md:text-6xl font-bold text-green-400">$75/week</div>
            </div>
            <p className="text-lg text-gray-300">Homepage Banner</p>
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 max-w-4xl mx-auto"
        >
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center backdrop-blur-sm">
            <div className="text-3xl font-bold text-blue-400 mb-2">450</div>
            <p className="text-gray-300">Daily Active Users</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center backdrop-blur-sm">
            <div className="text-3xl font-bold text-purple-400 mb-2">10,000+</div>
            <p className="text-gray-300">Page Views per Month</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center backdrop-blur-sm">
            <div className="text-3xl font-bold text-green-400 mb-2">5 min+</div>
            <p className="text-gray-300">Avg visit duration</p>
          </div>
        </motion.div>

        {/* Features Section */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-4xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Why Advertise with Us?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-2xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-3">Targeted Audience</h3>
              <p className="text-gray-300">Reach serious PulseChain traders and investors who are actively looking for new opportunities and projects.</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-2xl mb-4">📈</div>
              <h3 className="text-xl font-semibold mb-3">High Engagement</h3>
              <p className="text-gray-300">Our users spend significant time analyzing charts, portfolios, and market data - perfect for your message.</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-2xl mb-4">💎</div>
              <h3 className="text-xl font-semibold mb-3">Premium Placement</h3>
              <p className="text-gray-300">Your ads appear prominently on our homepage and key pages, ensuring maximum visibility.</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-2xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-3">Performance Tracking</h3>
              <p className="text-gray-300">Get detailed analytics on impressions, clicks, and engagement to measure your ROI.</p>
            </div>
          </div>
        </motion.div>


        {/* CTA Section */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Join leading PulseChain projects that trust PlsCharts to reach their audience
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="https://x.com/hexgeta" target="_blank" rel="noopener noreferrer"
              className="bg-white hover:black text-black font-semibold py-4 px-8 rounded-full transition-all duration-200 transform shadow-lg"
            >
              Contact Hexgeta on X/Twitter
            </Link>

          </div>
          
          <p className="text-sm text-gray-400 mt-6">
            Slots are limited. Book your campaign today to secure premium placement.
          </p>
        </motion.div>
      </div>
    </div>
  )
} 