import '@/styles/global.css'
import { FontLoader } from '@/components/ui/FontLoader'
import NavBar from '@/components/NavBar'
import Footer from '@/components/Footer'
import { Providers } from '@/components/Providers'

// Static layout with revalidation
export const revalidate = 2592000; // 30 days in seconds

export const metadata = {
  title: 'PlsCharts.com',
  description: 'Live, real-time PulseChain price charts and statistics tracking PLS, HEX, PLSX and more!',
  keywords: 'PulseChain, PLS, HEX, PLSX, price charts, crypto statistics, PulseX',
  manifest: '/manifest.json',
  icons: {
    icon: [
      {
        url: '/favicon.png',
        type: 'image/png',
        sizes: '128x128'
      }
    ],
    apple: [
      {
        url: '/favicon.png',
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="font-sans">
      <head>
        <FontLoader weight="regular" priority={true} />
        <FontLoader weight="bold" />
      </head>
      <body className="min-h-screen bg-black text-white">
        <Providers>
          <div className="flex flex-col min-h-screen">
            <NavBar />
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  )
}
