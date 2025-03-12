import React from 'react';
import DexTable from '@/components/DexTable';


export default function CryptoPage() {
  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-[1400px] mx-auto space-y-8">
        <DexTable />
      </div>
    </main>
  );
} 