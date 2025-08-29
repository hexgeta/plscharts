'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import Image from 'next/image'
import LeagueTable from './LeagueTable'

interface PopupLeagueTableProps {
  token: {
    ticker: string
    name: string
  }
  children: (onClick: () => void) => React.ReactNode // Function that takes onClick and returns the trigger element
  preloadedPrices?: any // Optional preloaded price data
  preloadedSupply?: number // Optional preloaded supply data
}

const PopupLeagueTable = React.memo(({ token, children, preloadedPrices, preloadedSupply }: PopupLeagueTableProps) => {
  const [open, setOpen] = useState(false)

  const handleClick = () => setOpen(true)

  return (
    <>
      {children(handleClick)}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-[360px] sm:max-w-lg max-h-[90vh] bg-black border-2 border-white/10 rounded-lg overflow-y-auto">
          <div className="mt-6">
            {/* Pass preloaded data if available to prevent loading flashes */}
            <LeagueTable 
              tokenTicker={token.ticker} 
              containerStyle={false}
              showLeagueNames={true}
              preloadedPrices={preloadedPrices}
              preloadedSupply={preloadedSupply}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}, (prevProps, nextProps) => {
  // Only re-render if token data or preloaded data changed
  return (
    prevProps.token.ticker === nextProps.token.ticker &&
    prevProps.token.name === nextProps.token.name &&
    prevProps.preloadedPrices === nextProps.preloadedPrices &&
    prevProps.preloadedSupply === nextProps.preloadedSupply
  )
})

PopupLeagueTable.displayName = 'PopupLeagueTable'

export default PopupLeagueTable 