'use client'

import Portfolio from '@/components/Portfolio'

interface AddressPageProps {
  params: {
    address: string
  }
}

export default function AddressPage({ params }: AddressPageProps) {
  const { address } = params
  
  // Validate address format (basic check)
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Address</h1>
          <p className="text-gray-400">Please provide a valid Ethereum/PulseChain address.</p>
          <p className="text-sm text-gray-500 mt-2">Format: 0x followed by 40 hexadecimal characters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 px-4">
      <Portfolio 
        detectiveMode={true}
        detectiveAddress={address}
      />
    </div>
  )
} 