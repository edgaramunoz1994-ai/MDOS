import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

async function extractText(base64Data: string, mimeType: string, fileName: string): Promise<string> {
  const buffer = Buffer.from(base64Data, 'base64')

  // DOCX — use mammoth
  if (fileName.endsWith('.docx') || mimeType.includes('wordprocessingml') || mimeType.includes('msword')) {
    const result = await mammoth.extractRawText({ buffer })
    return result.value || ''
  }

  // Plain text, markdown, CSV — decode as UTF-8
  if (
    mimeType.startsWith('text/') ||
    fileName.endsWith('.txt') ||
    fileName.endsWith('.md') ||
    fileName.endsWith('.csv')
  ) {
    return buffer.toString('utf-8')
  }

  // PDF — extract text layer (basic, no binary parsing library needed)
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    const text = buffer.toString('latin1')
    // Extract readable text between PDF stream markers
    const chunks: string[] = []
    const regex = /BT[\s\S]*?ET/g
    let match
    while ((match = regex.exec(text)) !== null) {
      const block = match[0]
      const strings = block.match(/\(([^)]{2,})\)/g) || []
      strings.forEach(s => chunks.push(s.slice(1, -1)))
    }
    const extracted = chunks.join(' ').replace(/\n/g, ' ').replace(/\r/g, '').trim()
    return extracted.length > 100 ? extracted : buffer.toString('utf-8').replace(/[^ -~
	]/g, ' ').replace(/\s{3,}/g, ' ').trim()
  }

  // Fallback — strip non-printable characters
  return buffer.toString('utf-8').replace(/[^ -~
	]/g, ' ').replace(/\s{3,}/g, ' ').trim()
}

export async function POST(req: NextRequest) {
  try {
    const { base64Data, mimeType, fileName, projectId } = await req.json()

    if (!base64Data) {
      return NextResponse.json({ error: 'No file data provided' }, { status: 400 })
    }

    let transcript = ''
    try {
      transcript = await extractText(base64Data, mimeType || '', fileName || '')
    } catch (parseErr: any) {
      return NextResponse.json({ error: 'Could not parse file: ' + parseErr.message }, { status: 422 })
    }

    if (!transcript || transcript.trim().length < 20) {
      return NextResponse.json({ error: 'File appears empty or unreadable. Please try a .txt or .md file.' }, { status: 422 })
    }

    const suffix = ' [transcript truncated]'
    const truncated = transcript.length > 12000 ? transcript.slice(0, 12000) + suffix : transcript

    const systemPrompt = [
      'You are a construction project assistant for Moderne Development Inc (MDI).',
      'Summarize the following meeting transcript into a concise project communication log entry.',
      'Format: 2-3 sentence overview, Key decisions (max 4 bullets),',
      'Action items with owner if mentioned (max 4 bullets), Blockers or risks.',
      'Under 250 words. No preamble. Start directly with the summary.',
    ].join(' ')

    const userMsg = 'Project: ' + (projectId || 'unknown') + ' --- Transcript: ' + truncated

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }]
      })
    })

    if (!response.ok) {
      const err = await response.json()
      return NextResponse.json(
        { error: err?.error?.message || ('API error ' + response.status) },
        { status: response.status }
      )
    }

    const data = await response.json()
    const summary = data.content?.find((b: any) => b.type === 'text')?.text || ''

    if (!summary) {
      return NextResponse.json({ error: 'No summary returned' }, { status: 500 })
    }

    return NextResponse.json({ summary })

  } catch (err: any) {
    console.error('[summarize] error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
