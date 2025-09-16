'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClientSupabase } from '@/lib/supabase'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/utils'
import { FileText, Plus, Users, TrendingUp, Trash2, CheckSquare, Square } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Document = Database['public']['Tables']['documents']['Row']

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const supabase = createClientSupabase()

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleDocumentSelection = (documentId: string) => {
    const newSelected = new Set(selectedDocuments)
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId)
    } else {
      newSelected.add(documentId)
    }
    setSelectedDocuments(newSelected)
  }

  const selectAllDocuments = () => {
    const allDocumentIds = documents.map(doc => doc.id)
    setSelectedDocuments(new Set(allDocumentIds))
  }

  const clearSelection = () => {
    setSelectedDocuments(new Set())
  }

  const bulkDeleteDocuments = async () => {
    if (selectedDocuments.size === 0) return

    const documentTitles = documents
      .filter(doc => selectedDocuments.has(doc.id))
      .map(doc => doc.title)
      .join(', ')

    const confirmMessage = `Are you sure you want to delete ${selectedDocuments.size} document(s)?\n\nDocuments: ${documentTitles}\n\nThis action cannot be undone and will also delete all votes and comments.`

    if (!window.confirm(confirmMessage)) return

    setIsDeleting(true)

    try {
      // Delete documents in parallel
      const deletePromises = Array.from(selectedDocuments).map(async (documentId) => {
        const response = await fetch(`/api/documents/${documentId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(`Failed to delete document ${documentId}: ${error.error}`)
        }

        return response.json()
      })

      await Promise.all(deletePromises)

      // Remove deleted documents from state
      setDocuments(prevDocs =>
        prevDocs.filter(doc => !selectedDocuments.has(doc.id))
      )

      // Clear selection
      setSelectedDocuments(new Set())

      alert(`Successfully deleted ${selectedDocuments.size} document(s)`)
    } catch (error) {
      console.error('Error during bulk delete:', error)
      alert(`Error deleting documents: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDeleting(false)
    }
  }


  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here are your recent documents.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Documents
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documents.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Collaborators
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Votes
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions Toolbar */}
        {documents.length > 0 && (
          <div className="mb-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectedDocuments.size === documents.length ? clearSelection : selectAllDocuments}
                >
                  {selectedDocuments.size === documents.length ? (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Select All
                    </>
                  )}
                </Button>
                {selectedDocuments.size > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {selectedDocuments.size} document(s) selected
                  </span>
                )}
              </div>
              {selectedDocuments.size > 0 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                  >
                    Clear Selection
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={bulkDeleteDocuments}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? 'Deleting...' : `Delete ${selectedDocuments.size}`}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>
              Your recently created and edited documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No documents yet</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first document.
                </p>
                <Button asChild>
                  <Link href="/documents/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Document
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                      selectedDocuments.has(doc.id) ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => toggleDocumentSelection(doc.id)}
                        className={`flex items-center justify-center w-5 h-5 border-2 rounded transition-colors ${
                          selectedDocuments.has(doc.id)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {selectedDocuments.has(doc.id) ? (
                          <CheckSquare className="w-3 h-3" />
                        ) : (
                          <Square className="w-3 h-3 opacity-0" />
                        )}
                      </button>
                      <FileText className="w-8 h-8 text-blue-600" />
                      <div>
                        <Link
                          href={`/documents/${doc.id}`}
                          className="font-medium hover:underline"
                        >
                          {doc.title}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {formatRelativeTime(doc.updated_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        doc.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {doc.status}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        doc.is_public
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {doc.is_public ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}