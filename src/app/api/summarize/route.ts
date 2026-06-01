import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { transcript, projectId } = await req.json()

    if (!transcript?.trim()) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 })
    }

    const truncated = transcript.length > 12000
      ? transcript.slice(0, 12000) + "

[transcript truncated]"
      : transcript

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
        system: "You are a construction project assistant for Moderne Development, Inc. (MDI), a technology company building AI-powered construction workflows using 3D concrete printing (3DCP) and BIM automation. Summarize the following meeting transcript or AI notetaker output into a concise project communication log entry. Format it as: a 2-3 sentence overview of what was discussed, Key decisions made (bullet points max 4), Action items and next steps (bullet points with owner if mentioned max 4), Any blockers or risks flagged. Keep it factual, professional, and under 250 words. Do not add any preamble, start directly with the summary.",
        messages: [{
          role: 'user',
          content: "Project ID: " + (projectId || 'unknown') + "

Meeting transcript:

" + truncated
        }]
      })
    })

    if (!response.ok) {
      const err = await response.json()
      return NextResponse.json(
        { error: err?.error?.message || ('Anthropic API error ' + response.status) },
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
