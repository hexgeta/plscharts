'use client'

import LeagueTable from '../../components/LeagueTable'

export default function LeaguesPage() {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-none mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">Token Leagues</h1>
        
        {/* Auto-arranging Grid */}
        <div className="flex flex-wrap gap-8 max-w-7xl mx-auto">
          <div className="flex-1 min-w-0">
            <LeagueTable tokenTicker="PLSX" />
          </div>
          <div className="flex-1 min-w-0">
            <LeagueTable tokenTicker="INC" />
          </div>
          <div className="flex-1 min-w-0">
            <LeagueTable tokenTicker="HEX" />
          </div>
          <div className="flex-1 min-w-0">
            <LeagueTable tokenTicker="eHEX" />
          </div>
          <div className="flex-1 min-w-0">
            <LeagueTable tokenTicker="HEDRON" />
          </div>
          <div className="flex-1 min-w-0">
            <LeagueTable tokenTicker="ICSA" />
          </div>
          <div className="flex-1 min-w-0">
            <LeagueTable tokenTicker="COM" />
          </div>
        </div>
      </div>
    </div>
  )
} 