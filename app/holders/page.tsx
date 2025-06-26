'use client';

import { HexHoldersTable } from '@/components/HexHoldersTable';

export default function HoldersPage() {
  return (
    <main className="container max-w-7xl mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">HEX Holders</h1>
          <p className="text-muted-foreground">
            View the top 100 HEX holders on PulseChain, ranked by balance. Data updates every 5 minutes.
          </p>
        </div>

        {/* Table Section */}
        <div className="space-y-4">
          <HexHoldersTable />
        </div>
      </div>
    </main>
  );
} 