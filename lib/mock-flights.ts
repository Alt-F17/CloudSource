import { getAirportByCode } from '@/lib/airports'
import type { FlightItinerary, FlightSearchInput, FlightSearchResult, FlightSegment } from '@/lib/flight-types'

function addMinutes(iso: string, minutes: number) {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() + minutes)
  return d.toISOString()
}

function makeSegment(
  id: string,
  carrier: string,
  flightNumber: string,
  fromCode: string,
  toCode: string,
  departureIso: string,
  durationMinutes: number
): FlightSegment {
  return {
    id,
    carrier,
    flightNumber,
    from: getAirportByCode(fromCode),
    to: getAirportByCode(toCode),
    departureIso,
    arrivalIso: addMinutes(departureIso, durationMinutes),
    durationMinutes,
  }
}

function makeIso(date: string, time: string) {
  return `${date}T${time}:00.000Z`
}

export function buildMockFlightResult(input: FlightSearchInput): FlightSearchResult {
  const from = getAirportByCode(input.fromCode)
  const to = getAirportByCode(input.toCode)
  const d = input.departDate

  const direct = makeSegment(
    'seg-direct',
    'Air Canada',
    'AC742',
    from.code,
    to.code,
    makeIso(d, '12:35'),
    560
  )

  const viaLHR1 = makeSegment(
    'seg-lhr-1',
    'Air Canada',
    'AC864',
    from.code,
    'LHR',
    makeIso(d, '08:10'),
    385
  )
  const viaLHR2 = makeSegment(
    'seg-lhr-2',
    'Japan Airlines',
    'JL44',
    'LHR',
    to.code,
    addMinutes(viaLHR1.arrivalIso, 120),
    710
  )

  const viaDXB1 = makeSegment(
    'seg-dxb-1',
    'Emirates',
    'EK244',
    from.code,
    'DXB',
    makeIso(d, '18:05'),
    720
  )
  const viaDXB2 = makeSegment(
    'seg-dxb-2',
    'Emirates',
    'EK318',
    'DXB',
    to.code,
    addMinutes(viaDXB1.arrivalIso, 150),
    590
  )

  const itineraries: FlightItinerary[] = [
    {
      id: 'it-direct',
      price: 962,
      currency: 'CAD',
      totalDurationMinutes: 560,
      stops: 0,
      segments: [direct],
    },
    {
      id: 'it-lhr',
      price: 812,
      currency: 'CAD',
      totalDurationMinutes: viaLHR1.durationMinutes + 120 + viaLHR2.durationMinutes,
      stops: 1,
      segments: [viaLHR1, viaLHR2],
    },
    {
      id: 'it-dxb',
      price: 778,
      currency: 'CAD',
      totalDurationMinutes: viaDXB1.durationMinutes + 150 + viaDXB2.durationMinutes,
      stops: 1,
      segments: [viaDXB1, viaDXB2],
    },
  ]

  const cheapest = itineraries.reduce((a, b) => (a.price <= b.price ? a : b))
  const fastest = itineraries.reduce((a, b) =>
    a.totalDurationMinutes <= b.totalDurationMinutes ? a : b
  )

  return {
    route: { from, to },
    itineraries,
    meta: {
      source: 'mock',
      total: itineraries.length,
      generatedAt: new Date().toISOString(),
      cheapestId: cheapest.id,
      fastestId: fastest.id,
    },
  }
}
