import '@/styles/global.css'
import { FontLoader } from '@/components/ui/FontLoader'

// Static layout with revalidation
export const revalidate = 2592000; // 30 days in seconds

import AuthNavigationBar from '@/components/AuthNavBar'
import MarketingBanner from '@/components/MarketingBanner'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'LookIntoMaxi',
  description: 'Advanced pool staking stats',
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
      <body>
        <MarketingBanner />
        <AuthNavigationBar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
