import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MDOS Platform — Moderne Development, Inc.',
  description: 'Moderne Development Operating System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
