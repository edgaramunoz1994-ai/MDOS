import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'
import pdfParse from 'pdf-parse'

async function extractText(b64: string, mime: string, name: string): Promise<string> {
  const buf = Buffer.from(b64, 'base64')
  const lname = name.toLowerCase()

  if (lname.endsWith('.docx') || mime.includes('wordprocessingml') || mime.includes('msword')) {
    const r = await mammoth.extractRawText({ buffer: buf })
    return r.value || ''
  }

  if (lname.endsWith('.pdf') || mime === 'application/pdf') {
    const r = await pdfParse(buf)
    return r.text || ''
  }

  if (lname.endsWith('.txt') || lname.endsWith('.md') || lname.endsWith('.csv') || mime.startsWith('text/')) {
    return buf.toString('utf-8')
  }

  const raw = buf.toString('utf-8')
  let out = ''
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i)
    if ((c >= 32 && c <= 126) || c === 10 || c === 13 || c === 9) {
      out += raw[i]
    } else {
      out += ' '
    }
  }
  return out.split('   ').filter(Boolean).join(' ').trim()
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
    } catch (e: any) {
      return NextResponse.json({ error: 'Could not parse file: ' + e.message }, { status: 422 })
    }

    if (!transcript || transcript.trim().length < 20) {
      return NextResponse.json({ error: 'File appears empty or unreadable. Try a .txt or .md file.' }, { status: 422 })
    }

    const suffix = ' [transcript truncated]'
    const truncated = transcript.length > 12000 ? transcript.slice(0, 12000) + suffix : transcript

    const sys = [
      'You are a construction project assistant for Moderne Development Inc (MDI).',
      'Summarize the meeting transcript into a concise project communication log entry.',
      'Format: 2-3 sentence overview, Key decisions (max 4 bullets),',
      'Action items with owner if mentioned (max 4 bullets), Blockers or risks.',
      'Under 250 words. No preamble. Start directly with the summary.',
    ].join(' ')

    const userMsg = 'Project: ' + (projectId || 'unknown') + ' --- Transcript: ' + truncated

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: sys,
        messages: [{ role: 'user', content: userMsg }]
      })
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: err?.error?.message || ('API error ' + res.status) }, { status: res.status })
    }

    const data = await res.json()
    const summary = data.content?.find((b: any) => b.type === 'text')?.text || ''

    if (!summary) return NextResponse.json({ error: 'No summary returned' }, { status: 500 })

    return NextResponse.json({ summary })

  } catch (err: any) {
    console.error('[summarize]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
