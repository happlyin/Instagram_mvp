import type { Metadata } from 'next'
import '@/client/styles/globals.css'

export const metadata: Metadata = {
  title: 'Instagram MVP',
  description: 'Instagram clone MVP with Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
