'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Save, Wand2, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownEditorProps {
  initialContent: string
  onSave: (content: string, title?: string) => void
}

export function MarkdownEditor({ initialContent, onSave }: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [title, setTitle] = useState('')
  const [isTidying, setIsTidying] = useState(false)
  const [isAiTidying, setIsAiTidying] = useState(false)

  useEffect(() => {
    setContent(initialContent)
    // Extract title from first line if it's a heading
    const firstLine = initialContent.split('\n')[0]
    if (firstLine.startsWith('# ')) {
      setTitle(firstLine.slice(2))
    }
  }, [initialContent])

  const handleSave = useCallback(() => {
    onSave(content, title)
  }, [content, title, onSave])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  }, [handleSave])

  const handleTidyContent = useCallback(async () => {
    if (!content.trim()) return

    setIsTidying(true)
    try {
      const response = await fetch('/api/tidy-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        throw new Error('Failed to tidy content')
      }

      const { tidiedContent } = await response.json()
      setContent(tidiedContent)

      // Extract new title from tidied content
      const firstLine = tidiedContent.split('\n')[0]
      if (firstLine.startsWith('# ')) {
        setTitle(firstLine.slice(2))
      }
    } catch (error) {
      console.error('Error tidying content:', error)
      // TODO: Show error toast/notification
    } finally {
      setIsTidying(false)
    }
  }, [content])

  const handleAiTidyContent = useCallback(async () => {
    if (!content.trim()) return

    setIsAiTidying(true)
    try {
      const response = await fetch('/api/ai-tidy-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        throw new Error('Failed to tidy content with AI')
      }

      const { tidiedContent } = await response.json()
      setContent(tidiedContent)

      // Extract new title from AI-tidied content
      const firstLine = tidiedContent.split('\n')[0]
      if (firstLine.startsWith('# ')) {
        setTitle(firstLine.slice(2))
      }
    } catch (error) {
      console.error('Error tidying content with AI:', error)
      // Show user-friendly error message
      if (error instanceof Error && error.message.includes('Failed to tidy content with AI')) {
        alert('AI Tidy feature requires an OpenRouter API key. Please check the console for setup instructions.')
        console.log('💡 To enable AI Tidy:\n1. Get API key: https://openrouter.ai/keys\n2. Add to .env.local: OPENROUTER_API_KEY=your_key_here\n3. Restart dev server')
      }
    } finally {
      setIsAiTidying(false)
    }
  }, [content])

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-2xl font-bold bg-transparent border-none outline-none flex-1"
            placeholder="Document title..."
          />
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleTidyContent}
              disabled={isTidying || isAiTidying || !content.trim()}
              variant="outline"
              size="sm"
              title="Fast rule-based tidying for legal documents"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {isTidying ? 'Tidying...' : 'Tidy'}
            </Button>
            <Button
              onClick={handleAiTidyContent}
              disabled={isTidying || isAiTidying || !content.trim()}
              variant="outline"
              size="sm"
              title="AI-powered intelligent content formatting"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isAiTidying ? 'AI Tidying...' : 'AI Tidy'}
            </Button>
            <Button onClick={handleSave} size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-full min-h-[500px] resize-none border-none outline-none font-mono text-sm"
            placeholder="Start writing your document here...

# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*

- List item 1
- List item 2

> Blockquote

```
Code block
```"
          />
        </div>

        <div className="flex-1 p-4 border-l bg-muted/20 overflow-y-auto">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Live Preview</h3>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({children}) => <h1 className="text-3xl font-bold mb-4 text-foreground">{children}</h1>,
                h2: ({children}) => <h2 className="text-2xl font-semibold mb-3 text-foreground">{children}</h2>,
                h3: ({children}) => <h3 className="text-xl font-medium mb-2 text-foreground">{children}</h3>,
                h4: ({children}) => <h4 className="text-lg font-medium mb-2 text-foreground">{children}</h4>,
                p: ({children}) => <p className="mb-4 text-foreground leading-relaxed">{children}</p>,
                ul: ({children}) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
                li: ({children}) => <li className="text-foreground">{children}</li>,
                blockquote: ({children}) => (
                  <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-4 text-muted-foreground">
                    {children}
                  </blockquote>
                ),
                code: ({children, ...props}: any) => {
                  const inline = !('className' in props && props.className?.includes('language-'))
                  return inline ? (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                  ) : (
                    <code className="block bg-muted p-3 rounded-md font-mono text-sm overflow-x-auto my-4">{children}</code>
                  )
                },
                pre: ({children}) => <pre className="bg-muted rounded-md overflow-x-auto my-4">{children}</pre>,
                strong: ({children}) => <strong className="font-bold text-foreground">{children}</strong>,
                em: ({children}) => <em className="italic">{children}</em>,
                hr: () => <hr className="border-t border-muted-foreground/30 my-6" />,
                a: ({href, children}) => (
                  <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
                table: ({children}) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full border border-muted">{children}</table>
                  </div>
                ),
                thead: ({children}) => <thead className="bg-muted">{children}</thead>,
                tbody: ({children}) => <tbody>{children}</tbody>,
                tr: ({children}) => <tr className="border-b border-muted">{children}</tr>,
                th: ({children}) => <th className="px-4 py-2 text-left font-semibold">{children}</th>,
                td: ({children}) => <td className="px-4 py-2 border-r border-muted last:border-r-0">{children}</td>,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}