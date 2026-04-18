import { NextRequest, NextResponse } from 'next/server'
import type { GeneratedProjectPayload } from '@/lib/trip-project'
import type { CultureCode } from '@/lib/culture-data'
import { DEFAULT_GOOGLE_INFERENCE_MODEL } from '@/lib/prompts/models'
import {
  buildTripGenerateUserPrompt,
  TRIP_GENERATION_SYSTEM_PROMPT,
} from '@/lib/prompts/trip'

const MODEL = process.env.GOOGLE_TRIP_MODEL || DEFAULT_GOOGLE_INFERENCE_MODEL

const CULTURE_CODES: Record<string, CultureCode> = {
  japan: 'jp', tokyo: 'jp',
  france: 'fr', paris: 'fr',
  uae: 'ae', dubai: 'ae',
  thailand: 'th', bangkok: 'th',
  italy: 'it', rome: 'it',
  australia: 'au', sydney: 'au',
}

function guessCultureCode(destination: string): CultureCode {
  const lower = destination.toLowerCase()
  for (const [key, code] of Object.entries(CULTURE_CODES)) {
    if (lower.includes(key)) return code
  }
  return 'jp'
}

function guessAirportCode(destination: string): string {
  const lower = destination.toLowerCase()
  if (lower.includes('tokyo') || lower.includes('japan')) return 'NRT'
  if (lower.includes('paris') || lower.includes('france')) return 'CDG'
  if (lower.includes('dubai') || lower.includes('uae')) return 'DXB'
  if (lower.includes('bangkok') || lower.includes('thailand')) return 'BKK'
  if (lower.includes('rome') || lower.includes('italy')) return 'FCO'
  if (lower.includes('sydney') || lower.includes('australia')) return 'SYD'
  if (lower.includes('london')) return 'LHR'
  if (lower.includes('amsterdam')) return 'AMS'
  if (lower.includes('lisbon')) return 'LIS'
  return 'LHR'
}

function guessCoords(destination: string): { lat: number; lng: number } {
  const lower = destination.toLowerCase()
  if (lower.includes('tokyo')) return { lat: 35.6762, lng: 139.6503 }
  if (lower.includes('paris')) return { lat: 48.8566, lng: 2.3522 }
  if (lower.includes('dubai')) return { lat: 25.2048, lng: 55.2708 }
  if (lower.includes('bangkok')) return { lat: 13.7563, lng: 100.5018 }
  if (lower.includes('rome')) return { lat: 41.9028, lng: 12.4964 }
  if (lower.includes('sydney')) return { lat: -33.8688, lng: 151.2093 }
  if (lower.includes('london')) return { lat: 51.5074, lng: -0.1278 }
  if (lower.includes('amsterdam')) return { lat: 52.3676, lng: 4.9041 }
  if (lower.includes('lisbon')) return { lat: 38.7169, lng: -9.1399 }
  return { lat: 48.8566, lng: 2.3522 }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_AI_API_KEY not configured' }, { status: 500 })
  }

  const body = await req.json()
  const {
    destination,
    budget,
    startDate,
    endDate,
    travelers,
    fromCode,
    vibe,
  } = body as {
    destination: string
    budget?: string
    startDate?: string
    endDate?: string
    travelers?: number
    fromCode?: string
    vibe?: string[]
  }

  const userPrompt = buildTripGenerateUserPrompt({
    destination,
    budget,
    startDate,
    endDate,
    travelers,
    fromCode,
    vibe,
  })

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: TRIP_GENERATION_SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error('Gemini API error:', err)
      return NextResponse.json({ error: 'AI generation failed', detail: err }, { status: 502 })
    }

    const data = await response.json()
    const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    let parsed: Record<string, unknown>
    try {
      const clean = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      console.error('Failed to parse AI response:', rawText)
      return NextResponse.json({ error: 'AI returned invalid JSON', raw: rawText }, { status: 502 })
    }

    // Build the payload with fallbacks for any missing fields
    const coords = guessCoords(destination)
    const payload: GeneratedProjectPayload = {
      trip: {
        name: (parsed.tripName as string) || `${destination} Trip`,
        meta: (parsed.tripMeta as string) || destination,
        destination: {
          name: (parsed.destinationName as string) || destination,
          lat: (parsed.destinationLat as number) ?? coords.lat,
          lng: (parsed.destinationLng as number) ?? coords.lng,
        },
      },
      cultureCode: (parsed.cultureCode as CultureCode) || guessCultureCode(destination),
      flightSearch: {
        fromCode: (parsed.fromAirportCode as string) || fromCode || 'YUL',
        toCode: (parsed.toAirportCode as string) || guessAirportCode(destination),
        departDate: (parsed.departDate as string) || startDate || '2026-06-01',
        returnDate: (parsed.returnDate as string) || endDate || '2026-06-15',
        adults: (parsed.adults as number) || travelers || 1,
      },
      notes: Array.isArray(parsed.notes)
        ? (parsed.notes as GeneratedProjectPayload['notes'])
        : [],
      todos: Array.isArray(parsed.todos)
        ? (parsed.todos as GeneratedProjectPayload['todos'])
        : [],
      chatIntro: (parsed.chatIntro as string) || undefined,
      summary: (parsed.summary as string) || undefined,
    }

    return NextResponse.json(payload)
  } catch (err) {
    console.error('Trip generation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
