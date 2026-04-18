'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { TripSidebar } from '@/components/app/TripSidebar'
import { useAppState } from '@/components/app/AppStateProvider'
import { buildMockFlightResult } from '@/lib/mock-flights'
import { getAirportMap } from '@/lib/airports'
import type {
  FlightItinerary,
  FlightRoute,
  FlightSearchInput,
  FlightSearchResult,
} from '@/lib/flight-types'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(minutes: number) {
  return `${Math.floor(minutes / 60)} h ${minutes % 60}m`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function stopsLabel(it: FlightItinerary): string {
  if (it.stops === 0) return 'Direct'
  const via = it.segments
    .slice(0, -1)
    .map((s) => s.to.code)
    .join(', ')
  return `${it.stops} stop · via ${via}`
}

// ─── Page ────────────────────────────────────────────────────────────────────

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
      // Keep the panel resilient when API/network is unavailable.
      setFlightResult(buildMockFlightResult(input))
    } finally {
      setLoading(false)
    }
  }

  function field<K extends keyof FlightSearchInput>(key: K, val: FlightSearchInput[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  const selectedItinerary = result?.itineraries.find((it) => it.id === selectedId) ?? null

  const flightRoutes: FlightRoute[] = selectedItinerary
    ? [
        {
          id: selectedItinerary.id,
          highlighted: true,
          legs: selectedItinerary.segments.map((seg) => ({
            from: { lat: seg.from.lat, lng: seg.from.lng, name: seg.from.city },
            to: { lat: seg.to.lat, lng: seg.to.lng, name: seg.to.city },
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

            {/* ── Header ── */}
            <div className="ph">
              <div className="ph-icon">✈️</div>
              <div>
                <h1>Flights</h1>
                <div className="ph-sub">Search &amp; book flights worldwide</div>
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

            {/* ── Search bar ── */}
            <div className="search-bar">
              <div className="fg">
                <label>From</label>
                <select
                  className="inp"
                  value={form.fromCode}
                  onChange={(e) => field('fromCode', e.target.value)}
                  style={{ colorScheme: 'dark' }}
                >
                  {airports.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.city} ({a.code})
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
                  {airports.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.city} ({a.code})
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
                {loading ? 'Searching…' : 'Search'}
              </button>
            </div>

            {/* ── Empty state ── */}
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

            {/* ── Loading ── */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                Searching for fares…
              </div>
            )}

            {/* ── Results ── */}
            {result && !loading && (
              <>
                {/* Results header with badges */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--text)', fontFamily: 'var(--f-display)', fontSize: 15 }}>
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

                {result.itineraries.map((it) => {
                  const isSelected = it.id === selectedId
                  const firstSeg = it.segments[0]
                  const lastSeg = it.segments[it.segments.length - 1]
                  const carriers = it.segments
                    .map((s) => s.carrier)
                    .filter((v, i, a) => a.indexOf(v) === i)

                  return (
                    <div
                      key={it.id}
                      className="flight-card"
                      style={
                        isSelected
                          ? {
                              borderColor: 'rgba(236,72,153,.3)',
                              background: 'rgba(236,72,153,0.05)',
                            }
                          : {}
                      }
                      onClick={() => setSelectedItineraryId(it.id)}
                    >
                      {/* Departure */}
                      <div>
                        <div className="flight-time">{fmtTime(firstSeg.departureIso)}</div>
                        <div className="flight-code">
                          {firstSeg.from.code} · {carriers[0]} · {firstSeg.flightNumber}
                        </div>
                        <div className="flight-code" style={{ marginTop: 2, color: 'var(--text-muted)' }}>
                          {fmtDate(firstSeg.departureIso)}
                        </div>
                      </div>

                      {/* Middle */}
                      <div className="flight-mid">
                        <div className="flight-dur">{fmt(it.totalDurationMinutes)}</div>
                        <div className="flight-arrow">✈</div>
                        <div className="flight-stops">{stopsLabel(it)}</div>
                      </div>

                      {/* Arrival */}
                      <div style={{ textAlign: 'right' }}>
                        <div className="flight-time">{fmtTime(lastSeg.arrivalIso)}</div>
                        <div className="flight-code">
                          {lastSeg.to.code}
                          {it.stops > 0 ? ` · via ${it.segments.slice(0, -1).map((s) => s.to.code).join(', ')}` : ''}
                        </div>
                        <div className="flight-code" style={{ marginTop: 2, color: 'var(--text-muted)' }}>
                          {fmtDate(lastSeg.arrivalIso)}
                        </div>
                      </div>

                      {/* Price + Book */}
                      <div>
                        <div className="flight-price t-pink">
                          {it.currency} {it.price.toLocaleString()}
                        </div>
                        <div className="flight-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '6px 14px', fontSize: 12 }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedItineraryId(it.id)
                            }}
                          >
                            Book
                          </button>
                          <button
                            className="track-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              openBudgetExpenseModal({
                                label: `${carriers[0]} ${firstSeg.flightNumber}`,
                                amount: it.price,
                                currency: it.currency,
                                category: 'flights',
                              })
                            }}
                          >
                            + Budget
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* ── Segment detail for selected multi-stop ── */}
                {selectedItinerary && selectedItinerary.stops > 0 && (
                  <div className="card card-blue" style={{ marginTop: 18 }}>
                    <h3 style={{ marginBottom: 14 }}>
                      Leg breakdown &mdash;{' '}
                      <span className="t-blue">
                        {selectedItinerary.segments.map((s) => s.flightNumber).join(' + ')}
                      </span>
                    </h3>
                    {selectedItinerary.segments.map((seg, i) => (
                      <div key={seg.id}>
                        {i > 0 && (
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
                            Layover · {seg.from.city} ({seg.from.code})
                          </div>
                        )}
                        <div className="expense-row">
                          <div className="exp-ico" style={{ background: 'var(--blue-dim)' }}>✈️</div>
                          <div className="exp-name">
                            <div className="name">{seg.carrier} {seg.flightNumber}</div>
                            <div className="date">
                              {seg.from.city} ({seg.from.code}) → {seg.to.city} ({seg.to.code}) · {fmt(seg.durationMinutes)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 13, color: 'var(--text)' }}>
                              {fmtTime(seg.departureIso)} → {fmtTime(seg.arrivalIso)}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              {fmtDate(seg.departureIso)}
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
