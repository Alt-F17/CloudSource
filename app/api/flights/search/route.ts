import { NextResponse } from 'next/server'

import { getAirportByCode } from '@/lib/airports'
import type { FlightSearchInput } from '@/lib/flight-types'
import { buildMockFlightResult } from '@/lib/mock-flights'

function asDateOrFallback(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : fallback
}

function asAirportCode(value: unknown, fallbackCode: string) {
  if (typeof value !== 'string') return fallbackCode

  const code = value.trim().toUpperCase().slice(0, 3)
  if (!code) return fallbackCode

  const airport = getAirportByCode(code)
  return airport.lat === 0 && airport.lng === 0 ? fallbackCode : airport.code
}

function normalizeInput(body: unknown): FlightSearchInput {
  const src = (body ?? {}) as Partial<FlightSearchInput>

  const fromCode = asAirportCode(src.fromCode, 'YUL')
  const toCode = asAirportCode(src.toCode, fromCode === 'NRT' ? 'CDG' : 'NRT')
  const adults = typeof src.adults === 'number' && Number.isFinite(src.adults)
    ? Math.max(1, Math.min(9, Math.floor(src.adults)))
    : 1

  const departDate = asDateOrFallback(src.departDate, '2026-05-15')
  const returnDate =
    typeof src.returnDate === 'string' && src.returnDate.trim()
      ? asDateOrFallback(src.returnDate, '2026-05-28')
      : undefined

  return {
    fromCode,
    toCode: toCode === fromCode ? (fromCode === 'NRT' ? 'CDG' : 'NRT') : toCode,
    departDate,
    returnDate,
    adults,
  }
}

export async function POST(request: Request) {
  const input = normalizeInput(await request.json().catch(() => ({})))
  return NextResponse.json(buildMockFlightResult(input))
}
