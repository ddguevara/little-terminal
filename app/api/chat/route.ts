import { NextResponse } from 'next/server'

type ChatPayload = {
  message: string
  sessionId?: string | null
}

const DEFAULT_PYTHON_URL = process.env.PYTHON_SERVICE_URL ?? 'http://localhost:8000'

export async function POST(request: Request) {
  const body = (await request.json()) as ChatPayload
  const payload: ChatPayload = {
    message: String(body.message ?? ''),
  }
  if (body.sessionId) {
    payload.sessionId = body.sessionId
  }

  try {
    const response = await fetch(`${DEFAULT_PYTHON_URL}/llm/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        {
          sessionId: payload.sessionId ?? null,
          lines: ['Temporary outage contacting the Gemini bridge.'],
          secretRevealed: false,
          anxietyLevel: 80,
          anxietyDelta: 10,
          mentionedMan: false,
          mode: 'error',
          filesystemListing: [],
          fileContent: '',
          error: `LLM bridge error ${response.status}: ${errorText}`,
        },
        { status: 502 }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error contacting Gemini bridge:', error)
    return NextResponse.json(
      {
        sessionId: payload.sessionId ?? null,
        lines: ['Link to bridge lost. Panic... contained?'],
        secretRevealed: false,
        anxietyLevel: 85,
        anxietyDelta: 15,
        mentionedMan: false,
        mode: 'error',
        filesystemListing: [],
        fileContent: '',
      },
      { status: 502 }
    )
  }
}
