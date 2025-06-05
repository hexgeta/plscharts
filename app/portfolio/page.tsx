'use client';

import { useState } from 'react'
import Portfolio from '@/components/Portfolio'

export default function PortfolioPage() {
    return (
    <div className="bg-black text-white min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-0">
            </div>

        <div className="space-y-0">
          {/* Portfolio Component */}
          <Portfolio />
        </div>
      </div>
    </div>
  )
} 