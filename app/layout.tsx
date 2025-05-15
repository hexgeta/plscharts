import '@/styles/global.css'
import { FontLoader } from '@/components/ui/FontLoader'

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
      <body>{children}</body>
    </html>
  )
}
