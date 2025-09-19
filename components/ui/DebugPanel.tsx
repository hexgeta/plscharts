import React, { useState, useCallback, useRef, useEffect } from 'react'

interface DebugLog {
  id: string
  timestamp: number
  type: 'start' | 'progress' | 'complete' | 'error'
  operation: string
  details?: string
  duration?: number
  cumulativeTime?: number
}

interface DebugPanelProps {
  show: boolean
  renderCount: number
  onAddLog: (type: 'start' | 'progress' | 'complete' | 'error', operation: string, details?: string) => void
}

export function DebugPanel({ show, renderCount, onAddLog }: DebugPanelProps) {
  // Debug panel state
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([])
  const [debugPanelPosition, setDebugPanelPosition] = useState(() => {
    // Load position from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('debugPanelPosition')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          // Error parsing saved debug panel position
        }
      }
    }
    return { x: 16, y: 16 } // Default position
  })
  const [debugPanelMinimized, setDebugPanelMinimized] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('debugPanelMinimized')
      return saved === 'true'
    }
    return false
  })
  const [isDragging, setIsDragging] = useState(false)
  const [showTokenPriceLogs, setShowTokenPriceLogs] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('debugPanelShowTokenPrices')
      return saved === 'true'
    }
    return false
  })
  
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null)
  const debugSessionStartRef = useRef<number | null>(null)
  const debugStartTimesRef = useRef<Record<string, number>>({})

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('debugPanelPosition', JSON.stringify(debugPanelPosition))
  }, [debugPanelPosition])

  // Save minimized state to localStorage
  useEffect(() => {
    localStorage.setItem('debugPanelMinimized', debugPanelMinimized.toString())
  }, [debugPanelMinimized])

  // Save token price visibility to localStorage
  useEffect(() => {
    localStorage.setItem('debugPanelShowTokenPrices', showTokenPriceLogs.toString())
  }, [showTokenPriceLogs])

  // Add debug log function
  const addDebugLog = useCallback((type: 'start' | 'progress' | 'complete' | 'error', operation: string, details?: string) => {
    if (!show) return
    
    // Filter out Token Prices logs unless explicitly enabled
    if (!showTokenPriceLogs && operation === 'Token Prices') return
    
    const now = Date.now()
    const id = `${operation}-${now}-${Math.random()}`
    
    // Initialize session start time on first log
    if (!debugSessionStartRef.current) {
      debugSessionStartRef.current = now
    }
    
    if (type === 'start') {
      debugStartTimesRef.current[operation] = now
    }
    
    let duration: number | undefined
    if (type === 'complete' || type === 'error') {
      const startTime = debugStartTimesRef.current[operation]
      if (startTime) {
        duration = now - startTime
        delete debugStartTimesRef.current[operation]
      }
    }
    
    const cumulativeTime = debugSessionStartRef.current ? now - debugSessionStartRef.current : 0
    
    setDebugLogs(prev => {
      const newLogs = [...prev, {
        id,
        timestamp: now,
        type,
        operation,
        details,
        duration,
        cumulativeTime
      }]
      // Keep only last 50 logs
      return newLogs.slice(-50)
    })
  }, [show, showTokenPriceLogs])

  // Expose addDebugLog to window for hooks to use
  useEffect(() => {
    if (show && typeof window !== 'undefined') {
      (window as any).addDebugLog = addDebugLog
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).addDebugLog
      }
    }
  }, [addDebugLog, show])

  // Clear debug logs
  const clearDebugLogs = useCallback(() => {
    setDebugLogs([])
    debugStartTimesRef.current = {}
    debugSessionStartRef.current = null
  }, [])

  // Debug panel drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: debugPanelPosition.x,
      startPosY: debugPanelPosition.y
    }
  }, [debugPanelPosition])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragRef.current) return
    
    const deltaX = e.clientX - dragRef.current.startX
    const deltaY = e.clientY - dragRef.current.startY
    
    const newX = Math.max(0, Math.min(window.innerWidth - 320, dragRef.current.startPosX + deltaX))
    const newY = Math.max(0, Math.min(window.innerHeight - 100, dragRef.current.startPosY + deltaY))
    
    setDebugPanelPosition({ x: newX, y: newY })
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    dragRef.current = null
  }, [])

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = 'none'
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.userSelect = ''
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  if (!show) return null

  return (
    <div 
      className={`fixed w-80 bg-black/95 border border-white/20 rounded-lg shadow-2xl z-[9999] overflow-hidden transition-all duration-200 ${
        isDragging ? 'cursor-grabbing' : ''
      }`}
      style={{ 
        left: debugPanelPosition.x, 
        top: debugPanelPosition.y,
        maxHeight: debugPanelMinimized ? '48px' : '384px'
      }}
    >
      {/* Header - Draggable */}
      <div 
        className={`flex items-center justify-between p-3 border-b border-white/10 bg-white/5 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="text-sm font-medium text-white">Network Debug</div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-purple-400">R#{renderCount}</div>
          <div className="text-xs text-gray-400">{debugLogs.length}/50</div>
          {debugSessionStartRef.current && (
            <div className="text-xs text-blue-400">
              {Math.round((Date.now() - debugSessionStartRef.current) / 1000)}s
            </div>
          )}
          <button
            onClick={() => setShowTokenPriceLogs(!showTokenPriceLogs)}
            className={`text-xs transition-colors ${
              showTokenPriceLogs ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-white'
            }`}
            title={showTokenPriceLogs ? "Hide token prices" : "Show token prices"}
            onMouseDown={(e) => e.stopPropagation()}
          >
            $
          </button>
          <button
            onClick={() => setDebugPanelMinimized(!debugPanelMinimized)}
            className="text-xs text-gray-400 hover:text-white transition-colors"
            title={debugPanelMinimized ? "Expand" : "Minimize"}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {debugPanelMinimized ? '▲' : '▼'}
          </button>
          <button
            onClick={clearDebugLogs}
            className="text-xs text-gray-400 hover:text-white transition-colors"
            title="Clear logs"
            onMouseDown={(e) => e.stopPropagation()}
          >
            Clear
          </button>
        </div>
      </div>
      
      {/* Logs - Only show when not minimized */}
      {!debugPanelMinimized && (
        <div className="max-h-80 overflow-y-auto scrollbar-hide">
          {debugLogs.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No activity yet...
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {debugLogs.map((log) => {
                const cumulativeSeconds = log.cumulativeTime ? Math.round(log.cumulativeTime / 1000) : 0
                const cumulativeDisplay = cumulativeSeconds < 60 ? `${cumulativeSeconds}s` : `${Math.round(cumulativeSeconds / 60)}m`
                
                return (
                  <div key={log.id} className={`text-xs border-l-2 pl-2 py-1 ${
                    log.type === 'start' ? 'border-blue-400' :
                    log.type === 'complete' ? 'border-green-400' :
                    log.type === 'error' ? 'border-red-400' :
                    'border-gray-400'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${
                        log.type === 'start' ? 'text-blue-400' :
                        log.type === 'complete' ? 'text-green-400' :
                        log.type === 'error' ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {log.operation}
                      </span>
                      <div className="flex items-center gap-2 text-gray-500">
                        <span className="text-blue-300">+{cumulativeDisplay}</span>
                        {log.duration && (
                          <span className="text-green-300">{log.duration}ms</span>
                        )}
                      </div>
                    </div>
                    {log.details && (
                      <div className="text-gray-400 mt-0.5">
                        {log.details}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
} 