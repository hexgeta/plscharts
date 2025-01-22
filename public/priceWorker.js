// Configuration
const CONFIG = {
  PRICE_NOISE: 0.4,
  UPDATE_INTERVAL: 150,
  MOMENTUM_FACTOR: 0.8,
  STILL_CHANCE: 0.25,
}

let lastNoise = 0
let realPrice = 0

self.onmessage = function(e) {
  if (e.data.type === 'UPDATE_PRICE') {
    realPrice = e.data.price
  }
}

function generatePriceNoise() {
  if (!realPrice) return

  if (Math.random() >= CONFIG.STILL_CHANCE) {
    const randomNoise = (Math.random() - 0.5) * CONFIG.PRICE_NOISE
    const momentumNoise = (lastNoise * CONFIG.MOMENTUM_FACTOR) + 
                         (randomNoise * (1 - CONFIG.MOMENTUM_FACTOR))
    
    lastNoise = momentumNoise
    const newPrice = realPrice + momentumNoise
    
    self.postMessage({ 
      type: 'PRICE_UPDATE',
      price: newPrice
    })
  }
}

setInterval(generatePriceNoise, CONFIG.UPDATE_INTERVAL) 