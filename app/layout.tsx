import '@/styles/global.css'
import { FontLoader } from '@/components/ui/FontLoader'
import NavBar from '@/components/NavBar'
import Footer from '@/components/Footer'
import MobileNavigation from '@/components/ui/MobileNavigation'
import { Providers } from '@/components/Providers'
import type { Metadata } from 'next'

// Static layout with revalidation
export const revalidate = 2592000; // 30 days in seconds

// Essential tokens that should be preloaded globally (used across multiple pages)
const ESSENTIAL_TOKENS = ['PLS', 'PLSX', 'INC', 'pHEX', 'eHEX'];

// Favicon files that should be preloaded immediately
const FAVICON_FILES = [
  { src: 'favicon.svg', type: 'image/svg+xml' }
];

export const metadata: Metadata = {
  title: 'PlsCharts.com',
  description: 'Live, real-time PulseChain price charts and statistics tracking PLS, HEX, PLSX and more!',
  keywords: 'PulseChain, PLS, HEX, PLSX, price charts, crypto statistics, PulseX',
  manifest: '/manifest.json',
  icons: {
    icon: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
        sizes: '128x128'
      }
    ],
    apple: [
      {
        url: '/favicon-apple.png',
        type: 'image/png',
        sizes: '180x180'
      }
    ]
  },
  appleWebApp: {
    capable: true,
    title: 'PlsCharts',
    statusBarStyle: 'default'
  },
  openGraph: {
    title: 'PlsCharts.com',
    description: 'Live, real-time PulseChain price charts and statistics tracking PLS, HEX, PLSX and more!',
    url: 'https://www.plscharts.com',
    siteName: 'PlsCharts.com',
    images: [
      {
        url: 'https://www.plscharts.com/opengraph-image.png',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'PlsCharts.com Preview'
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PlsCharts.com',
    description: 'Live, real-time PulseChain price charts and statistics tracking PLS, HEX, PLSX and more!',
    images: {
      url: 'https://www.plscharts.com/opengraph-image.png',
      type: 'image/png',
      width: 1200,
      height: 630
    }
  },
  other: {
    'mobile-web-app-capable': 'yes'
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content'
}

// Font Loading Component
function FontLoadingOptimizer() {
  return (
    <>
      <FontLoader priority={true} />
      {/* Preconnect to font directory for faster loading */}
      <link 
        rel="preconnect" 
        href="/fonts/Archia/" 
        crossOrigin="anonymous" 
      />
      {/* Inline critical font CSS for immediate loading */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Critical Departure Mono font loading */
          @font-face {
            font-family: 'Departure Mono';
            src: url('/fonts/Archia/departure-mono-regular.otf') format('opentype');
            font-weight: 400;
            font-style: normal;
            font-display: block;
            font-feature-settings: normal;
          }
          /* Ensure no FOUT with fallback strategy */
          .font-loading {
            font-family: 'ui-monospace', 'SFMono-Regular', 'SF Mono', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
          }
          .font-loaded {
            font-family: 'Departure Mono', 'ui-monospace', 'SFMono-Regular', 'SF Mono', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
          }
          /* Hide scrollbars globally */
          html, body, * {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
            -webkit-overflow-scrolling: touch;
          }
          html::-webkit-scrollbar, body::-webkit-scrollbar, *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          /* Mobile Chrome specific */
          @supports (-webkit-touch-callout: none) {
            * {
              -webkit-overflow-scrolling: touch;
              -ms-overflow-style: none !important;
              scrollbar-width: none !important;
            }
            *::-webkit-scrollbar {
              display: none !important;
              width: 0 !important;
            }
          }
          /* Prevent mobile browser UI bars from affecting layout */
          @media screen and (max-width: 768px) {
            html {
              height: 100vh !important;
              height: 100svh !important;
              overflow: hidden !important;
            }
            body {
              height: 100vh !important;
              height: 100svh !important;
              overflow-y: auto !important;
              position: relative !important;
              -webkit-overflow-scrolling: touch !important;
            }
          }
          /* iOS Safari specific fixes */
          @supports (-webkit-touch-callout: none) {
            html {
              height: -webkit-fill-available !important;
            }
            body {
              min-height: 100vh !important;
              min-height: -webkit-fill-available !important;
            }
          }
        `
      }} />
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="font-sans scrollbar-hide">
      <head>
        <script defer data-domain="plscharts.com" src="https://plausible.io/js/script.js"></script>
        {/* Prevent mobile browser UI bars from resizing content */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <FontLoadingOptimizer />
        {/* Preload favicon files for immediate availability */}
        {FAVICON_FILES.map((favicon) => (
          <link 
            key={favicon.src}
            rel="preload"
            href={`/${favicon.src}`}
            as="image"
            type={favicon.type}
            fetchPriority="high"
          />
        ))}
        {/* Preload essential token logos (used across multiple pages) */}
        {ESSENTIAL_TOKENS.map(token => (
          <link 
            key={token}
            rel="preload"
            href={`/coin-logos/${token.replace(/^[pe]/, '')}.svg`}
            as="image"
            type="image/svg+xml"
          />
        ))}
      </head>
      <body className="no-select min-h-screen bg-black text-white overflow-y-auto scrollbar-hide">
        <Providers>
          <div className="flex flex-col min-h-screen scrollbar-hide">
            <NavBar />
            <main className="flex-grow scrollbar-hide">{children}</main>
            <Footer />
            <MobileNavigation />
          </div>
        </Providers>
      </body>
    </html>
  )
}
