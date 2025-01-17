// import { useState } from "react"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { Button } from "@/components/ui/button"
// import { ArrowUpIcon, ArrowDownIcon, ActivityIcon, CoinsIcon, DollarSignIcon } from "lucide-react"

// // Simulated function to fetch crypto data
// const fetchCryptoData = async (ticker: string) => {
//   // In a real application, this would be an API call
//   await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API delay
  
//   if (ticker.toLowerCase() === "eth") {
//     return {
//       name: "Ethereum",
//       price: 1800.42,
//       change24h: 2.5,
//       volume24h: 15000000000,
//       marketCap: 220000000000,
//     }
//   } else if (ticker.toLowerCase() === "btc") {
//     return {
//       name: "Bitcoin",
//       price: 30000.00,
//       change24h: -1.2,
//       volume24h: 25000000000,
//       marketCap: 580000000000,
//     }
//   } else {
//     throw new Error("Invalid ticker")
//   }
// }

// export default function Component() {
//   const [ticker, setTicker] = useState("")
//   const [cryptoData, setCryptoData] = useState<any>(null)
//   const [isLoading, setIsLoading] = useState(false)
//   const [error, setError] = useState<string | null>(null)

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setIsLoading(true)
//     setError(null)
//     try {
//       const data = await fetchCryptoData(ticker)
//       setCryptoData(data)
//     } catch (err) {
//       setError("Failed to fetch data. Please check the ticker and try again.")
//       setCryptoData(null)
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   return (
//     <Card className="w-full max-w-3xl mx-auto">
//       <CardHeader>
//         <CardTitle>Crypto Tracker</CardTitle>
//         <CardDescription>Enter an EVM blockchain ticker to view stats</CardDescription>
//       </CardHeader>
//       <CardContent>
//         <form onSubmit={handleSubmit} className="flex space-x-2 mb-4">
//           <Input
//             placeholder="Enter ticker (e.g., ETH, BTC)"
//             value={ticker}
//             onChange={(e) => setTicker(e.target.value)}
//             className="flex-grow"
//           />
//           <Button type="submit" disabled={isLoading}>
//             {isLoading ? "Loading..." : "Track"}
//           </Button>
//         </form>

//         {error && <p className="text-red-500 mb-4">{error}</p>}

//         {cryptoData && (
//           <div className="grid grid-cols-2 gap-4">
//             <Card>
//               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                 <CardTitle className="text-sm font-medium">Name</CardTitle>
//                 <CoinsIcon className="h-4 w-4 text-muted-foreground" />
//               </CardHeader>
//               <CardContent>
//                 <div className="text-2xl font-bold">{cryptoData.name}</div>
//               </CardContent>
//             </Card>
//             <Card>
//               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                 <CardTitle className="text-sm font-medium">Price</CardTitle>
//                 <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
//               </CardHeader>
//               <CardContent>
//                 <div className="text-2xl font-bold">${cryptoData.price.toFixed(2)}</div>
//               </CardContent>
//             </Card>
//             <Card>
//               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                 <CardTitle className="text-sm font-medium">24h Change</CardTitle>
//                 {cryptoData.change24h >= 0 ? (
//                   <ArrowUpIcon className="h-4 w-4 text-green-500" />
//                 ) : (
//                   <ArrowDownIcon className="h-4 w-4 text-red-500" />
//                 )}
//               </CardHeader>
//               <CardContent>
//                 <div className={`text-2xl font-bold ${cryptoData.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
//                   {cryptoData.change24h.toFixed(2)}%
//                 </div>
//               </CardContent>
//             </Card>
//             <Card>
//               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                 <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
//                 <ActivityIcon className="h-4 w-4 text-muted-foreground" />
//               </CardHeader>
//               <CardContent>
//                 <div className="text-2xl font-bold">${(cryptoData.volume24h / 1e9).toFixed(2)}B</div>
//               </CardContent>
//             </Card>
//             <Card className="col-span-2">
//               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                 <CardTitle className="text-sm font-medium">Market Cap</CardTitle>
//                 <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
//               </CardHeader>
//               <CardContent>
//                 <div className="text-2xl font-bold">${(cryptoData.marketCap / 1e9).toFixed(2)}B</div>
//               </CardContent>
//             </Card>
//           </div>
//         )}
//       </CardContent>
//     </Card>
//   )
// }