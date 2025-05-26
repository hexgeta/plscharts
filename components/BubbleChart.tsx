'use client'

import { useEffect, useRef, useState } from 'react'
import { Engine, Render, Bodies, World, Runner, Body } from 'matter-js'
import { useRouter } from 'next/navigation'
import { TOKEN_CONSTANTS } from '@/constants/crypto'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'

// List of supported tickers based on available logos
const SUPPORTED_TICKERS = [
  'UFO',
  'WETH',
  'WBNB',
  'eWBTC',
  'pSTETH',
  'TRUMP',
  'LAUNCH',
  'TEAM',
  'pTON',
  'IMPLS',
  'LUCKY',
  'eLUCKY',
  'eTRIO',
  'eBASE',
  'eUNI',
  'eLINK',
  'ATROPA',
  'POKB',
  'AMPL',
  'eLINK',
  'POPPY',
  'SPARK',
  'WAIT',
  'H2O',
  'HOA',
  'PINU',
  'PHIAT',
  'MINT',
  'MAXI',
  'PHAME',
  'PLN',
  'eGRT',
  'HDRN',
  'PP',
  'MORE',
  'ePEPE',
  'eICSA',
  'GOAT',
  'NBA',
  'AXIS',
  'DECI',
  'eDECI',
  'eMAXI',
  'DWB',
  'ASIC',
  'DAI',
  'DEX',
  'OPHIR',
  'HOC',
  'FLEX',
  'eUSDC',
  'eSHIB',
  'eUSDC',
  'CEREAL',
  'EARN',
  'RH404',
  'BFF',
  'GENI',
  'PLSB',
  'TEXAN',
  'RFX',
  'VRX',
  'DRS',
  'PNS',
  'BTR',
  'BRO',
  'PRS',
  'ZKZX',
  'PLSC',
  'NOPE',
  'MIKE',
  'TETRA',
  'ICSA',
  'YFI',
  // Adding all tokens from TOKEN_CONSTANTS (with clean tickers)
  'ETH',
  'BASE',
  'TRIO',
  'PARTY',
  'WPLS',
  // 'COM',
  'IM',
  // 'XEN',
  // 'DXN',
  '9INCH',
  'BBC',
  'LOVE',
  // 'GOFURS',
  'USDC',
  'USDT',
  'BUSD',
  'TUSD',
  'USDP',
  'LUSD',
  'GUSD',
  'EURS',
  'pSHIB',
  // 'APE',
  'pPEPE',
  'pUNI',
  '1INCH',
  // 'SUSHI',
  'pAAVE',
  'pCOMP',
  'pCRV',
  'pMKR',
  'eMKR',
  'pLDO',
  // 'rETH',
  // 'sDAI',
  // 'CREAM',
  // 'MATIC',
  'ARB',
  // 'PAXG',
  // 'XAUt',
  'pWBTC',
  'pMANA',
  'pSAND',
  'pLINK',
  'pBAT',
  // 'GRT',
  'pTON',
  'pENS',
  // 'SAFE',
  // 'PRE',
  'LUNR',
  // 'RNDR',
  // 'WISE',
  'pFET',
  // 'IMX',
  'PLS',
  'PLSX',
  'HEX',
  'INC',
  'POLY',
  'wICSA',
  'CST',
  'USDL',
  'PXDC',
  'HEXDC',
  'PHL',
  'TSFi',
  'SOLIDX',
  'FIRE',
  'PLSP',
  'SUN',
  'SOIL',
  'BEAR',
  'TBILL',
  'MONAT',
  'A1A',
  'LEGAL',
  'TWO',
  'TYRH',
  'PTS',
  'DAIX',
  // 'CAVIAR',
  '9MM',
  // 'PDRIP',
  'SSH',
  'LOAN',
  // 'WATT',
  'iBURN',
  'vPLS',
  'PTP',
  'PZEN',
  'HELGO',
  'UP',
  'UPX',
  // 'DOWN',
  'APC',
  // 'DMND',
  // 'BAANA',
  'TGC',
  'ALIEN',
  'BLAST',
  'MAGIC',
  'HARD',
  'ICARUS',
  'PUMP',
  'MOST',
  'PEAR',
  // 'CHIITAN',
  'COOKIES',
  // 'PEACH',
  'PINU2',
  'DOGE',
  'PLSD',
  'TIME',
  'CRO',
  'GNO',
  'BAL',
  'OKB',
  'AMPL',
  // 'BTT'
].sort();

interface BubbleContent {
  ticker: string
  subtitle: string
  color: string
  percent: number
  logo?: string | null
}

interface BubbleBody {
  body: Matter.Body
  content: BubbleContent
}

// Configuration object for bubble parameters
const BUBBLE_CONFIG = {
  // Overall size multiplier for all bubbles (higher = bigger bubbles)
  // Recommended range: 0.5 - 2.0
  baseScale: 0.3,
  
  // How bubble sizes scale with price changes
  // Options: 'linear' (1:1), 'log' (compressed), 'log2' (more compressed), 'log3' (most compressed)
  sizeScale: 'linear',  // Changed to linear for more dramatic size differences
  
  // Time frame scaling factors
  timeFrameScales: {
    h1: 0.8,   // 1H: larger scale for small changes
    h6: 0.5,   // 6H: medium scale
    h24: 0.4   // 24H: smaller scale for large changes
  },
  
  // Device scaling factors
  deviceScales: {
    mobile: 0.7,      // Mobile: 70% of desktop size
    desktop: 1.0,     // Desktop: full size
    breakpoint: 768   // Mobile breakpoint in pixels
  },
  
  // Physics parameters
  physics: {
    restitution: 0.0,     // Bounciness (0-1)
    friction: 0,          // Surface friction (0-1)
    frictionAir: 0.001,   // Air resistance (0-1) - increased to slow bubbles over time
    density: 1,           // Mass relative to size (0.1-10)
    forceScale: 0.001,     // Random force strength (0.001-0.1) - reduced for gentler movement
    forceFrequency: 0.8,  // How often forces apply (0-1) - reduced for less chaotic movement
    initialVelocity: 3,   // Starting speed multiplier (0.1-5)
    maxVelocity: 5,       // Maximum ongoing speed (0.1-10) - NEW: limits top speed
    minVelocity: 0.1,     // Minimum ongoing speed (0.01-1.0) - NEW: ensures bubbles keep moving
    velocityDamping: 1 // Velocity damping factor (0.9-1.0) - NEW: gradually slows bubbles
  },
  
  // Initial positioning and velocity
  initial: {
    position: {
      margin: 0,        // Space from edges (0-200px)
      randomness: 0.8   // Position spread (0-1)
    },
    velocity: {
      min: 0.2,         // Min starting speed (0-5)
      max: 3,           // Max starting speed (min-10)
      randomness: 0.4   // Velocity variation (0-1)
    }
  },
  
  // Size constraints (in pixels)
  size: {
    min: 10,            // Smallest possible bubble (10-50px)
    max: 100,           // Largest possible bubble (50-200px)
  },

  // Space utilization
  spacing: {
    density: 1,       // How packed the bubbles are (0.1-1.0)
    padding: 5          // Min space between bubbles (0-50px)
  }
}

// Size scaling functions
const sizeScalingFunctions = {
  linear: (change: number) => Math.abs(change),
  log: (change: number) => Math.log(Math.abs(change) + 1),
  log2: (change: number) => Math.log2(Math.abs(change) + 1),
  log3: (change: number) => Math.log10(Math.abs(change) + 1)
}

const getColorByChange = (change: number): string => {
  if (change < 0) return '#ff0000'      // Bright red for negative changes
  if (change === 0) return '#666666'    // Gray for no change
  return '#00ff00'                      // Bright green for positive changes
}

const formatNumber = (num: number): string => {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K'
  return num.toFixed(1)
}

const formatPercent = (percent: number): string => {
  if (percent > 0) return '+' + percent.toFixed(2) + '%'
  return percent.toFixed(2) + '%'
}

const getLogoPath = (ticker: string): string | null => {
  // Use the exact ticker name for the logo path
  return `/coin-logos/${ticker}.svg`;
}

export default function BubbleChart() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef(Engine.create({
    gravity: { x: 0, y: 0 },
    enableSleeping: false
  }))
  const [bubbles, setBubbles] = useState<BubbleBody[]>([])
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 })
  const [isClient, setIsClient] = useState(false)
  
  // Add state to control initial price fetching
  const [hasInitialData, setHasInitialData] = useState(false)
  const [initialPrices, setInitialPrices] = useState<Record<string, { price: number; priceChange: { m5?: number; h1?: number; h6?: number; h24?: number } }> | null>(null)
  
  // Add state for time frame selection
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<'h1' | 'h6' | 'h24'>('h24')

  // Set client-side flag
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Get all valid tokens from TOKEN_CONSTANTS, filtering out tokens without valid DEX addresses
  const validTokens = TOKEN_CONSTANTS
    .filter(token => {
      // Remove 'p' or 'e' prefix for comparison
      const cleanTicker = token.ticker.replace(/^[pe]/, '');
      
      // Check if the token is in our supported list and has valid DEX addresses
      const dexs = token.dexs;
      const isValid = SUPPORTED_TICKERS.includes(cleanTicker) && 
                     dexs && 
                     dexs !== '0x0' && 
                     dexs.length > 0 && 
                     dexs[0] !== '0x0';
      
      console.log(`[Token Debug] ${token.ticker}:`, {
        cleanTicker,
        supported: SUPPORTED_TICKERS.includes(cleanTicker),
        chain: token.chain,
        dexs,
        isValid,
        name: token.name,
        address: token.a
      });
      
      return isValid;
    })
    .map(token => token.ticker); // Just get the tickers

  console.log('[Valid Tokens]', validTokens);

  // Only fetch prices if we don't have initial data yet
  console.log('[Debug] About to call useTokenPrices with:', hasInitialData ? [] : validTokens, 'hasInitialData:', hasInitialData);
  const { prices, isLoading } = useTokenPrices(hasInitialData ? [] : validTokens);

  // Store initial prices once loaded
  useEffect(() => {
    if (!hasInitialData && prices && !isLoading && Object.keys(prices).length > 0) {
      console.log('Setting initial price data:', prices);
      setInitialPrices(prices);
      setHasInitialData(true);
    }
  }, [prices, isLoading, hasInitialData]);

  // Use initial prices for all subsequent operations
  const activePrices = initialPrices || prices;

  // Debug prices
  useEffect(() => {
    if (activePrices) {
      console.log('Active price data:', activePrices);
      console.log('Tokens with valid data:', 
        Object.entries(activePrices)
          .filter(([_, data]) => data.price > 0 && data.priceChange.h24 !== undefined)
          .map(([ticker, data]) => `${ticker}: $${data.price}`)
      );
    }
  }, [activePrices]);

  // Determine if we should show loading
  const showLoading = !hasInitialData || isLoading || !activePrices || Object.keys(activePrices || {}).length === 0;

  // Detect if we're in Chrome dev tools mobile simulation - only on client side
  const isDevToolsSimulation = isClient && 
    windowDimensions.width < 768 && 
    typeof window !== 'undefined' && 
    window.navigator.userAgent.includes('Chrome') && 
    !('ontouchstart' in window);
  
  // Early return for problematic mobile simulation
  if (isDevToolsSimulation && windowDimensions.width > 0) {
    return (
      <div className="relative w-full h-screen bg-black overflow-hidden no-select flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl mb-4">Mobile Preview</h2>
          <p className="text-gray-400">Please view on actual mobile device or desktop</p>
          <p className="text-gray-400 text-sm mt-2">Chrome dev tools mobile simulation may cause performance issues</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!containerRef.current || !windowDimensions.width || !windowDimensions.height || !activePrices || (!hasInitialData && isLoading)) return;

    const engine = engineRef.current;
    const height = windowDimensions.height - 20;
    const width = windowDimensions.width;

    // Clear any existing walls (but keep bubbles)
    engine.world.bodies
      .filter(body => body.isStatic)
      .forEach(wall => World.remove(engine.world, wall));

    // Create walls with visible properties
    const wallThickness = 10;
    const wallOptions = {
      isStatic: true,
      render: {
        fillStyle: '#000000',
        strokeStyle: '#333333',
        lineWidth: 1
      }
    };

    const walls = [
      // Top wall (positioned to be visible)
      Bodies.rectangle(width / 2, wallThickness / 2, width, wallThickness, {
        ...wallOptions,
        label: 'wall-top'
      }),
      // Bottom wall (positioned to be visible)
      Bodies.rectangle(width / 2, height - wallThickness / 2, width, wallThickness, {
        ...wallOptions,
        label: 'wall-bottom'
      }),
      // Left wall (positioned to be visible)
      Bodies.rectangle(wallThickness / 2, height / 2, wallThickness, height, {
        ...wallOptions,
        label: 'wall-left'
      }),
      // Right wall (positioned to be visible)
      Bodies.rectangle(width - wallThickness / 2, height / 2, wallThickness, height, {
        ...wallOptions,
        label: 'wall-right'
      })
    ];

    // Add walls to world
    World.add(engine.world, walls);

    // Process bubble data first
    const bubbleData = Object.entries(activePrices)
      .filter(([_, data]) => data.price > 0 && data.priceChange[selectedTimeFrame] !== undefined)
      .map(([ticker, data]) => {
        const relativeChange = Math.abs(data.priceChange[selectedTimeFrame] || 0);
        const maxChange = Math.max(...Object.values(activePrices)
          .filter(p => p.price > 0 && p.priceChange[selectedTimeFrame] !== undefined)
          .map(p => Math.abs(p.priceChange[selectedTimeFrame] || 0)));

        const scalingFunc = sizeScalingFunctions[BUBBLE_CONFIG.sizeScale];
        const normalizedChange = scalingFunc(relativeChange) / scalingFunc(maxChange);
        const sizeRange = BUBBLE_CONFIG.size.max - BUBBLE_CONFIG.size.min;
        
        // Dynamic base scale based on time frame
        const timeFrameScale = BUBBLE_CONFIG.timeFrameScales[selectedTimeFrame];
        
        // Mobile vs Desktop scaling
        const isMobile = windowDimensions.width < BUBBLE_CONFIG.deviceScales.breakpoint;
        const deviceScale = isMobile ? BUBBLE_CONFIG.deviceScales.mobile : BUBBLE_CONFIG.deviceScales.desktop;
        
        // Combined scaling
        const dynamicBaseScale = timeFrameScale * deviceScale;
        
        const radius = BUBBLE_CONFIG.size.min + (sizeRange * normalizedChange * dynamicBaseScale);

        return {
          ticker,
          radius,
          content: {
            ticker,
            subtitle: ticker,
            color: getColorByChange(data.priceChange[selectedTimeFrame] || 0),
            percent: data.priceChange[selectedTimeFrame] || 0
          }
        };
      });

    // Update existing bubbles or create new ones
    const existingBodies = engine.world.bodies.filter(b => b.label && !b.label.startsWith('wall-'));
    const existingTickers = new Set(existingBodies.map(b => b.label));
    const newBubbleData = bubbleData.filter(d => !existingTickers.has(d.ticker));
    
    // Update existing bubbles
    existingBodies.forEach(body => {
      const matchingBubble = bubbleData.find(d => d.ticker === body.label);
      if (matchingBubble) {
        // Preserve position and velocity while updating radius if needed
        const currentVelocity = body.velocity;
        const currentPosition = body.position;
        
        const currentRadius = (body as Matter.Body & { circleRadius: number }).circleRadius;
        if (currentRadius && currentRadius !== matchingBubble.radius) {
          Body.scale(body, matchingBubble.radius / currentRadius, matchingBubble.radius / currentRadius);
        }
        
        // Ensure bubbles stay within bounds
        const boundedX = Math.min(Math.max(currentPosition.x, wallThickness + matchingBubble.radius), 
                                width - wallThickness - matchingBubble.radius);
        const boundedY = Math.min(Math.max(currentPosition.y, wallThickness + matchingBubble.radius), 
                                height - wallThickness - matchingBubble.radius);
        
        Body.setPosition(body, { x: boundedX, y: boundedY });
        Body.setVelocity(body, currentVelocity);
      } else {
        // Remove bubbles that no longer exist in the data
        World.remove(engine.world, body);
      }
    });

    // Create new bubbles
    if (newBubbleData.length > 0) {
      const newBodies = newBubbleData.map(data => {
        // Position new bubbles away from walls
        const margin = wallThickness + data.radius;
        const randomRange = BUBBLE_CONFIG.initial.position.randomness;
        const x = margin + (width - 2 * margin) * (0.5 + (Math.random() - 0.5) * randomRange);
        const y = margin + (height - 2 * margin) * (0.5 + (Math.random() - 0.5) * randomRange);
        
        return Bodies.circle(x, y, data.radius, {
          restitution: BUBBLE_CONFIG.physics.restitution,
          friction: BUBBLE_CONFIG.physics.friction,
          frictionAir: BUBBLE_CONFIG.physics.frictionAir,
          density: BUBBLE_CONFIG.physics.density,
          label: data.ticker,
          inertia: Infinity,
          inverseInertia: 0
        });
      });

      World.add(engine.world, newBodies);

      // Apply initial velocities to new bubbles only
      newBodies.forEach(body => {
        const { min, max, randomness } = BUBBLE_CONFIG.initial.velocity;
        const baseVelocity = min + Math.random() * (max - min);
        const angle = Math.random() * Math.PI * 2;
        
        Body.setVelocity(body, {
          x: baseVelocity * Math.cos(angle) * randomness * BUBBLE_CONFIG.physics.initialVelocity,
          y: baseVelocity * Math.sin(angle) * randomness * BUBBLE_CONFIG.physics.initialVelocity
        });
      });
    }

    // Create runner (always create a new one)
    const runner = Runner.create();
    Runner.run(runner, engine);

    // Update React state with current bubble data
    let frameId: number;
    const updateBubbles = () => {
      const currentBodies = engine.world.bodies.filter(b => b.label && !b.label.startsWith('wall-'));
      setBubbles(currentBodies.map(body => ({
        body,
        content: bubbleData.find(d => d.ticker === body.label)?.content || {
          ticker: body.label,
          subtitle: body.label,
          color: '#666666',
          percent: 0
        }
      })));
      
      // Apply ongoing velocity controls to each bubble
      currentBodies.forEach(body => {
        // Apply velocity damping (gradually slow down)
        const dampedVelocity = {
          x: body.velocity.x * BUBBLE_CONFIG.physics.velocityDamping,
          y: body.velocity.y * BUBBLE_CONFIG.physics.velocityDamping
        };
        
        // Calculate current speed
        const speed = Math.sqrt(dampedVelocity.x * dampedVelocity.x + dampedVelocity.y * dampedVelocity.y);
        
        // Apply velocity limiting (cap maximum speed)
        if (speed > BUBBLE_CONFIG.physics.maxVelocity) {
          const scale = BUBBLE_CONFIG.physics.maxVelocity / speed;
          dampedVelocity.x *= scale;
          dampedVelocity.y *= scale;
        }
        
        // Apply minimum velocity (ensure bubbles keep moving)
        if (speed > 0 && speed < BUBBLE_CONFIG.physics.minVelocity) {
          const scale = BUBBLE_CONFIG.physics.minVelocity / speed;
          dampedVelocity.x *= scale;
          dampedVelocity.y *= scale;
        }
        
        // If bubble is completely stopped, give it a small random velocity
        if (speed === 0) {
          const angle = Math.random() * Math.PI * 2;
          dampedVelocity.x = Math.cos(angle) * BUBBLE_CONFIG.physics.minVelocity;
          dampedVelocity.y = Math.sin(angle) * BUBBLE_CONFIG.physics.minVelocity;
        }
        
        // Set the controlled velocity
        Body.setVelocity(body, dampedVelocity);
        
        // Add random forces based on config (less frequently now)
        if (Math.random() < BUBBLE_CONFIG.physics.forceFrequency) {
          const force = BUBBLE_CONFIG.physics.forceScale;
          Body.applyForce(body, body.position, {
            x: (Math.random() - 0.5) * force,
            y: (Math.random() - 0.5) * force
          });
        }
      });
      
      frameId = requestAnimationFrame(updateBubbles);
    };
    frameId = requestAnimationFrame(updateBubbles);

    return () => {
      cancelAnimationFrame(frameId);
      Runner.stop(runner);
    };
  }, [windowDimensions, activePrices, hasInitialData, isLoading, selectedTimeFrame]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden no-select">
      {/* Loading spinner */}
      {showLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="w-12 h-12 border-4 border-gray-600 border-t-white rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Time Frame Selection Menu */}
      <div className="absolute top-4 right-4 z-40">
        <div className="bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg p-2 flex gap-2">
          {[
            { key: 'h1', label: '1H' },
            { key: 'h6', label: '6H' },
            { key: 'h24', label: '24H' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedTimeFrame(key as 'h1' | 'h6' | 'h24')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                selectedTimeFrame === key
                  ? 'bg-white text-black font-medium'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      
      {bubbles.map((bubble) => {
        const radius = (bubble.body as Matter.Body & { circleRadius?: number }).circleRadius || 30;
        const logoPath = getLogoPath(bubble.content.ticker);
        const config = TOKEN_CONSTANTS.find(t => t.ticker === bubble.content.ticker);
        
        // Scale font sizes and spacing based on radius
        // Use a base scale factor that's proportional to the radius
        const baseScale = radius / 100; // normalize to a 100px reference radius
        
        // Scale everything proportionally to maintain ratios
        const spacing = {
          vertical: radius * 0.08, // 8% of radius for vertical spacing
          horizontal: radius * 0.1  // 10% of radius for horizontal padding
        };
        
        // Text sizes proportional to radius
        const fontSize = {
          percent: radius * 0.22,  // 22% of radius
          ticker: radius * 0.18    // 18% of radius
        };
        
        // Logo size should take up about 45% of the circle's diameter
        const logoSize = radius * 0.9; // 90% of radius = 45% of diameter

        return (
          <div
            key={bubble.content.ticker}
            onClick={() => {
              if (config && config.dexs && typeof window !== 'undefined') {
                const dexAddress = Array.isArray(config.dexs) ? config.dexs[0] : config.dexs;
                const chainName = config.chain === 1 ? 'ethereum' : 'pulsechain';
                window.open(`https://dexscreener.com/${chainName}/${dexAddress}`, '_blank');
              }
            }}
            onAuxClick={(e) => {
              // Middle click is button 1
              if (e.button === 1 && config && config.dexs && typeof window !== 'undefined') {
                e.preventDefault();
                const dexAddress = Array.isArray(config.dexs) ? config.dexs[0] : config.dexs;
                const chainName = config.chain === 1 ? 'ethereum' : 'pulsechain';
                window.open(`https://dexscreener.com/${chainName}/${dexAddress}`, '_blank');
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              World.remove(engineRef.current.world, bubble.body);
              (e.target as HTMLElement).style.display = 'none';
              setBubbles(prev => prev.filter(b => b.body.id !== bubble.body.id));
            }}
            className="hover:bg-[#0c0c0c] active:brightness-75"
            style={{
              position: 'absolute',
              left: bubble.body.position.x - radius,
              top: bubble.body.position.y - radius,
              width: radius * 2,
              height: radius * 2,
              borderRadius: '50%',
              backgroundColor: '#000000',
              borderColor: bubble.content.color,
              borderWidth: Math.max(1, radius * 0.03), // Border 3% of radius
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `${spacing.vertical}px ${spacing.horizontal}px`,
              color: '#FFFFFF',
              textAlign: 'center',
              overflow: 'hidden',
              cursor: 'pointer',
              zIndex: 10,
              willChange: 'transform'
            }}
          >
            <div style={{ 
              fontSize: `${fontSize.percent}px`,
              color: bubble.content.percent >= 0 ? '#00ff00' : '#ff0000',
              lineHeight: 1,
              marginTop: spacing.vertical
            }}>
              {formatPercent(bubble.content.percent)}
            </div>
            
            {logoPath && (
              <div style={{ 
                width: `${logoSize}px`, 
                height: `${logoSize}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: `${spacing.vertical}px 0`
              }}>
                <img
                  src={logoPath}
                  alt={`${bubble.content.ticker} logo`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }}
                  draggable={false}
                />
              </div>
            )}
            
            <div style={{ 
              fontSize: `${fontSize.ticker}px`,
              lineHeight: 1,
              marginBottom: spacing.vertical
            }}>
              {bubble.content.subtitle}
            </div>
          </div>
        );
      })}
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  )
} 