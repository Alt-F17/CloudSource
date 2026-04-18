import type { Metadata, Viewport } from 'next'
import { DM_Sans, JetBrains_Mono, Orbitron, Rajdhani } from 'next/font/google'
import './globals.css'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
})

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-display',
  display: 'swap',
})

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-brand',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CloudSource',
  description: 'AI travel planner with a 3D globe',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#06080F',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${rajdhani.variable} ${jetbrainsMono.variable} ${dmSans.variable}`}
    >
      <body className="bg-[#06080F] text-white antialiased">
        {children}
      </body>
    </html>
  )
}
