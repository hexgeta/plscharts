import { Metadata } from 'next'
import CostBasisScanner from '@/components/CostBasisScanner'

export const metadata: Metadata = {
  title: 'Cost Basis Analysis - PLSCharts',
  description: 'Analyze your portfolio cost basis and profit/loss for any PulseChain address',
}

export default function CostBasisPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Cost Basis Checker</h1>
          </div>
          
          <CostBasisScanner />
        </div>
      </div>
    </div>
  )
} 