import { useState, useEffect } from 'react';

export function useFontCache() {
  const [fontLoaded, setFontLoaded] = useState(false);
  const [fontError, setFontError] = useState(false);

  useEffect(() => {
    // Check if font is already loaded
    if (document.fonts) {
      // Modern browsers with FontFace API
      const checkFont = async () => {
        try {
          await document.fonts.load('400 16px "Departure Mono"');
          
          // Verify font is actually available
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (context) {
            context.font = '16px "Departure Mono", monospace';
            const width1 = context.measureText('Test').width;
            
            context.font = '16px monospace';
            const width2 = context.measureText('Test').width;
            
            // If widths are different, custom font is loaded
            if (width1 !== width2) {
              setFontLoaded(true);
              // Cache the font loading status
              localStorage.setItem('departure-mono-loaded', 'true');
            } else {
              setFontError(true);
            }
          }
        } catch (error) {
          setFontError(true);
        }
      };

      // Check if we already know the font is loaded
      const cachedStatus = localStorage.getItem('departure-mono-loaded');
      if (cachedStatus === 'true') {
        setFontLoaded(true);
      } else {
        checkFont();
      }
    } else {
      // Fallback for older browsers
      setTimeout(() => {
        setFontLoaded(true);
      }, 1000);
    }
  }, []);

  return { fontLoaded, fontError };
} 