'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useFontCache } from '@/hooks/crypto/useFontCache'

// Available fonts mapping
export const AVAILABLE_FONTS = {
  'archia': {
    name: 'Archia',
    displayName: 'Archia (Default)',
    fallback: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif'
  },
  'departure-mono': {
    name: 'Departure Mono',
    displayName: 'Departure Mono',
    fallback: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
  }
} as const

export type FontKey = keyof typeof AVAILABLE_FONTS

interface FontContextType {
  selectedFont: FontKey
  setSelectedFont: (font: FontKey) => void
  useFontSelection: boolean
  setUseFontSelection: (enabled: boolean) => void
  applyFontOnModalClose: () => void
}

const FontContext = createContext<FontContextType | undefined>(undefined)

export function useFontContext() {
  const context = useContext(FontContext)
  if (context === undefined) {
    throw new Error('useFontContext must be used within a FontProvider')
  }
  return context
}

interface FontProviderProps {
  children: ReactNode
}

export function FontProvider({ children }: FontProviderProps) {
  const [selectedFont, setSelectedFontState] = useState<FontKey>('archia')
  const [useFontSelection, setUseFontSelectionState] = useState(false)

  // Use your existing font cache hook for Departure Mono
  const { fontLoaded: departureMonoLoaded } = useFontCache()

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedUseFontSelection = localStorage.getItem('useFontSelection')
    const savedFont = localStorage.getItem('selectedFont') as FontKey
    
    if (savedUseFontSelection === 'true') {
      setUseFontSelectionState(true)
      if (savedFont && AVAILABLE_FONTS[savedFont]) {
        setSelectedFontState(savedFont)
      }
    }
  }, [])

  // Only apply font on initial load from localStorage
  useEffect(() => {
    const savedUseFontSelection = localStorage.getItem('useFontSelection')
    const savedFont = localStorage.getItem('selectedFont') as FontKey
    
    if (savedUseFontSelection === 'true' && savedFont && AVAILABLE_FONTS[savedFont]) {
      if (savedFont === 'departure-mono' && departureMonoLoaded) {
        applyFontToDocument(savedFont)
      } else if (savedFont === 'archia') {
        applyFontToDocument(savedFont)
      }
    } else {
      applyFontToDocument('archia')
    }
  }, [departureMonoLoaded])

  const setSelectedFont = (font: FontKey) => {
    setSelectedFontState(font)
    localStorage.setItem('selectedFont', font)
    
    // If user selects Archia (default), automatically turn off custom font selection
    if (font === 'archia') {
      setUseFontSelection(false)
    }
  }

  // Function to apply font when settings modal closes
  const applyFontOnModalClose = () => {
    if (useFontSelection && selectedFont) {
      applyFontToDocument(selectedFont)
    } else {
      applyFontToDocument('archia')
    }
  }

  const setUseFontSelection = (enabled: boolean) => {
    setUseFontSelectionState(enabled)
    localStorage.setItem('useFontSelection', enabled.toString())
    
    if (!enabled) {
      // Reset to default font when disabled
      applyFontToDocument('archia')
    }
  }

  return (
    <FontContext.Provider 
      value={{
        selectedFont,
        setSelectedFont,
        useFontSelection,
        setUseFontSelection,
        applyFontOnModalClose
      }}
    >
      {children}
    </FontContext.Provider>
  )
}

// Helper function to apply font to document
function applyFontToDocument(fontKey: FontKey) {
  const fontConfig = AVAILABLE_FONTS[fontKey]
  const fontStack = `'${fontConfig.name}', ${fontConfig.fallback}`
  
  // Update CSS custom property to work with your existing system
  document.documentElement.style.setProperty('--font-sans', fontStack)
  
  // Also update the body element directly for immediate effect
  document.body.style.fontFamily = fontStack
}
