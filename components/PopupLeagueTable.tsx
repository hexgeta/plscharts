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
}

const PopupLeagueTable = React.memo(({ token, children }: PopupLeagueTableProps) => {
  const [open, setOpen] = useState(false)

  const handleClick = () => setOpen(true)

  return (
    <>
      {children(handleClick)}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl w-full max-w-[360px] sm:max-w-lg max-h-[90vh] bg-black border-2 border-white/10 rounded-lg overflow-y-auto animate-none">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.4,
              ease: [0.23, 1, 0.32, 1]
            }}
            className="mt-6"
          >
            {/* No preloaded data - will fetch individually when opened */}
            <LeagueTable 
              tokenTicker={token.ticker} 
              containerStyle={false}
              showLeagueNames={true}
            />
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  )
}, (prevProps, nextProps) => {
  // Only re-render if token data changed
  return (
    prevProps.token.ticker === nextProps.token.ticker &&
    prevProps.token.name === nextProps.token.name
  )
})

PopupLeagueTable.displayName = 'PopupLeagueTable'

export default PopupLeagueTable 