'use client'

import React from 'react'
import Image from 'next/image'

interface TokenCardProps {
  token: {
    ticker: string
    name: string
  }
  onClick?: () => void
}

const TokenCard = React.memo(React.forwardRef<HTMLDivElement, TokenCardProps>(({ token, onClick }, ref) => {
  return (
    <div
      ref={ref}
      onClick={onClick}
      className="bg-black border border-2 border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-gray-800/50 transition-all duration-200 flex flex-col items-center gap-3 w-full"
    >
      <div className="w-12 h-12 relative">
        <Image
          src={`/coin-logos/${token.ticker}.svg`}
          alt={token.name}
          width={48}
          height={48}
          className="rounded-full"
          onError={(e) => {
            // Fallback to a default icon if logo doesn't exist
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
      <div className="text-center">
        <div className="font-semibold text-sm">{token.ticker}</div>
        <div className="text-xs text-gray-400 truncate">{token.name}</div>
      </div>
    </div>
  )
}), (prevProps, nextProps) => {
  // Only re-render if token data changed
  return (
    prevProps.token.ticker === nextProps.token.ticker &&
    prevProps.token.name === nextProps.token.name &&
    prevProps.onClick === nextProps.onClick
  )
})

TokenCard.displayName = 'TokenCard'

export default TokenCard 