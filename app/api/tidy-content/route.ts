import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      )
    }

    // AI processing to tidy up the content and convert to clean markdown
    const tidiedContent = await tidyContentWithAI(content)

    return NextResponse.json({ tidiedContent })
  } catch (error) {
    console.error('Error tidying content:', error)
    return NextResponse.json(
      { error: 'Failed to tidy content' },
      { status: 500 }
    )
  }
}

async function tidyContentWithAI(rawContent: string): Promise<string> {
  // Simple AI-like processing to clean up the content
  // This simulates what an AI would do to convert messy content to clean markdown

  let cleaned = rawContent

  // Remove excessive whitespace and normalize line breaks
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  cleaned = cleaned.trim()

  const lines = cleaned.split('\n')
  const processedLines: string[] = []
  let inCodeBlock = false
  let currentSection = ''

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim()

    if (!line) {
      processedLines.push('')
      continue
    }

    // Handle common document patterns

    // Main title detection (usually first significant line or ALL CAPS)
    if (i < 5 && (line === line.toUpperCase() && line.length > 10 && !line.includes('['))) {
      processedLines.push(`# ${line.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}`)
      continue
    }

    // Bill number and status patterns
    if (line.match(/^\[AS INTRODUCED\]$/) || line.match(/^Bill \d+/)) {
      processedLines.push(`*${line}*`)
      continue
    }

    // Contents/Table of contents
    if (line.toUpperCase() === 'CONTENTS') {
      processedLines.push('## Contents')
      continue
    }

    // Section headers (numbered items at start of line)
    if (line.match(/^\d+\s+[A-Z]/)) {
      const match = line.match(/^(\d+)\s+(.+)/)
      if (match) {
        processedLines.push(`## ${match[1]}. ${match[2]}`)
        currentSection = match[2]
        continue
      }
    }

    // Subsection headers (letters or numbers in parentheses)
    if (line.match(/^\([a-z]\)/) || line.match(/^\(\d+\)/)) {
      processedLines.push(`### ${line}`)
      continue
    }

    // Legal document structure - clauses starting with capital letters
    if (line.match(/^\([a-z]\)\s*[A-Z]/)) {
      processedLines.push(`- ${line}`)
      continue
    }

    // Handle "A BILL TO" pattern
    if (line === 'A' && i + 1 < lines.length && lines[i + 1].trim() === 'BILL') {
      // Skip these formatting lines, we'll process "TO" section
      continue
    }
    if (line === 'BILL' && i > 0 && lines[i - 1].trim() === 'A') {
      continue
    }
    if (line === 'TO' && i > 0 &&
        (lines[i - 1].trim() === 'BILL' || lines[i - 2]?.trim() === 'BILL')) {
      processedLines.push('## Purpose')
      continue
    }

    // Long paragraphs that come after "TO" - these are purpose statements
    if (currentSection === '' && line.length > 50 &&
        line.match(/^[A-Z][a-z]/)) {
      processedLines.push(`${line}`)
      continue
    }

    // "BE IT ENACTED" clause
    if (line.startsWith('B E IT ENACTED') || line.startsWith('BE IT ENACTED')) {
      processedLines.push('## Enactment Clause')
      processedLines.push(`*${line}*`)
      continue
    }

    // Copyright and publication info
    if (line.includes('© Parliamentary copyright') ||
        line.includes('PUBLISHED BY THE AUTHORITY') ||
        line.includes('House of Commons')) {
      processedLines.push(`*${line}*`)
      continue
    }

    // Handle line numbers (5, 10, 15, etc.) by removing them
    if (line.match(/^\d+$/) && parseInt(line) % 5 === 0) {
      continue
    }

    // Handle subsection numbering (1), (2), (3)
    if (line.match(/^\(\d+\)/)) {
      processedLines.push(`### ${line}`)
      continue
    }

    // Handle lettered subsections (a), (b), (c)
    if (line.match(/^\([a-z]\)/)) {
      processedLines.push(`- ${line}`)
      continue
    }

    // Regular paragraphs - if they start with capital letter and are substantial
    if (line.match(/^[A-Z]/) && line.length > 20) {
      processedLines.push(line)
      continue
    }

    // Handle dates and names
    if (line.match(/^\d{1,2}(st|nd|rd|th)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/)) {
      processedLines.push(`**Date:** ${line}`)
      continue
    }

    // Handle "Presented by" lines
    if (line.startsWith('Presented by')) {
      processedLines.push(`**${line}**`)
      continue
    }

    // Handle "Ordered by" lines
    if (line.startsWith('Ordered')) {
      processedLines.push(`*${line}*`)
      continue
    }

    // Default: add the line as is if it's not empty
    if (line) {
      processedLines.push(line)
    }
  }

  // Post-processing cleanup
  let result = processedLines.join('\n')

  // Clean up multiple consecutive empty lines
  result = result.replace(/\n{3,}/g, '\n\n')

  // Ensure proper spacing around headers
  result = result.replace(/\n(#{1,3}\s)/g, '\n\n$1')
  result = result.replace(/(#{1,3}\s[^\n]+)\n([^\n#])/g, '$1\n\n$2')

  return result.trim()
}