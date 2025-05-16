import '@/styles/global.css'
import { FontLoader } from '@/components/ui/FontLoader'
import NavBar from '@/components/NavBar'
// Static layout with revalidation
export const revalidate = 2592000; // 30 days in seconds

import Footer from '@/components/Footer'

export const metadata = {
  title: 'PLSCharts.com',
  description: 'plscharts.com',
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
        <NavBar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
