'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface Props {
  zoomed: boolean
  onCityHover?: (c: any) => void
  activeCity?: { name: string; lat: number; lng: number } | null
}

// Procedural starfield + rotating sphere drawn on <canvas>.
// Lightweight, immediate, no heavy deps. Can be swapped for CesiumJS later
// without changing the parent panel.
export default function GlobeCanvas({ zoomed, activeCity }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotationRef = useRef({ lon: 0, lat: 0 })
  const dragRef = useRef<{ x: number; y: number; lon: number; lat: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let running = true

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    // Generate stable "continents" as random dots on a sphere
    const continents: { lon: number; lat: number; r: number; tone: 'blue' | 'pink' | 'white' }[] = []
    const seed = 42
    let s = seed
    const rand = () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
    for (let i = 0; i < 1400; i++) {
      const u = rand(), v = rand()
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)
      const lon = (theta * 180) / Math.PI - 180
      const lat = (phi * 180) / Math.PI - 90
      // Skew toward actual continent regions: higher density where real landmasses are
      // This is a visual approximation, not geography
      const density = continentDensity(lat, lon)
      if (rand() < density) {
        const tone = rand() < 0.1 ? 'pink' : rand() < 0.3 ? 'white' : 'blue'
        continents.push({ lon, lat, r: 0.8 + rand() * 1.4, tone })
      }
    }

    // Pins
    const pins: { lon: number; lat: number; label: string }[] = [
      { lon: 139.6503, lat: 35.6762, label: 'Tokyo' },
      { lon: 2.3522, lat: 48.8566, label: 'Paris' },
      { lon: -21.9426, lat: 64.1466, label: 'Reykjavik' },
      { lon: -7.9811, lat: 31.6295, label: 'Marrakech' },
      { lon: 18.4241, lat: -33.9249, label: 'Cape Town' },
      { lon: 135.7681, lat: 35.0116, label: 'Kyoto' },
      { lon: -74.006, lat: 40.7128, label: 'NYC' },
      { lon: -122.4194, lat: 37.7749, label: 'SF' },
      { lon: 151.2093, lat: -33.8688, label: 'Sydney' },
    ]

    const draw = () => {
      if (!running) return
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      ctx.clearRect(0, 0, w, h)

      const cx = w / 2
      const cy = h / 2
      const baseR = Math.min(w, h) * 0.33
      const R = zoomed ? baseR * 1.35 : baseR

      // Atmospheric glow ring
      const grad = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.35)
      grad.addColorStop(0, 'rgba(96, 165, 250, 0.35)')
      grad.addColorStop(0.4, 'rgba(236, 72, 153, 0.15)')
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2)
      ctx.fill()

      // Sphere base
      const sphereGrad = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R)
      sphereGrad.addColorStop(0, '#1E3A8A')
      sphereGrad.addColorStop(0.55, '#0A0F1E')
      sphereGrad.addColorStop(1, '#06080F')
      ctx.fillStyle = sphereGrad
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fill()

      // Rotation
      if (!dragRef.current) {
        rotationRef.current.lon += 0.08
      }
      const rotLon = rotationRef.current.lon
      const rotLat = rotationRef.current.lat

      // Grid lines (longitude / latitude)
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.12)'
      ctx.lineWidth = 0.6
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath()
        let first = true
        for (let lon = -180; lon <= 180; lon += 4) {
          const p = project(lon, lat, rotLon, rotLat, R, cx, cy)
          if (!p) continue
          if (first) { ctx.moveTo(p.x, p.y); first = false } else ctx.lineTo(p.x, p.y)
        }
        ctx.stroke()
      }
      for (let lon = -180; lon <= 180; lon += 30) {
        ctx.beginPath()
        let first = true
        for (let lat = -90; lat <= 90; lat += 4) {
          const p = project(lon, lat, rotLon, rotLat, R, cx, cy)
          if (!p) continue
          if (first) { ctx.moveTo(p.x, p.y); first = false } else ctx.lineTo(p.x, p.y)
        }
        ctx.stroke()
      }

      // Continents
      for (const c of continents) {
        const p = project(c.lon, c.lat, rotLon, rotLat, R, cx, cy)
        if (!p) continue
        ctx.fillStyle =
          c.tone === 'blue'
            ? `rgba(96, 165, 250, ${0.55 * p.depth})`
            : c.tone === 'pink'
            ? `rgba(244, 114, 182, ${0.7 * p.depth})`
            : `rgba(255, 255, 255, ${0.55 * p.depth})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, c.r * (0.7 + 0.3 * p.depth), 0, Math.PI * 2)
        ctx.fill()
      }

      // Pins
      for (const pin of pins) {
        const p = project(pin.lon, pin.lat, rotLon, rotLat, R, cx, cy)
        if (!p) continue
        const isActive = activeCity?.name === pin.label
        // pulsing glow
        const t = performance.now() / 1000
        const pulse = 0.5 + 0.5 * Math.sin(t * 2 + pin.lon)
        ctx.fillStyle = isActive ? 'rgba(236, 72, 153, 0.8)' : `rgba(236, 72, 153, ${0.3 + 0.4 * pulse})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
        ctx.beginPath()
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2)
        ctx.fill()
        if (isActive) {
          ctx.strokeStyle = 'rgba(244, 114, 182, 0.8)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(p.x, p.y, 14, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // Rim highlight
      const rim = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R)
      rim.addColorStop(0, 'rgba(0,0,0,0)')
      rim.addColorStop(1, 'rgba(96, 165, 250, 0.25)')
      ctx.fillStyle = rim
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fill()

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    const onDown = (e: PointerEvent) => {
      dragRef.current = {
        x: e.clientX,
        y: e.clientY,
        lon: rotationRef.current.lon,
        lat: rotationRef.current.lat,
      }
      canvas.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.x
      const dy = e.clientY - dragRef.current.y
      rotationRef.current.lon = dragRef.current.lon + dx * 0.4
      rotationRef.current.lat = Math.max(-80, Math.min(80, dragRef.current.lat + dy * 0.3))
    }
    const onUp = (e: PointerEvent) => {
      dragRef.current = null
      try { canvas.releasePointerCapture(e.pointerId) } catch {}
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointerleave', onUp)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointerleave', onUp)
    }
  }, [zoomed, activeCity?.name])

  return (
    <motion.div
      animate={{ scale: zoomed ? 1.05 : 1 }}
      transition={{ type: 'spring', duration: 0.6, bounce: 0.15 }}
      className="relative h-full w-full"
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
      />
    </motion.div>
  )
}

// ——— helpers ———
function project(lon: number, lat: number, rotLon: number, rotLat: number, R: number, cx: number, cy: number) {
  const latRad = (lat * Math.PI) / 180
  const lonRad = ((lon + rotLon) * Math.PI) / 180
  const rotLatRad = (rotLat * Math.PI) / 180

  const x0 = Math.cos(latRad) * Math.sin(lonRad)
  const y0 = Math.sin(latRad)
  const z0 = Math.cos(latRad) * Math.cos(lonRad)

  // rotate around X axis by rotLat
  const y1 = y0 * Math.cos(rotLatRad) - z0 * Math.sin(rotLatRad)
  const z1 = y0 * Math.sin(rotLatRad) + z0 * Math.cos(rotLatRad)

  if (z1 < 0) return null // back side

  return {
    x: cx + x0 * R,
    y: cy - y1 * R,
    depth: Math.max(0.3, z1),
  }
}

function continentDensity(lat: number, lon: number): number {
  // Rough land masks — high prob near major landmasses
  // N America
  if (lat > 15 && lat < 70 && lon > -140 && lon < -55) return 0.55
  // S America
  if (lat > -55 && lat < 15 && lon > -82 && lon < -35) return 0.5
  // Europe
  if (lat > 35 && lat < 70 && lon > -10 && lon < 40) return 0.6
  // Africa
  if (lat > -35 && lat < 35 && lon > -20 && lon < 55) return 0.55
  // Asia
  if (lat > 5 && lat < 75 && lon > 40 && lon < 150) return 0.55
  // SE Asia / Indonesia
  if (lat > -10 && lat < 10 && lon > 95 && lon < 140) return 0.45
  // Australia
  if (lat > -40 && lat < -10 && lon > 110 && lon < 155) return 0.5
  // Greenland
  if (lat > 60 && lat < 85 && lon > -55 && lon < -20) return 0.4
  // Antarctica
  if (lat < -65) return 0.4
  return 0.03 // oceans — sparse
}
