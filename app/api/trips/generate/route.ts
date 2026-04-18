import { NextResponse } from 'next/server'

import type { CultureCode } from '@/lib/culture-data'
import type { GeneratedProjectPayload } from '@/lib/trip-project'
import { DEFAULT_GOOGLE_INFERENCE_MODEL } from '@/lib/prompts/models'
import { buildTripsGeneratePrompt } from '@/lib/prompts/trip'

type GenerateBody = {
  tripName?: string
  destination?: string
  origin?: string
  startDate?: string
  endDate?: string
  travelers?: number
  budget?: string
  vibe?: string
  notes?: string
}

function buildFallbackPayload(body: GenerateBody): GeneratedProjectPayload {
  const destination = body.destination?.trim() || 'Tokyo'
  const tripName = body.tripName?.trim() || `${destination} Project`
  const startDate = body.startDate || '2026-05-15'
  const endDate = body.endDate || '2026-05-28'
  const origin = (body.origin || 'YUL').toUpperCase().slice(0, 3)
  const destinationCode = destination.toLowerCase().includes('paris')
    ? 'CDG'
    : destination.toLowerCase().includes('dubai')
      ? 'DXB'
      : 'NRT'

  return {
    trip: {
      name: tripName,
      meta: `${destination} - ${startDate}`,
      destination: {
        name: destination,
        lat: destinationCode === 'CDG' ? 48.8566 : destinationCode === 'DXB' ? 25.2048 : 35.6762,
        lng: destinationCode === 'CDG' ? 2.3522 : destinationCode === 'DXB' ? 55.2708 : 139.6503,
      },
    },
    cultureCode:
      destinationCode === 'CDG' ? 'fr' : destinationCode === 'DXB' ? 'ae' : ('jp' as CultureCode),
    flightSearch: {
      fromCode: origin,
      toCode: destinationCode,
      departDate: startDate,
      returnDate: endDate,
      adults: Math.max(1, body.travelers || 1),
    },
    notes: [
      {
        title: `${tripName} Overview`,
        preview: `${destination} trip generated from planning inputs.`,
        content: `Budget: ${body.budget || 'Flexible'}\nVibe: ${body.vibe || 'Balanced'}\nNotes: ${body.notes || 'None provided'}`,
        date: new Date().toISOString().slice(0, 10),
      },
    ],
    todos: [
      { text: 'Review generated flights', group: 'before' },
      { text: 'Compare neighborhoods and stays', group: 'before' },
      { text: 'Prepare packing list', group: 'packing' },
      { text: 'Lock top activities', group: 'activities' },
    ],
    chatIntro: `Project generated for ${destination}. Review the populated sections and refine the details.`,
    summary: `Generated fallback project for ${destination}.`,
  }
}

function extractJson(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)
  if (fenced?.[1]) return fenced[1]
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return text.slice(start, end + 1)
  return text
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as GenerateBody
  const apiKey = process.env.GOOGLE_AI_API_KEY
  const model = process.env.GOOGLE_TRIP_MODEL || DEFAULT_GOOGLE_INFERENCE_MODEL

  if (!apiKey) {
    return NextResponse.json(buildFallbackPayload(body))
  }

  const prompt = buildTripsGeneratePrompt(body)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!response.ok) {
      return NextResponse.json(buildFallbackPayload(body))
    }

    const data = await response.json()
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || '')
        .join('') || ''
    const payload = JSON.parse(extractJson(text)) as GeneratedProjectPayload
    return NextResponse.json(payload)
  } catch {
    return NextResponse.json(buildFallbackPayload(body))
  }
}
