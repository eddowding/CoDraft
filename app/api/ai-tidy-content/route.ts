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

    // Use AI to tidy up the content and generate a title
    const { tidiedContent, generatedTitle } = await tidyContentWithAI(content)

    return NextResponse.json({ tidiedContent, generatedTitle })
  } catch (error) {
    console.error('Error tidying content with AI:', error)
    return NextResponse.json(
      { error: 'Failed to tidy content with AI' },
      { status: 500 }
    )
  }
}

async function tidyContentWithAI(rawContent: string): Promise<{ tidiedContent: string; generatedTitle: string }> {
  const prompt = `You are an expert document formatter. Transform the following messy text into clean, well-structured Markdown and generate an appropriate title.

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

Return your response in this exact JSON format:
{
  "title": "A concise, descriptive title for the document (3-8 words)",
  "content": "The cleaned Markdown content here"
}

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON, no explanation or wrapper text
- Escape all special characters properly in JSON strings
- Use \\n for line breaks within the content string
- No control characters or invalid JSON characters
- Test that your response is valid JSON before returning

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

  const responseContent = response.choices[0]?.message?.content?.trim()

  if (!responseContent) {
    throw new Error('No content returned from AI')
  }

  try {
    // Clean the response content to handle potential control characters
    const cleanedContent = responseContent
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
      .trim()

    const parsed = JSON.parse(cleanedContent)

    // Validate the parsed response has the expected structure
    if (parsed && typeof parsed.content === 'string' && typeof parsed.title === 'string') {
      return {
        tidiedContent: parsed.content,
        generatedTitle: parsed.title
      }
    } else {
      throw new Error('Invalid response structure')
    }
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', error)
    console.error('Raw response:', responseContent)

    // Fallback: treat the entire response as tidied content and generate a simple title
    return {
      tidiedContent: responseContent,
      generatedTitle: 'AI Tidied Document'
    }
  }
}