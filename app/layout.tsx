import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Markdown Studio — Distraction-Free Writing & Preview',
  description: 'Fast, calm, distraction-free Markdown editor with instant live preview, GFM tables, syntax highlighting, and reading statistics.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-neutral-950 text-neutral-100 min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  )
}
