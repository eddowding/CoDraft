'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientSupabase } from '@/lib/supabase'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { FileText, ArrowLeft, Save } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const newDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().min(1, 'Content is required'),
  isPublic: z.boolean(),
  isCollaborative: z.boolean(),
})

type NewDocumentForm = z.infer<typeof newDocumentSchema>

export default function NewDocumentPage() {
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const supabase = createClientSupabase()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<NewDocumentForm>({
    resolver: zodResolver(newDocumentSchema),
    defaultValues: {
      title: '',
      content: '# Untitled Document\n\nStart writing...',
      isPublic: false,
      isCollaborative: false,
    },
  })

  const isPublic = watch('isPublic')
  const isCollaborative = watch('isCollaborative')

  const onSubmit = async (data: NewDocumentForm) => {
    setCreating(true)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        router.push('/auth')
        return
      }

      const { data: document, error } = await supabase
        .from('documents')
        .insert({
          title: data.title,
          content: data.content,
          author_id: user.user.id,
          is_public: data.isPublic,
          is_collaborative: data.isCollaborative,
          status: 'draft',
          word_count: data.content.split(/\s+/).length,
          estimated_read_time: Math.ceil(data.content.split(/\s+/).length / 200),
        })
        .select()
        .single()

      if (error) throw error

      // Redirect to the new document
      router.push(`/documents/${document.id}`)
    } catch (error) {
      console.error('Error creating document:', error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Create New Document</h1>
              <p className="text-muted-foreground">
                Start writing your new document
              </p>
            </div>
          </div>
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter document title..."
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Initial Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Start writing your document..."
                  rows={10}
                  {...register('content')}
                />
                {errors.content && (
                  <p className="text-sm text-destructive">{errors.content.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  You can use Markdown formatting. This is just the initial content - you can edit it further after creating the document.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Public/Private Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Visibility</Label>
                  <p className="text-sm text-muted-foreground">
                    {isPublic ? 'Anyone can view this document' : 'Only you and collaborators can view this document'}
                  </p>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={(checked: boolean) => setValue('isPublic', checked)}
                />
              </div>

              <Separator />

              {/* Collaborative Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Collaboration</Label>
                  <p className="text-sm text-muted-foreground">
                    {isCollaborative ? 'Allow others to edit this document' : 'Only you can edit this document'}
                  </p>
                </div>
                <Switch
                  checked={isCollaborative}
                  onCheckedChange={(checked: boolean) => setValue('isCollaborative', checked)}
                />
              </div>

              {isCollaborative && (
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> Collaborative documents allow invited users to edit content and vote on elements.
                    You can manage collaborators after creating the document.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard')}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              <Save className="w-4 h-4 mr-2" />
              {creating ? 'Creating...' : 'Create Document'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}