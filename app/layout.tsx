import type { Metadata } from 'next'
import { Fraunces, JetBrains_Mono, Libre_Franklin } from 'next/font/google'
import './globals.css'

const serif = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  style: ['normal', 'italic'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
})

const sans = Libre_Franklin({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Markdown Studio — a quiet desk for writing Markdown',
  description:
    'A distraction-light writer’s studio for Markdown: a manuscript-style live preview, GFM support, and reading statistics, all kept on your device.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${mono.variable} ${sans.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
