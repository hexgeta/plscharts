'use client'

import { useState } from 'react'
import Bridge from '@/components/bridges'

export default function BridgePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">

          {/* Bridge Balance Checker Component */}
          <Bridge />
        </div>
      </div>
    </div>
  )
} 