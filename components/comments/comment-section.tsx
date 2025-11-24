'use client'

import { useState, useEffect } from 'react'
import { createClientSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatRelativeTime } from '@/lib/utils'
import { Send, MessageCircle, AlertCircle } from 'lucide-react'
import type { Database } from '@/lib/database.types'

// TODO: Add comments table to database schema
type Comment = {
  id: string
  element_id: string
  content: string
  author_id: string | null
  created_at: string
  updated_at: string
  is_resolved?: boolean
  username?: string
}

interface CommentSectionProps {
  elementId: string
  onCommentUpdate: () => void
}

export function CommentSection({ elementId, onCommentUpdate }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const supabase = createClientSupabase()

  useEffect(() => {
    fetchComments()
    checkAuthStatus()
  }, [elementId])

  const checkAuthStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setIsAuthenticated(true)
      setUserEmail(user.email || null)
    } else {
      setIsAuthenticated(false)
      setUserEmail(null)
    }
  }

  const fetchComments = async () => {
    setLoading(true)
    try {
      // TODO: Implement when comments table exists
      // const { data, error } = await supabase
      //   .from('comments')
      //   .select('*')
      //   .eq('element_id', elementId)
      //   .eq('is_deleted', false)
      //   .order('created_at', { ascending: true })

      // if (error) throw error
      // setComments(data || [])
      setComments([])
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || submitting) return

    setSubmitting(true)

    try {
      // TODO: Implement when comments table exists
      // const { data: user } = await supabase.auth.getUser()
      // if (!user.user) return

      // const { error } = await supabase
      //   .from('comments')
      //   .insert({
      //     element_id: elementId,
      //     user_id: user.user.id,
      //     content: newComment.trim(),
      //   })

      // if (error) throw error

      setNewComment('')
      // fetchComments()
      // onCommentUpdate()

    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const getUserInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase()
  }

  return (
    <div className="bg-white rounded-lg overflow-hidden">
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-4 h-4" />
          <h4 className="font-medium">Comments ({comments.length})</h4>
        </div>

        {/* Comment Form */}
        {isAuthenticated ? (
          <form onSubmit={handleSubmitComment} className="flex gap-2">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              disabled={submitting}
            />
            <Button type="submit" disabled={!newComment.trim() || submitting} size="sm">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">Sign in required</p>
                <p className="text-sm text-amber-800 mt-1">
                  Please sign in to comment on this document.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-3">
        {loading ? (
          <div className="text-center text-muted-foreground py-4">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          isAuthenticated ? (
            <div className="text-center text-muted-foreground py-4">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              No comments yet.
            </div>
          )
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="border-l-2 border-l-blue-200">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">
                      U
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        Anonymous User
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(comment.created_at)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {comment.content}
                    </p>

                    {comment.is_resolved && (
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          Resolved
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        </div>
      </div>
    </div>
  )
}