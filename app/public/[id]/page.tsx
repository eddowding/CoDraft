'use client'

import { useParams } from 'next/navigation'
import { PublicElementsView } from '@/components/public/public-elements-view'
import { Navbar } from '@/components/layout/navbar'

export default function PublicDocumentPage() {
  const params = useParams()
  const documentId = params?.id as string

  if (!documentId) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Invalid Document ID</h1>
            <p className="text-muted-foreground">Please check the URL and try again.</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <PublicElementsView documentId={documentId} />
    </>
  )
}