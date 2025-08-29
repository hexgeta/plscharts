'use client'

import { Suspense } from 'react'
import CoinsTable from '@/components/CoinsTable'

export default function CoinsPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center my-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Coins
          </h1>
        </div>
        
        <Suspense fallback={
          <div className="flex justify-center items-center h-64">
            <div className="text-white">Loading coins...</div>
          </div>
        }>
          <CoinsTable />
        </Suspense>
      </div>
    </div>
  )
}
