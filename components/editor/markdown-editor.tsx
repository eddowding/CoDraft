'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'

interface MarkdownEditorProps {
  initialContent: string
  onSave: (content: string, title?: string) => void
}

export function MarkdownEditor({ initialContent, onSave }: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [title, setTitle] = useState('')

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
          <Button onClick={handleSave} size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
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

        <div className="flex-1 p-4 border-l bg-muted/20">
          <div className="prose max-w-none">
            <h3 className="text-lg font-semibold mb-4">Live Preview</h3>
            <div className="space-y-4">
              {content.split('\n').map((line, index) => {
                if (line.startsWith('# ')) {
                  return <h1 key={index} className="text-3xl font-bold">{line.slice(2)}</h1>
                } else if (line.startsWith('## ')) {
                  return <h2 key={index} className="text-2xl font-semibold">{line.slice(3)}</h2>
                } else if (line.startsWith('### ')) {
                  return <h3 key={index} className="text-xl font-medium">{line.slice(4)}</h3>
                } else if (line.startsWith('> ')) {
                  return <blockquote key={index} className="border-l-4 border-muted pl-4 italic">{line.slice(2)}</blockquote>
                } else if (line.startsWith('- ') || line.startsWith('* ')) {
                  return <li key={index} className="ml-4">{line.slice(2)}</li>
                } else if (line.startsWith('```')) {
                  return <code key={index} className="block bg-muted p-2 rounded font-mono text-sm">{line.slice(3)}</code>
                } else if (line.trim()) {
                  // Handle bold and italic text
                  let processedLine = line
                  processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  processedLine = processedLine.replace(/\*(.*?)\*/g, '<em>$1</em>')

                  return <p key={index} dangerouslySetInnerHTML={{ __html: processedLine }} />
                }
                return <br key={index} />
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}