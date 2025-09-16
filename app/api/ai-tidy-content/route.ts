import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      )
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    // Use AI to tidy up the content
    const tidiedContent = await tidyContentWithAI(content)

    return NextResponse.json({ tidiedContent })
  } catch (error) {
    console.error('Error tidying content with AI:', error)
    return NextResponse.json(
      { error: 'Failed to tidy content with AI' },
      { status: 500 }
    )
  }
}

async function tidyContentWithAI(rawContent: string): Promise<string> {
  const prompt = `You are an expert document formatter. Transform the following messy text into clean, well-structured Markdown.

Requirements:
- Convert titles to appropriate heading levels (# for main title, ## for sections, ### for subsections)
- Structure sections and subsections logically
- Create proper lists where appropriate (- for bullet points)
- Clean up formatting and excessive whitespace
- Preserve all important content and information
- Use standard Markdown syntax
- Make it readable and professional
- Convert legal/bill formatting appropriately
- Handle document metadata (dates, bill numbers, etc.) with proper emphasis
- Remove line numbers and formatting artifacts

Important: Return ONLY the cleaned Markdown content, no explanation or wrapper text.

Input text:
${rawContent}`

  const response = await openai.chat.completions.create({
    model: 'anthropic/claude-3.5-sonnet', // Supports zero data retention
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.1, // Low temperature for consistent formatting
    max_tokens: 4000, // Allow for substantial content
  })

  const tidiedContent = response.choices[0]?.message?.content?.trim()

  if (!tidiedContent) {
    throw new Error('No content returned from AI')
  }

  return tidiedContent
}