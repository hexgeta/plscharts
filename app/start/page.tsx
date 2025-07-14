import AddressScanner from '@/components/AddressScanner'

export default function StartPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container border-none mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto">
          <AddressScanner />
        </div>
      </div>
    </div>
  )
} 