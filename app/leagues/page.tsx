'use client'

import LeagueTable from '../../components/LeagueTable'

export default function LeaguesPage() {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">Token Leagues</h1>
        
        <div className="grid grid-cols-2 gap-8">
          {/* PLS League Table */}
          <LeagueTable tokenTicker="PLS" />
          
          {/* PLSX League Table */}
          <LeagueTable tokenTicker="PLSX" />
          
          {/* INC League Table */}
          <LeagueTable tokenTicker="INC" />
          
          {/* HEX League Table */}
          <LeagueTable tokenTicker="HEX" />
          
          {/* eHEX League Table */}
          <LeagueTable tokenTicker="eHEX" />
          
          {/* HEDRON League Table */}
          <LeagueTable tokenTicker="HEDRON" />
          
          {/* ICSA League Table */}
          <LeagueTable tokenTicker="ICSA" />
          
          {/* COM League Table */}
          <LeagueTable tokenTicker="COM" />
        </div>
      </div>
    </div>
  )
} 