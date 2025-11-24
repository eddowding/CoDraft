import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/toaster'
import { ErrorBoundary } from '@/components/error-boundary'
import { QueryProvider } from '@/components/providers/query-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DocVote - Collaborative Document Editor',
  description: 'A modern, real-time collaborative document editing platform with voting and commenting features.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, "min-h-screen antialiased")}>
        <QueryProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  )
}