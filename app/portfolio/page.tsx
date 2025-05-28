'use client';

import { useState } from 'react'
import Portfolio from '@/components/Portfolio'

export default function PortfolioPage() {
    return (
    <div className="bg-black text-white min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">📊 Portfolio Tracker</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Track your cryptocurrency portfolio across Ethereum and PulseChain. 
            Check balances for multiple addresses and get a comprehensive view of your holdings.
          </p>
            </div>

        <div className="space-y-8">
          {/* Portfolio Component */}
          <Portfolio />
        </div>
      </div>
    </div>
  )
} 