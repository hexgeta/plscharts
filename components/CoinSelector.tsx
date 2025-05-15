import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronUp } from "lucide-react"
import { CoinLogo } from "./ui/CoinLogo"

interface CoinSelectorProps {
  onSelect: (symbol: string) => void
  currentCoin: string
}

const AVAILABLE_COINS = [
  { symbol: 'pHEX', name: 'HEX' },
  { symbol: 'TRUMP', name: 'Trump Coin', config: {
    PAIR: {
      chain: 'solana',
      pairAddress: 'A8nPhpCJqtqHdqUk35Uj9Hy2YsGXFkCZGuNwvkD3k7VC'
    }
  }}
]

export function CoinSelector({ onSelect, currentCoin }: CoinSelectorProps) {
  return (
    <div className="fixed bottom-20 right-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="bg-black bg-opacity-85 text-white/80 hover:text-white border border-white/20 rounded-[10px] shadow-lg">
            <ChevronUp className="h-4 w-4 mr-2" />
            Select Coin
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-black bg-opacity-85 border border-white/20 rounded-[10px] shadow-lg">
          {AVAILABLE_COINS.map((coin) => (
            <DropdownMenuItem
              key={coin.symbol}
              className={`text-white/80 hover:text-white hover:bg-white/10 py-2 px-4 ${
                currentCoin === coin.symbol ? 'bg-white/10' : ''
              }`}
              onClick={() => onSelect(coin.symbol)}
            >
              <div className="flex items-center gap-2">
                <CoinLogo
                  symbol={coin.name}
                  size="sm"
                  className="rounded-full"
                />
                <span>{coin.name}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 