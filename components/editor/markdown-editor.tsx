'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Save, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useToast } from '@/hooks/use-toast'

interface MarkdownEditorProps {
  initialContent: string
  onSave: (content: string) => void
  onChange?: (content: string) => void
  onTitleChange?: (title: string) => void
  onAiTidy?: () => void
  isAiTidying?: boolean
  readOnly?: boolean
}

export function MarkdownEditor({ initialContent, onSave, onChange, onTitleChange, onAiTidy, isAiTidying: externalIsAiTidying, readOnly = false }: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [isAiTidying, setIsAiTidying] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setContent(initialContent)
  }, [initialContent])

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
    if (onChange) {
      onChange(newContent)
    }
  }, [onChange])

  const handleSave = useCallback(() => {
    onSave(content)
  }, [content, onSave])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  }, [handleSave])


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

      const { tidiedContent, generatedTitle } = await response.json()
      setContent(tidiedContent)
      handleContentChange(tidiedContent)

      // Update the title if a callback is provided and we have a generated title
      if (onTitleChange && generatedTitle) {
        onTitleChange(generatedTitle)
      }
    } catch (error) {
      console.error('Error tidying content with AI:', error)
      // Show user-friendly error message
      if (error instanceof Error && error.message.includes('Failed to tidy content with AI')) {
        toast({
          title: 'AI Tidy Unavailable',
          description: 'AI Tidy feature requires an OpenRouter API key. Check the console for setup instructions.',
          variant: 'destructive',
        })
        console.log('💡 To enable AI Tidy:\n1. Get API key: https://openrouter.ai/keys\n2. Add to .env.local: OPENROUTER_API_KEY=your_key_here\n3. Restart dev server')
      }
    } finally {
      setIsAiTidying(false)
    }
  }, [content, onTitleChange])

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex">
        <div className="flex-1 p-4">
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            disabled={readOnly}
            className={`w-full h-full min-h-[500px] resize-none border-none outline-none font-mono text-sm ${readOnly ? 'bg-muted/50 cursor-not-allowed opacity-75' : ''}`}
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