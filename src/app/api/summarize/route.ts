import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { transcript, projectId } = await req.json()

    if (!transcript?.trim()) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 })
    }

    const suffix = ' [transcript truncated]'
    const truncated = transcript.length > 12000
      ? transcript.slice(0, 12000) + suffix
      : transcript

    const systemPrompt = [
      'You are a construction project assistant for Moderne Development Inc (MDI).',
      'Summarize the following meeting transcript into a concise project log entry.',
      'Format: 2-3 sentence overview, Key decisions (max 4 bullets),',
      'Action items with owner (max 4 bullets), Blockers or risks.',
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
        model: 'claude-sonnet-4-20250514',
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
