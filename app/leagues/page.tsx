'use client'

import LeagueTable from '@/components/LeagueTable'

export default function LeaguesPage() {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {/* HEX League Table */}
          <LeagueTable tokenTicker="HEX" />
          
          {/* Add more league tables here later */}
          {/* <LeagueTable tokenTicker="PLS" /> */}
          {/* <LeagueTable tokenTicker="PLSX" /> */}
        </div>
      </div>
    </div>
  )
} 