'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClientSupabase } from '@/lib/supabase'
import { Navbar } from '@/components/layout/navbar'
import { MarkdownEditor } from '@/components/editor/markdown-editor'
import { ElementsList } from '@/components/editor/elements-list'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Save, Eye, Settings } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Document = Database['public']['Tables']['documents']['Row']
type Element = Database['public']['Tables']['elements']['Row']

export default function DocumentPage() {
  const params = useParams()
  const documentId = params?.id as string

  const [document, setDocument] = useState<Document | null>(null)
  const [elements, setElements] = useState<Element[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('edit')

  const supabase = createClientSupabase()

  useEffect(() => {
    if (documentId) {
      fetchDocument()
      fetchElements()
    }
  }, [documentId])

  const fetchDocument = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (error) throw error
      setDocument(data)
    } catch (error) {
      console.error('Error fetching document:', error)
    }
  }

  const fetchElements = async () => {
    try {
      const { data, error } = await supabase
        .from('elements')
        .select('*')
        .eq('document_id', documentId)
        .order('order_index')

      if (error) throw error
      setElements(data || [])
    } catch (error) {
      console.error('Error fetching elements:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveDocument = async (content: string, title?: string) => {
    if (!document) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          content,
          title: title || document.title,
          word_count: content.split(/\s+/).length,
          estimated_read_time: Math.ceil(content.split(/\s+/).length / 200),
        })
        .eq('id', documentId)

      if (error) throw error

      // Parse content and create/update elements
      await parseContentToElements(content)

    } catch (error) {
      console.error('Error saving document:', error)
    } finally {
      setSaving(false)
    }
  }

  const parseContentToElements = async (content: string) => {
    const lines = content.split('\n')
    const newElements: Omit<Element, 'id' | 'created_at' | 'updated_at'>[] = []
    let orderIndex = 0

    for (const line of lines) {
      if (line.trim()) {
        let type = 'paragraph'
        if (line.startsWith('#')) type = 'heading'
        else if (line.startsWith('- ') || line.startsWith('* ')) type = 'list'
        else if (line.startsWith('```')) type = 'code'
        else if (line.startsWith('> ')) type = 'quote'

        newElements.push({
          document_id: documentId,
          content: line,
          type,
          order_index: orderIndex++,
          upvote_count: 0,
          downvote_count: 0,
          total_vote_count: 0,
          vote_score: 0,
          last_vote_sync: new Date().toISOString(),
          version: 1,
          locked_by: null,
          locked_at: null,
        })
      }
    }

    // Delete existing elements and insert new ones
    await supabase.from('elements').delete().eq('document_id', documentId)

    if (newElements.length > 0) {
      const { error } = await supabase.from('elements').insert(newElements)
      if (error) throw error
    }

    fetchElements()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-6 text-center">
          <h1 className="text-2xl font-bold">Document not found</h1>
          <p className="text-muted-foreground">The document you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto py-6">
        {/* Document Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{document.title}</h1>
            <p className="text-muted-foreground">
              {document.word_count} words • {document.estimated_read_time} min read
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => saveDocument(document.content)}
              disabled={saving}
              variant="outline"
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Editor Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="elements">Elements ({elements.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <MarkdownEditor
                  initialContent={document.content}
                  onSave={saveDocument}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  {document.content.split('\n').map((line, index) => {
                    if (line.startsWith('# ')) {
                      return <h1 key={index} className="text-3xl font-bold mb-4">{line.slice(2)}</h1>
                    } else if (line.startsWith('## ')) {
                      return <h2 key={index} className="text-2xl font-semibold mb-3">{line.slice(3)}</h2>
                    } else if (line.startsWith('### ')) {
                      return <h3 key={index} className="text-xl font-medium mb-2">{line.slice(4)}</h3>
                    } else if (line.trim()) {
                      return <p key={index} className="mb-4">{line}</p>
                    }
                    return null
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="elements" className="mt-6">
            <ElementsList
              elements={elements}
              onElementUpdate={fetchElements}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}