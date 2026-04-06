import type { Metadata } from 'next'
import { Space_Mono } from 'next/font/google'
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from '@/components/ui/toaster'
import { Navbar } from '@/components/navbar'
import { RecentlyRoasted } from '@/components/recently-roasted'
import { Footer } from '@/components/footer'
import './globals.css'

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
})

export const metadata: Metadata = {
  title: 'Repo Roast',
  description: 'Drop your repo URL. We\'ll find every bullshit claim in your code.',
  openGraph: {
    title: "Repo Roast",
    description: "Drop your repo URL. We'll find every bullshit claim in your code.",
    images: ["RepoRoastOG.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="s2qiNqXBdZWFi1dsEawfzq8HO1JflKSdMqoKyLNwXdQ" />
      </head>
      <body className={`${spaceMono.variable} font-mono antialiased min-h-screen flex flex-col`}>
        <Navbar />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <RecentlyRoasted />
        <Footer />
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
