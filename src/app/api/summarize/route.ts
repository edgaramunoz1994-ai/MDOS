import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'
import pdfParse from 'pdf-parse'

const MAX_B64_BYTES = 3 * 1024 * 1024 // 3MB base64 limit (~2.25MB file)

async function extractText(b64: string, mime: string, name: string): Promise<string> {
  const buf = Buffer.from(b64, 'base64')
  const lname = name.toLowerCase()

  if (lname.endsWith('.docx') || mime.includes('wordprocessingml') || mime.includes('msword')) {
    const r = await mammoth.extractRawText({ buffer: buf })
    return r.value || ''
  }

  if (lname.endsWith('.pdf') || mime === 'application/pdf') {
    try {
      const r = await pdfParse(buf, { max: 10 })
      const text = r.text || ''
      if (text.trim().length > 50) return text
      // Image-based PDF — return structured fallback so Claude can still respond
      return 'IMAGE_PDF:' + name
    } catch {
      return 'IMAGE_PDF:' + name
    }
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
    const body = await req.json()
    const { base64Data, mimeType, fileName, projectId, mode } = body

    if (!base64Data) {
      return NextResponse.json({ error: 'No file data provided' }, { status: 400 })
    }

    // Size check — reject files over 3MB base64 (prevents JSON parse timeout)
    if (base64Data.length > MAX_B64_BYTES) {
      return NextResponse.json({
        error: 'File too large for AI scan (max 2.5MB). Try splitting the PDF into smaller sections or converting to .txt.'
      }, { status: 413 })
    }

    let transcript = ''
    try {
      transcript = await extractText(base64Data, mimeType || '', fileName || '')
    } catch (e: any) {
      return NextResponse.json({ error: 'Could not parse file: ' + e.message }, { status: 422 })
    }

    const isImagePdf = transcript.startsWith('IMAGE_PDF:')
    const isExtract = mode === 'extract'

    // For image-based PDFs, tell Claude what we know and ask it to acknowledge
    const effectiveTranscript = isImagePdf
      ? 'This is a scanned image-based PDF named "' + fileName + '". The text layer could not be extracted. Please acknowledge this and suggest the user export as a text-based PDF or manually type the key data points (lot size, zoning, setbacks, etc.) into the form fields.'
      : transcript

    if (!isImagePdf && effectiveTranscript.trim().length < 20) {
      return NextResponse.json({
        error: 'File appears empty or unreadable. For scanned PDFs, try exporting as a text-based PDF or uploading a .txt version.'
      }, { status: 422 })
    }

    const suffix = ' [truncated]'
    const truncated = effectiveTranscript.length > 12000
      ? effectiveTranscript.slice(0, 12000) + suffix
      : effectiveTranscript

    const sys = isExtract ? [
      'You are a real estate and construction document analyst for MDI (Moderne Development Inc).',
      'Extract key parcel and site data from this document.',
      'Look for: lot size (acres or sqft), zoning code, setbacks (front/rear/side), easements,',
      'deed restrictions, lot dimensions, utilities, flood zone, survey date, legal description,',
      'building coverage, impervious cover, FAR, number of units allowed.',
      'Format as short labeled lines like "Lot size: 0.18 acres". Only include what is present.',
      'Under 200 words. No preamble.',
    ].join(' ') : [
      'You are a construction project assistant for Moderne Development Inc (MDI).',
      'Summarize the meeting transcript into a concise project communication log entry.',
      'Format: 2-3 sentence overview, Key decisions (max 4 bullets),',
      'Action items with owner if mentioned (max 4 bullets), Blockers or risks.',
      'Under 250 words. No preamble. Start directly with the summary.',
    ].join(' ')

    const userMsg = 'Project: ' + (projectId || 'unknown') + ' --- Document: ' + truncated

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
