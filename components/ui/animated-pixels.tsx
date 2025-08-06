'use client'

import { useEffect, useRef } from 'react'

interface PixelTrail {
  id: number
  path: { x: number; y: number }[]
  currentIndex: number
  speed: number
  pixelLifetime: number
  trailLength: number
  direction: number
  isActive: boolean
  lastSpawnTime: number
  spawnInterval: number
}

interface HexagonFormation {
  isActive: boolean
  centerX: number
  centerY: number
  radius: number
  formationProgress: number
  holdTime: number
  breakupProgress: number
  phase: 'forming' | 'holding' | 'breaking'
}

export default function AnimatedPixels() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trailsRef = useRef<PixelTrail[]>([])
  const hexagonRef = useRef<HexagonFormation>({
    isActive: false,
    centerX: 0,
    centerY: 0,
    radius: 100,
    formationProgress: 0,
    holdTime: 0,
    breakupProgress: 0,
    phase: 'forming'
  })
  const animationRef = useRef<number>()
  const activePixelsRef = useRef<Map<string, { x: number; y: number; opacity: number; size: number; birthTime: number }>>(new Map())
  const lastHexagonTime = useRef<number>(0)
  
  // Generate hexagon pattern points
  const generateHexagonPoints = (centerX: number, centerY: number, radius: number) => {
    const points: { x: number; y: number }[] = []
    
    // Create hexagon outline
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3
      points.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      })
    }
    
    // Add inner hexagon layers
    for (let layer = 1; layer <= 3; layer++) {
      const layerRadius = (radius * layer) / 4
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3
        points.push({
          x: centerX + Math.cos(angle) * layerRadius,
          y: centerY + Math.sin(angle) * layerRadius
        })
      }
    }
    
    // Add center point
    points.push({ x: centerX, y: centerY })
    
    return points
  }
  
  // Generate code-like patterns for pixel trails
  const generateCodePattern = (startX: number, startY: number, endX: number, endY: number, segments: number) => {
    const path: { x: number; y: number }[] = []
    const codePatterns = [
      // if statement pattern
      [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1],
      // function pattern  
      [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
      // for loop pattern
      [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1],
      // variable assignment
      [1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
      // array pattern
      [0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0],
      // object pattern
      [0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1]
    ]
    
    const selectedPattern = codePatterns[Math.floor(Math.random() * codePatterns.length)]
    const baseY = startY
    const totalWidth = endX - startX
    const pixelSpacing = 12 // Space between pixels to look like characters
    
    for (let i = 0; i <= segments; i++) {
      const progress = i / segments
      const baseX = startX + (totalWidth * progress)
      
      // Create horizontal code-like lines
      const lineOffset = Math.floor(i / 20) * 25 // New line every 20 segments
      const positionInLine = i % 20
      const shouldShowPixel = selectedPattern[positionInLine % selectedPattern.length]
      
      if (shouldShowPixel) {
        // Add slight vertical variation for different "lines" of code
        const verticalOffset = lineOffset + (Math.random() - 0.5) * 5
        
        path.push({
          x: baseX,
          y: baseY + verticalOffset
        })
      }
    }
    
    return path
  }
  
  // Generate indented code blocks
  const generateIndentedCodeBlock = (centerX: number, centerY: number) => {
    const lines: { x: number; y: number }[] = []
    const lineHeight = 18
    const charWidth = 8
    
    // Simulate nested code structure
    const codeStructure = [
      { indent: 0, length: 12, pattern: [1,1,1,1,1,1,0,1,1,1,1,1] }, // function declaration
      { indent: 1, length: 8, pattern: [1,1,1,0,1,1,1,1] },          // if statement  
      { indent: 2, length: 10, pattern: [1,1,1,1,1,0,1,1,1,1] },     // nested code
      { indent: 2, length: 6, pattern: [1,1,1,1,1,1] },              // more nested
      { indent: 1, length: 9, pattern: [1,1,1,1,0,1,1,1,1] },        // else
      { indent: 2, length: 7, pattern: [1,1,1,0,1,1,1] },            // nested code
      { indent: 0, length: 5, pattern: [1,1,1,1,1] }                 // closing
    ]
    
    codeStructure.forEach((line, lineIndex) => {
      const y = centerY - (lineHeight * 3) + (lineIndex * lineHeight)
      const startX = centerX - 60 + (line.indent * 20) // Indentation
      
      line.pattern.forEach((shouldShow, charIndex) => {
        if (shouldShow) {
          lines.push({
            x: startX + (charIndex * charWidth),
            y: y
          })
        }
      })
    })
    
    return lines
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Initialize pixel trails with code patterns
    const initializeTrails = () => {
      const trailCount = 6 // Code lines
      trailsRef.current = []

      for (let i = 0; i < trailCount; i++) {
        const startX = -100
        const startY = 100 + (i * 80) + Math.random() * 40 // Spaced like code lines
        const endX = canvas.width + 100
        const endY = startY + (Math.random() - 0.5) * 20 // Mostly horizontal with slight drift
        const segments = 80 + Math.floor(Math.random() * 40) // 80-120 segments
        
        trailsRef.current.push({
          id: i,
          path: generateCodePattern(startX, startY, endX, endY, segments),
          currentIndex: 0,
          speed: 0.3 + Math.random() * 0.7, // Slower: 0.3-1.0 pixels per frame (like typing)
          pixelLifetime: 180 + Math.random() * 120, // 3-5 seconds
          trailLength: 12 + Math.floor(Math.random() * 8), // 12-20 pixels (like words)
          direction: 1,
          isActive: true,
          lastSpawnTime: 0,
          spawnInterval: 6 + Math.floor(Math.random() * 8) // Spawn every 6-14 frames
        })
      }
    }

    initializeTrails()

    // Animation loop
    const animate = () => {
      const currentTime = Date.now()
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Check if we should start a hexagon formation (every 15-25 seconds)
      if (currentTime - lastHexagonTime.current > 15000 + Math.random() * 10000) {
        if (!hexagonRef.current.isActive) {
          hexagonRef.current = {
            isActive: true,
            centerX: canvas.width / 2 + (Math.random() - 0.5) * 300,
            centerY: canvas.height / 2 + (Math.random() - 0.5) * 150,
            radius: 80 + Math.random() * 40, // Bigger hexagon
            formationProgress: 0,
            holdTime: 0,
            breakupProgress: 0,
            phase: 'forming'
          }
          lastHexagonTime.current = currentTime
        }
      }

      // Handle hexagon formation
      if (hexagonRef.current.isActive) {
        const hexagon = hexagonRef.current
        
        if (hexagon.phase === 'forming') {
          hexagon.formationProgress += 0.008 // Much slower formation
          if (hexagon.formationProgress >= 1) {
            hexagon.phase = 'holding'
            hexagon.formationProgress = 1
          }
          
          // Draw forming code block - like pseudo code appearing
          const codePoints = generateIndentedCodeBlock(hexagon.centerX, hexagon.centerY)
          codePoints.forEach((point, index) => {
            // Calculate if this pixel should be visible based on formation progress
            const pixelProgress = (hexagon.formationProgress * codePoints.length) - index
            
            if (pixelProgress > 0) {
              // Smooth fade-in for each pixel (like typing effect)
              const pixelOpacity = Math.min(1, pixelProgress) * (0.5 + Math.random() * 0.3)
              const size = 3 + Math.random() * 2 // Slightly bigger for text-like appearance
              
              // Less random offset for more structured code look
              const offsetX = (Math.random() - 0.5) * 2
              const offsetY = (Math.random() - 0.5) * 2
              
              ctx.fillStyle = `rgba(255, 255, 255, ${pixelOpacity})`
              ctx.fillRect(
                Math.floor(point.x + offsetX), 
                Math.floor(point.y + offsetY), 
                size, 
                size
              )
            }
          })
          
        } else if (hexagon.phase === 'holding') {
          hexagon.holdTime += 1
          if (hexagon.holdTime > 300) { // Hold for 5 seconds
            hexagon.phase = 'breaking'
          }
          
          // Draw complete code block with gentle pulsing
          const codePoints = generateIndentedCodeBlock(hexagon.centerX, hexagon.centerY)
          codePoints.forEach((point, index) => {
            const pulse = 0.6 + Math.sin(currentTime * 0.003 + index * 0.1) * 0.2
            const opacity = pulse * (0.6 + Math.random() * 0.2)
            const size = 3 + Math.random() * 2
            
            const offsetX = (Math.random() - 0.5) * 2
            const offsetY = (Math.random() - 0.5) * 2
            
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
            ctx.fillRect(
              Math.floor(point.x + offsetX), 
              Math.floor(point.y + offsetY), 
              size, 
              size
            )
          })
          
        } else if (hexagon.phase === 'breaking') {
          hexagon.breakupProgress += 0.005 // Much slower breakup
          if (hexagon.breakupProgress >= 1) {
            hexagon.isActive = false
            hexagon.breakupProgress = 0
            hexagon.holdTime = 0
            hexagon.formationProgress = 0
          }
          
          // Draw breaking code block with gradual dissolution
          const codePoints = generateIndentedCodeBlock(hexagon.centerX, hexagon.centerY)
          codePoints.forEach((point, index) => {
            // Each pixel has its own dissolution timing (like code being deleted)
            const pixelBreakup = hexagon.breakupProgress + (Math.sin(index) * 0.3)
            
            if (pixelBreakup < 0.8) { // Keep some pixels longer
              const opacity = (1 - pixelBreakup) * (0.4 + Math.random() * 0.3)
              const scatter = hexagon.breakupProgress * 10 // Less scatter for code
              const offsetX = (Math.random() - 0.5) * scatter
              const offsetY = (Math.random() - 0.5) * scatter
              const size = (1 - hexagon.breakupProgress) * (3 + Math.random() * 2)
              
              ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
              ctx.fillRect(
                Math.floor(point.x + offsetX), 
                Math.floor(point.y + offsetY), 
                size, 
                size
              )
            }
          })
        }
      }

      // Update and draw pixel trails (only when not forming hexagon)
      if (!hexagonRef.current.isActive || hexagonRef.current.phase === 'breaking') {
        trailsRef.current.forEach(trail => {
          if (!trail.isActive) return

          trail.lastSpawnTime++

          // Spawn new pixels along the trail
          if (trail.lastSpawnTime >= trail.spawnInterval) {
            trail.lastSpawnTime = 0
            
            for (let i = 0; i < trail.speed; i++) {
              if (trail.currentIndex < trail.path.length) {
                const point = trail.path[trail.currentIndex]
                const pixelKey = `${trail.id}-${trail.currentIndex}`
                
                activePixelsRef.current.set(pixelKey, {
                  x: point.x,
                  y: point.y,
                  opacity: 0.6 + Math.random() * 0.3,
                  size: 1 + Math.random() * 3,
                  birthTime: currentTime
                })
                
                trail.currentIndex++
              }
            }
          }

          // Reset trail when it reaches the end
          if (trail.currentIndex >= trail.path.length) {
            const startY = 100 + Math.random() * (canvas.height - 200) // Keep in visible area
            const endY = startY + (Math.random() - 0.5) * 40 // Mostly horizontal
            trail.path = generateCodePattern(-100, startY, canvas.width + 100, endY, 80 + Math.floor(Math.random() * 40))
            trail.currentIndex = 0
            trail.speed = 0.3 + Math.random() * 0.7 // Keep consistent speed
          }
        })
      }

      // Draw and update active pixels
      activePixelsRef.current.forEach((pixel, key) => {
        const age = currentTime - pixel.birthTime
        const maxAge = 3000 + Math.random() * 2000 // 3-5 seconds lifetime (much longer)
        
        if (age > maxAge) {
          activePixelsRef.current.delete(key)
          return
        }
        
        // Smooth fade in and out
        let ageFactor = 1
        if (age < 500) {
          // Fade in over first 0.5 seconds
          ageFactor = age / 500
        } else if (age > maxAge - 1000) {
          // Fade out over last 1 second
          ageFactor = (maxAge - age) / 1000
        }
        
        const finalOpacity = pixel.opacity * ageFactor * 0.7 // Lower base opacity
        
        if (finalOpacity > 0.05) {
          ctx.fillStyle = `rgba(255, 255, 255, ${finalOpacity})`
          ctx.fillRect(
            Math.floor(pixel.x),
            Math.floor(pixel.y),
            pixel.size,
            pixel.size
          )
        }
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'transparent' }}
    />
  )
}