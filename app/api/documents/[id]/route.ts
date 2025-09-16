import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabase()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const documentId = params.id

    // First, check if the document exists and if the user owns it
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('id, author_id, title')
      .eq('id', documentId)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if the current user is the author
    if (document.author_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own documents' }, { status: 403 })
    }

    // Delete the document (cascade delete will handle elements and votes)
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      console.error('Error deleting document:', deleteError)
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Document deleted successfully',
      documentId,
      title: document.title
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}