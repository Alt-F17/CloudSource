'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAppState } from '@/components/app/AppStateProvider'
import { TripSidebar } from '@/components/app/TripSidebar'
import { PANEL_ROUTE_MAP, type PanelRouteKey } from '@/lib/panel-routes'
import type { FlightRoute } from '@/lib/flight-types'

const CesiumViewer = dynamic(() => import('@/components/globe/CesiumViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-xs uppercase tracking-widest text-white/30">Loading...</div>
    </div>
  ),
})

const PANELS = [
  { key: 'globe', label: 'GLOBE VIEW', sub: 'Destination pin', emoji: '🌍', badge: 'Live', tone: 'blue' },
  { key: 'about', label: 'CULTURE', sub: 'Norms and phrases', emoji: '🌐', badge: 'Nimbus guide', tone: 'pink' },
  { key: 'flights', label: 'FLIGHTS', sub: 'Search and compare', emoji: '✈️', badge: 'Live prices', tone: 'blue' },
  { key: 'hotels', label: 'HOTELS', sub: 'Find perfect stays', emoji: '🏨', badge: 'Best rates', tone: 'pink' },
  { key: 'budget', label: 'BUDGET', sub: 'Track your spending', emoji: '💳', badge: 'Smart alerts', tone: 'blue' },
  { key: 'chat', label: 'NIMBUS AI', sub: 'AI travel assistant', emoji: '☁️', badge: '24 / 7', tone: 'pink' },
  { key: 'notes', label: 'NOTES', sub: 'Journal and moodboard', emoji: '📝', badge: 'Synced', tone: 'blue' },
  { key: 'todo', label: 'TO-DO', sub: 'Trip checklist', emoji: '✅', badge: 'Stay on track', tone: 'pink' },
]

const N = PANELS.length
const TWO_PI = 2 * Math.PI

const GLOBE_Z = 100
const RX = 490
const RY = 240
const RZ = 210
const ORBIT_TOP = 'calc(50% - 52px)'

const CARD_W = 240
const CARD_H = 164
const FRONT = Math.PI / 2

function cardAngle(i: number, rot: number) {
  return (TWO_PI / N) * i + rot
}

function cardTransform(i: number, rot: number) {
  const a = cardAngle(i, rot)
  const x = RX * Math.cos(a)
  const y = RY * Math.sin(a)
  const z = RZ * Math.sin(a)
  const depth = (z + RZ) / (2 * RZ)
  const scale = 0.55 + 0.45 * depth
  const opacity = depth < 0.08 ? 0 : 0.14 + 0.86 * depth
  const blur = z < 0 ? Math.max(0, 5 * (-z / RZ)) : 0
  const zIndex = Math.round(GLOBE_Z + z * 0.45)
  return { x, y, scale, opacity, blur, zIndex }
}

export default function AppPage() {
  const router = useRouter()
  const { state, activeTrip, startAirport, flightDestination } = useAppState()
  const cesiumIonToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN
  const rotRef = useRef(0)
  const prevIsGlobeRef = useRef<boolean | null>(null)
  const [rot, setRot] = useState(0)
  const globeAnimation = useAnimationControls()
  const destination = activeTrip.destination
  const panels = PANELS.map((p) =>
    p.key === 'globe'
      ? { ...p, sub: `${destination.name} pin` }
      : p.key === 'flights'
        ? { ...p, sub: `${state.flightSearch.fromCode} -> ${state.flightSearch.toCode}` }
        : p
  )

  const snapTo = useCallback((i: number) => {
    const raw = FRONT - (TWO_PI / N) * i
    const cur = rotRef.current
    let delta = raw - cur
    while (delta > Math.PI) delta -= TWO_PI
    while (delta < -Math.PI) delta += TWO_PI
    rotRef.current = cur + delta
    setRot(rotRef.current)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setRot((r) => {
          rotRef.current = r - TWO_PI / N
          return rotRef.current
        })
      }
      if (e.key === 'ArrowLeft') {
        setRot((r) => {
          rotRef.current = r + TWO_PI / N
          return rotRef.current
        })
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const frontIdx = (() => {
    let best = 0
    let bestDist = Infinity

    for (let i = 0; i < N; i++) {
      const a = ((cardAngle(i, rot) % TWO_PI) + TWO_PI) % TWO_PI
      const f = ((FRONT % TWO_PI) + TWO_PI) % TWO_PI
      const d = Math.min(Math.abs(a - f), TWO_PI - Math.abs(a - f))
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }

    return best
  })()

  const selectedPanel = panels[frontIdx]
  const isGlobeSelected = selectedPanel.key === 'globe'
  const isFlightsSelected = selectedPanel.key === 'flights'
  const enableSlowEarthRotation = !isFlightsSelected
  const globeDestination = isFlightsSelected ? flightDestination : destination
  const flightRoutes = (() => {
    const result = state.flightResult
    if (!result) return [] as FlightRoute[]
    const selectedId = state.selectedItineraryId ?? result.itineraries[0]?.id
    return result.itineraries
      .map((itinerary) => {
        const legs = itinerary.segments
          .filter((segment) => segment.from.lat !== 0 && segment.to.lat !== 0)
          .map((segment) => ({
            from: { lat: segment.from.lat, lng: segment.from.lng, name: segment.from.code },
            to: { lat: segment.to.lat, lng: segment.to.lng, name: segment.to.code },
          }))
        if (!legs.length) return null
        return {
          id: itinerary.id,
          highlighted: itinerary.id === selectedId,
          legs,
        } satisfies FlightRoute
      })
      .filter(Boolean) as FlightRoute[]
  })()
  const flightMarkers = (() => {
    if (!isFlightsSelected) return []

    const result = state.flightResult
    const selectedId = state.selectedItineraryId ?? result?.itineraries[0]?.id
    const itinerary = result?.itineraries.find((item) => item.id === selectedId)

    if (!itinerary) {
      const fallback = []
      if (startAirport.lat !== 0 || startAirport.lng !== 0) {
        fallback.push({
          id: `start-${state.flightSearch.fromCode}`,
          name: startAirport.name,
          lat: startAirport.lat,
          lng: startAirport.lng,
          colorHex: '#60A5FA',
          pointSize: 12,
        })
      }
      if (flightDestination.lat !== 0 || flightDestination.lng !== 0) {
        fallback.push({
          id: `dest-${state.flightSearch.toCode}`,
          name: flightDestination.name,
          lat: flightDestination.lat,
          lng: flightDestination.lng,
          colorHex: '#F472B6',
          pointSize: 14,
        })
      }
      return fallback
    }

    const markers: Array<{
      id: string
      name: string
      lat: number
      lng: number
      colorHex: string
      pointSize: number
    }> = []
    const seen = new Set<string>()
    const pushMarker = (
      id: string,
      name: string,
      lat: number,
      lng: number,
      colorHex: string,
      pointSize: number
    ) => {
      if (lat === 0 && lng === 0) return
      const dedupeKey = `${name}-${lat}-${lng}`
      if (seen.has(dedupeKey)) return
      seen.add(dedupeKey)
      markers.push({ id, name, lat, lng, colorHex, pointSize })
    }

    const firstSegment = itinerary.segments[0]
    const lastSegment = itinerary.segments[itinerary.segments.length - 1]

    if (firstSegment) {
      pushMarker(
        `start-${firstSegment.from.code}`,
        firstSegment.from.city,
        firstSegment.from.lat,
        firstSegment.from.lng,
        '#60A5FA',
        12
      )
    }

    itinerary.segments.slice(0, -1).forEach((segment, idx) => {
      pushMarker(
        `layover-${segment.to.code}-${idx}`,
        segment.to.city,
        segment.to.lat,
        segment.to.lng,
        '#FBBF24',
        11
      )
    })

    if (lastSegment) {
      pushMarker(
        `dest-${lastSegment.to.code}`,
        lastSegment.to.city,
        lastSegment.to.lat,
        lastSegment.to.lng,
        '#F472B6',
        14
      )
    }

    return markers
  })()

  const openPanel = useCallback(
    (key: string) => {
      const path = PANEL_ROUTE_MAP[key as PanelRouteKey]
      if (path && path !== '/app') {
        router.push(path)
      }
    },
    [router]
  )

  useEffect(() => {
    const wasGlobeSelected = prevIsGlobeRef.current

    if (isGlobeSelected) {
      globeAnimation.start({
        scale: 1.12,
        opacity: 1,
        transition: { duration: 0.75, ease: [0.23, 1, 0.32, 1] },
      })
    } else if (wasGlobeSelected) {
      // Only play the zoom-out transition when leaving Globe view.
      globeAnimation.start({
        scale: [1.08, 1],
        opacity: [0.68, 1],
        transition: { duration: 0.7, ease: [0.23, 1, 0.32, 1] },
      })
    } else {
      // Keep globe stable while switching between non-globe panels.
      globeAnimation.set({ scale: 1, opacity: 1 })
    }

    prevIsGlobeRef.current = isGlobeSelected
  }, [globeAnimation, isGlobeSelected])

  const prev = () =>
    setRot((r) => {
      rotRef.current = r + TWO_PI / N
      return rotRef.current
    })

  const next = () =>
    setRot((r) => {
      rotRef.current = r - TWO_PI / N
      return rotRef.current
    })

  return (
    <div className="app">
      <TripSidebar navigateOnTripSelect={false} />

      <div className="relative flex-1 overflow-hidden">
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ scale: 1, opacity: 1 }}
        animate={globeAnimation}
      >
        <CesiumViewer
          ionToken={cesiumIonToken}
          destination={globeDestination}
          startAirport={startAirport}
          focusDestination={isGlobeSelected}
          showFlightPath={isFlightsSelected}
          autoRotateSlow={enableSlowEarthRotation}
          flightRoutes={flightRoutes}
          flightMarkers={flightMarkers}
        />
      </motion.div>

      <div className="absolute left-6 top-6 z-50">
        <div className="app-brand-title text-lg font-bold tracking-tight">
          <span className="text-white">Cloud</span>
          <span
            style={{
              background: 'linear-gradient(135deg,#60A5FA,#F472B6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Source
          </span>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: isGlobeSelected
            ? 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.35) 100%)'
            : 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.50) 100%)',
        }}
      />

      <motion.div
        className="absolute inset-0 z-20"
        style={{
          perspective: 1300,
          // Let globe drag pass through empty overlay space on non-globe panels.
          pointerEvents: 'none',
        }}
        animate={{
          opacity: isGlobeSelected ? 0 : 1,
          scale: isGlobeSelected ? 0.97 : 1,
        }}
        transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      >
        <div
          className="pointer-events-none absolute"
          style={{
            left: '50%',
            top: ORBIT_TOP,
            width: RX * 2,
            height: RY * 2,
            transform: 'translate(-50%, -50%)',
            border: '1px dashed rgba(255,255,255,0.06)',
            borderRadius: '50%',
          }}
        />

        {panels.map((panel, i) => {
          const t = cardTransform(i, rot)
          const isSelected = i === frontIdx

          return (
            <motion.div
              key={panel.key}
              className="absolute cursor-pointer select-none"
              style={{
                left: '50%',
                top: ORBIT_TOP,
                zIndex: t.zIndex + (isSelected ? 4 : 0),
                pointerEvents: 'auto',
              }}
              animate={{
                x: t.x - CARD_W / 2,
                y: t.y - CARD_H / 2,
                scale: t.scale,
                opacity: t.opacity,
                filter: t.blur > 0 ? `blur(${t.blur.toFixed(1)}px)` : 'none',
              }}
              transition={{ type: 'spring', stiffness: 90, damping: 22, mass: 0.8 }}
              onClick={() => {
                if (isSelected) {
                  openPanel(panel.key)
                } else {
                  snapTo(i)
                }
              }}
            >
              <PanelCard panel={panel} selected={isSelected} />
            </motion.div>
          )
        })}
      </motion.div>

      <div className="absolute left-0 right-0 top-1/2 z-50 flex -translate-y-1/2 items-center gap-[10px] px-4 pointer-events-none">
        <button
          onClick={prev}
          className="c-arrow pointer-events-auto"
        >
          <ChevronLeft className="h-5 w-5 text-white" />
        </button>
        <div className="flex-1" />

        <button
          onClick={next}
          className="c-arrow pointer-events-auto"
        >
          <ChevronRight className="h-5 w-5 text-white" />
        </button>
      </div>

      </div>
    </div>
  )
}

function PanelCard({
  panel,
  selected,
}: {
  panel: (typeof PANELS)[number]
  selected: boolean
}) {
  const { label, sub, emoji, badge, tone } = panel

  return (
    <div
      className={`dest-card ${selected ? 'arc-center' : ''}`}
      style={{
        width: CARD_W,
        height: CARD_H,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="dest-emoji">{emoji}</div>
      <div className="dest-name">{label}</div>
      <div className="dest-country">{sub}</div>
      <div className="dest-meta">
        <span className={tone === 'pink' ? 'badge badge-pink' : 'badge badge-blue'}>{badge}</span>
        <span className="dest-price">Open -&gt;</span>
      </div>
    </div>
  )
}
