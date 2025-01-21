import { Server } from 'socket.io'
import type { NextApiRequest } from 'next'
import type { Socket as NetSocket } from 'net'
import type { Server as HTTPServer } from 'http'

interface SocketServer extends HTTPServer {
  io?: Server
}

interface SocketWithIO extends NetSocket {
  server: SocketServer
}

interface NextApiResponseWithSocket extends NextApiRequest {
  socket: SocketWithIO
}

let lastPrice = 0

export default function SocketHandler(req: NextApiResponseWithSocket, res: any) {
  if (res.socket.server.io) {
    console.log('Socket already running')
    res.end()
    return
  }

  const io = new Server(res.socket.server)
  res.socket.server.io = io

  const fetchAndBroadcastPrice = async () => {
    try {
      const response = await fetch(
        'https://api.dexscreener.com/latest/dex/pairs/pulsechain/0xf1f4ee610b2babb05c635f726ef8b0c568c8dc65'
      )
      const data = await response.json()
      
      if (data.pairs?.[0]) {
        const price = parseFloat(data.pairs[0].priceUsd)
        if (price !== lastPrice) {
          lastPrice = price
          io.emit('price-update', {
            price,
            timestamp: new Date().toISOString()
          })
        }
      }
    } catch (error) {
      console.error('Error fetching price:', error)
    }
  }

  // Fetch price every 500ms
  const interval = setInterval(fetchAndBroadcastPrice, 500)

  io.on('connection', (socket) => {
    console.log('Client connected')
    
    // Send initial price
    if (lastPrice) {
      socket.emit('price-update', {
        price: lastPrice,
        timestamp: new Date().toISOString()
      })
    }

    socket.on('disconnect', () => {
      console.log('Client disconnected')
    })
  })

  console.log('WebSocket server started')
  res.end()
} 