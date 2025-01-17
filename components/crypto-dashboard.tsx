import { CryptoCard } from './crypto-card'

export default function CryptoDashboard() {
  return (
    <div className="bg-transparent p-0">
      <div className="max-w-7xl mx-auto space-y-4 mb-0">
        {/* HEX card - full width with wide variant */}
        <div className="w-full">
          <CryptoCard 
            variant="wide"
            data={{ symbol: "pHEX" }} 
          />
        </div>

        {/* Grid for 5 tokens */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <CryptoCard data={{ symbol: "pMAXI" }} />
          <CryptoCard data={{ symbol: "pDECI" }} />
          <CryptoCard data={{ symbol: "pLUCKY" }} />
          <CryptoCard data={{ symbol: "pTRIO" }} />
          <CryptoCard data={{ symbol: "pBASE" }} />
        </div>

        <div className="w-full">
          <CryptoCard 
            variant="wide"
            data={{ symbol: "eHEX" }} 
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <CryptoCard data={{ symbol: "eMAXI" }} />
          <CryptoCard data={{ symbol: "eDECI" }} />
          <CryptoCard data={{ symbol: "eLUCKY" }} />
          <CryptoCard data={{ symbol: "eTRIO" }} />
          <CryptoCard data={{ symbol: "eBASE" }} />
        </div>
      </div>
    </div>
  )
}

