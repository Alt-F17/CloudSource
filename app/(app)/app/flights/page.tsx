'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { TripSidebar } from '@/components/app/TripSidebar'
import { useAppState } from '@/components/app/AppStateProvider'
import { getAirportMap } from '@/lib/airports'
import { buildMockFlightResult } from '@/lib/mock-flights'
import type {
  FlightItinerary,
  FlightRoute,
  FlightSearchInput,
  FlightSearchResult,
} from '@/lib/flight-types'

function fmt(minutes: number) {
  return `${Math.floor(minutes / 60)} h ${minutes % 60}m`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function stopsLabel(itinerary: FlightItinerary): string {
  if (itinerary.stops === 0) return 'Direct'
  const via = itinerary.segments
    .slice(0, -1)
    .map((segment) => segment.to.code)
    .join(', ')
  return `${itinerary.stops} stop · via ${via}`
}

function getPrimaryCarrier(itinerary: FlightItinerary) {
  const counts = new Map<string, number>()

  for (const segment of itinerary.segments) {
    counts.set(segment.carrier, (counts.get(segment.carrier) ?? 0) + 1)
  }

  return (
    [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    itinerary.segments[0]?.carrier ??
    'Airline'
  )
}

function getCarrierBookingUrl(carrier: string) {
  const normalized = carrier.trim().toLowerCase()

  if (normalized.includes('air canada')) return 'https://www.aircanada.com/us/en/aco/home.html'
  if (normalized.includes('japan airlines') || normalized.includes('jal')) {
    return 'https://www.jal.co.jp/jp/ja/inter/reservation/'
  }
  if (normalized.includes('emirates')) return 'https://www.emirates.com/us/english/book/'

  return null
}

export default function FlightsPage() {
  const router = useRouter()
  const {
    state,
    setFlightSearch,
    setFlightResult,
    setSelectedItineraryId,
    openBudgetExpenseModal,
  } = useAppState()

  const [form, setForm] = useState<FlightSearchInput>(state.flightSearch)
  const [loading, setLoading] = useState(false)

  const airports = Object.values(getAirportMap())
  const result = state.flightResult
  const selectedId = state.selectedItineraryId ?? result?.itineraries[0]?.id ?? null

  async function search() {
    if (loading) return

    const input = { ...form }
    setLoading(true)
    setFlightSearch(input)

    try {
      const response = await fetch('/api/flights/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        throw new Error(`Flight search failed (${response.status})`)
      }

      const payload = (await response.json()) as FlightSearchResult
      setFlightResult(payload)
    } catch {
      setFlightResult(buildMockFlightResult(input))
    } finally {
      setLoading(false)
    }
  }

  function field<K extends keyof FlightSearchInput>(key: K, value: FlightSearchInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const selectedItinerary = result?.itineraries.find((it) => it.id === selectedId) ?? null

  const flightRoutes: FlightRoute[] = selectedItinerary
    ? [
        {
          id: selectedItinerary.id,
          highlighted: true,
          legs: selectedItinerary.segments.map((segment) => ({
            from: { lat: segment.from.lat, lng: segment.from.lng, name: segment.from.city },
            to: { lat: segment.to.lat, lng: segment.to.lng, name: segment.to.city },
          })),
        },
      ]
    : []
  void flightRoutes

  return (
    <div className="app">
      <TripSidebar />
      <main className="main">
        <div id="screen-flights" className="screen">
          <div className="flights-wrap">
            <div className="ph">
              <div className="ph-icon">✈️</div>
              <div>
                <h1>Flights</h1>
                <div className="ph-sub">Search and book flights worldwide</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '8px 13px', fontSize: 12 }}
                  onClick={() => router.push('/app')}
                >
                  ← Back to Globe
                </button>
              </div>
            </div>

            <div className="search-bar">
              <div className="fg">
                <label>From</label>
                <select
                  className="inp"
                  value={form.fromCode}
                  onChange={(e) => field('fromCode', e.target.value)}
                  style={{ colorScheme: 'dark' }}
                >
                  {airports.map((airport) => (
                    <option key={airport.code} value={airport.code}>
                      {airport.city} ({airport.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="fg">
                <label>To</label>
                <select
                  className="inp"
                  value={form.toCode}
                  onChange={(e) => field('toCode', e.target.value)}
                  style={{ colorScheme: 'dark' }}
                >
                  {airports.map((airport) => (
                    <option key={airport.code} value={airport.code}>
                      {airport.city} ({airport.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="fg">
                <label>Depart</label>
                <input
                  className="inp"
                  type="date"
                  value={form.departDate}
                  onChange={(e) => field('departDate', e.target.value)}
                />
              </div>

              <div className="fg">
                <label>Return</label>
                <input
                  className="inp"
                  type="date"
                  value={form.returnDate ?? ''}
                  onChange={(e) => field('returnDate', e.target.value || undefined)}
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ alignSelf: 'flex-end', height: 42 }}
                onClick={() => {
                  void search()
                }}
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {!result && !loading && (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 14 }}>🛫</div>
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 16, marginBottom: 6 }}>
                  No results yet
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22 }}>
                  Choose airports and dates above, then hit Search
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    void search()
                  }}
                >
                  Find Flights
                </button>
              </div>
            )}

            {loading && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 0',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                }}
              >
                Searching for fares...
              </div>
            )}

            {result && !loading && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 14,
                  }}
                >
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    <span
                      style={{
                        color: 'var(--text)',
                        fontFamily: 'var(--f-display)',
                        fontSize: 15,
                      }}
                    >
                      {result.meta.total} results
                    </span>
                    {' · '}
                    {result.route.from.city} → {result.route.to.city}
                    {' · '}
                    {form.adults} pax
                  </div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <span className="badge badge-blue">Cheapest</span>
                    <span className="badge badge-pink">Fastest</span>
                  </div>
                </div>

                {result.itineraries.map((itinerary) => {
                  const isSelected = itinerary.id === selectedId
                  const firstSegment = itinerary.segments[0]
                  const lastSegment = itinerary.segments[itinerary.segments.length - 1]
                  const carriers = itinerary.segments
                    .map((segment) => segment.carrier)
                    .filter((value, index, array) => array.indexOf(value) === index)
                  const primaryCarrier = getPrimaryCarrier(itinerary)
                  const bookingUrl = getCarrierBookingUrl(primaryCarrier)

                  return (
                    <div
                      key={itinerary.id}
                      className="flight-card"
                      style={
                        isSelected
                          ? {
                              borderColor: 'rgba(236,72,153,.3)',
                              background: 'rgba(236,72,153,0.05)',
                            }
                          : {}
                      }
                      onClick={() => setSelectedItineraryId(itinerary.id)}
                    >
                      <div>
                        <div className="flight-time">{fmtTime(firstSegment.departureIso)}</div>
                        <div className="flight-code">
                          {firstSegment.from.code} · {carriers[0]} · {firstSegment.flightNumber}
                        </div>
                        <div
                          className="flight-code"
                          style={{ marginTop: 2, color: 'var(--text-muted)' }}
                        >
                          {fmtDate(firstSegment.departureIso)}
                        </div>
                      </div>

                      <div className="flight-mid">
                        <div className="flight-dur">{fmt(itinerary.totalDurationMinutes)}</div>
                        <div className="flight-arrow">✈</div>
                        <div className="flight-stops">{stopsLabel(itinerary)}</div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div className="flight-time">{fmtTime(lastSegment.arrivalIso)}</div>
                        <div className="flight-code">
                          {lastSegment.to.code}
                          {itinerary.stops > 0
                            ? ` · via ${itinerary.segments
                                .slice(0, -1)
                                .map((segment) => segment.to.code)
                                .join(', ')}`
                            : ''}
                        </div>
                        <div
                          className="flight-code"
                          style={{ marginTop: 2, color: 'var(--text-muted)' }}
                        >
                          {fmtDate(lastSegment.arrivalIso)}
                        </div>
                      </div>

                      <div>
                        <div className="flight-price t-pink">
                          {itinerary.currency} {itinerary.price.toLocaleString()}
                        </div>
                        <div
                          className="flight-actions"
                          style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}
                        >
                          {bookingUrl ? (
                            <a
                              className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ padding: '6px 14px', fontSize: 12 }}
                              href={bookingUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedItineraryId(itinerary.id)
                              }}
                            >
                              Book
                            </a>
                          ) : (
                            <button
                              className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ padding: '6px 14px', fontSize: 12 }}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedItineraryId(itinerary.id)
                              }}
                              disabled
                              title={`No airline booking page configured for ${primaryCarrier}`}
                            >
                              Book
                            </button>
                          )}
                          <button
                            className="track-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              openBudgetExpenseModal({
                                label: `${carriers[0]} ${firstSegment.flightNumber}`,
                                amount: itinerary.price,
                                currency: itinerary.currency,
                                category: 'flights',
                              })
                            }}
                          >
                            + Budget
                          </button>
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            textAlign: 'right',
                            fontSize: 10,
                            color: 'var(--text-muted)',
                            lineHeight: 1.4,
                          }}
                        >
                          {bookingUrl
                            ? `Opens ${primaryCarrier} booking page`
                            : `Booking page unavailable for ${primaryCarrier}`}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {selectedItinerary && selectedItinerary.stops > 0 && (
                  <div className="card card-blue" style={{ marginTop: 18 }}>
                    <h3 style={{ marginBottom: 14 }}>
                      Leg breakdown -{' '}
                      <span className="t-blue">
                        {selectedItinerary.segments.map((segment) => segment.flightNumber).join(' + ')}
                      </span>
                    </h3>
                    {selectedItinerary.segments.map((segment, index) => (
                      <div key={segment.id}>
                        {index > 0 && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '8px 0',
                              color: 'var(--text-muted)',
                              fontSize: 12,
                            }}
                          >
                            <div
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                background: 'var(--blue-soft)',
                                flexShrink: 0,
                              }}
                            />
                            Layover - {segment.from.city} ({segment.from.code})
                          </div>
                        )}
                        <div className="expense-row">
                          <div className="exp-ico" style={{ background: 'var(--blue-dim)' }}>
                            ✈️
                          </div>
                          <div className="exp-name">
                            <div className="name">
                              {segment.carrier} {segment.flightNumber}
                            </div>
                            <div className="date">
                              {segment.from.city} ({segment.from.code}) → {segment.to.city} (
                              {segment.to.code}) · {fmt(segment.durationMinutes)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div
                              style={{
                                fontFamily: 'var(--f-mono)',
                                fontSize: 13,
                                color: 'var(--text)',
                              }}
                            >
                              {fmtTime(segment.departureIso)} → {fmtTime(segment.arrivalIso)}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              {fmtDate(segment.departureIso)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
