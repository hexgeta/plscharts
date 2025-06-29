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
  viewportFit: 'cover'
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
          html, body {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          html::-webkit-scrollbar, body::-webkit-scrollbar {
            display: none;
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
      <body className="no-select min-h-screen bg-black text-white overflow-y-auto">
        <Providers>
          <div className="flex flex-col min-h-screen">
            <NavBar />
            <main className="flex-grow">{children}</main>
            <Footer />
            <MobileNavigation />
          </div>
        </Providers>
      </body>
    </html>
  )
}
