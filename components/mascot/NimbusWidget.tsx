'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { useAppState } from '@/components/app/AppStateProvider'

type Point = { x: number; y: number }

const NIMBUS_TIPS = [
  "Hi! I'm Nimbus ☁️ Click any destination card to fly the globe there!",
  'Use <- -> arrow keys on the globe to browse more destinations!',
  'Chat with Nimbus AI for personalised travel tips! ☁️',
  'Track your trip budget in real-time with the Budget screen! 💳',
  'Keep all your travel notes and packing lists organised! 📝',
  'Book your flights and hotels directly from Cloud Source! ✈️',
  'Click a destination, then hit Book Flight to get started! 🌍',
]

const NIMBUS_SCREEN_TIPS: Record<string, string> = {
  '/app': 'Click any glowing card to fly the globe to that city! <- -> arrows browse more.',
  '/app/flights': 'Enter your FROM city, destination, and dates, then hit Search for the best deal! ✈️',
  '/app/hotels': 'Filter by rating or price to find your perfect stay! 🏨',
  '/app/budget': 'Add expenses as you go to stay on track with your trip budget! 💳',
  '/app/chat': 'Ask Nimbus anything - cultural tips, hidden gems, itineraries! ☁️',
  '/app/notes': 'Keep all your travel plans in one place - notes sync across trips! 📝',
  '/app/todo': 'Check off tasks as you prepare - nothing gets forgotten! ✅',
  '/app/about': 'Nimbus is here to guide you around Cloud Source - give me a click! ☁️',
}

const ROUTE_LABELS: Record<string, string> = {
  '/app': 'Globe',
  '/app/chat': 'Chat',
  '/app/flights': 'Flights',
  '/app/hotels': 'Hotels',
  '/app/budget': 'Budget',
  '/app/notes': 'Notes',
  '/app/todo': 'To-Do',
  '/app/about': 'Culture',
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function NimbusWidget() {
  const pathname = usePathname()
  const router = useRouter()
  const { activeTrip, addQuickNote } = useAppState()

  const [isMinimised, setIsMinimised] = useState(false)
  const [bubbleHidden, setBubbleHidden] = useState(false)
  const [tipIdx, setTipIdx] = useState(0)
  const [screenTipOverride, setScreenTipOverride] = useState<string | null>(null)
  const [stickyOpen, setStickyOpen] = useState(false)
  const [stickyText, setStickyText] = useState('')
  const [stickySavedAt, setStickySavedAt] = useState<number | null>(null)
  const [notePos, setNotePos] = useState<Point>({ x: 28, y: 120 })
  const dragRef = useRef({ active: false, offsetX: 0, offsetY: 0 })
  const screenTipTimerRef = useRef<number | null>(null)

  const tipText = useMemo(
    () => screenTipOverride ?? NIMBUS_TIPS[tipIdx],
    [screenTipOverride, tipIdx]
  )

  const routeLabel = useMemo(() => ROUTE_LABELS[pathname] ?? 'Current Screen', [pathname])

  const stickyStorageKey = useMemo(
    () => `cloudsource.sticky.${activeTrip.id}.${pathname}`,
    [activeTrip.id, pathname]
  )

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTipIdx((prev) => (prev + 1) % NIMBUS_TIPS.length)
    }, 6000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const tip = NIMBUS_SCREEN_TIPS[pathname]
    if (!tip) return

    setBubbleHidden(false)
    setScreenTipOverride(tip)

    if (screenTipTimerRef.current !== null) {
      window.clearTimeout(screenTipTimerRef.current)
    }

    screenTipTimerRef.current = window.setTimeout(() => {
      setScreenTipOverride(null)
      screenTipTimerRef.current = null
    }, 7000)
  }, [pathname])

  useEffect(() => {
    return () => {
      if (screenTipTimerRef.current !== null) {
        window.clearTimeout(screenTipTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(stickyStorageKey)
      setStickyText(saved ?? '')
    } catch {
      setStickyText('')
    }
  }, [stickyStorageKey])

  useEffect(() => {
    const width = window.innerWidth
    const height = window.innerHeight
    setNotePos((prev) => {
      if (prev.x !== 28 || prev.y !== 120) return prev
      return {
        x: Math.max(12, width - 354),
        y: Math.max(86, height - 380),
      }
    })
  }, [])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!dragRef.current.active) return
      const cardWidth = 320
      const cardHeight = 286
      const nextX = clamp(event.clientX - dragRef.current.offsetX, 10, window.innerWidth - cardWidth - 10)
      const nextY = clamp(event.clientY - dragRef.current.offsetY, 10, window.innerHeight - cardHeight - 10)
      setNotePos({ x: nextX, y: nextY })
    }

    const onPointerUp = () => {
      dragRef.current.active = false
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [])

  const saveStickyLocally = useCallback(
    (text: string) => {
      try {
        if (text.trim()) {
          window.localStorage.setItem(stickyStorageKey, text)
        } else {
          window.localStorage.removeItem(stickyStorageKey)
        }
      } catch {
        // Ignore storage failures when localStorage is unavailable.
      }
    },
    [stickyStorageKey]
  )

  const onStartDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      dragRef.current.active = true
      dragRef.current.offsetX = event.clientX - notePos.x
      dragRef.current.offsetY = event.clientY - notePos.y
    },
    [notePos.x, notePos.y]
  )

  const onPinSticky = useCallback(() => {
    saveStickyLocally(stickyText)
    setStickySavedAt(Date.now())
  }, [saveStickyLocally, stickyText])

  const onOpenInNotes = useCallback(() => {
    const text = stickyText.trim()
    if (!text) return
    addQuickNote({
      title: `Sticky - ${routeLabel}`,
      content: text,
      preview: text.slice(0, 84),
    })
    router.push('/app/notes')
    setStickyOpen(false)
  }, [addQuickNote, routeLabel, router, stickyText])

  const onOpenChat = useCallback(() => {
    router.push('/app/chat')
  }, [router])

  const onNimbusCharClick = useCallback(() => {
    setIsMinimised(false)
    if (pathname === '/app/chat') {
      setBubbleHidden((prev) => !prev)
      return
    }
    onOpenChat()
  }, [onOpenChat, pathname])

  return (
    <>
      <div className={`nimbus-widget ${isMinimised ? 'minimised' : ''}`}>
        <div className="nimbus-body">
          <div className={`nimbus-bubble ${bubbleHidden ? 'hidden' : ''}`}>
            <button
              type="button"
              className="nimbus-close"
              onClick={() => setBubbleHidden(true)}
              aria-label="Hide Nimbus bubble"
            >
              ✕
            </button>
            <div className="nimbus-bubble-name">✦ Nimbus</div>
            <div className="nimbus-bubble-text">{tipText}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button
                type="button"
                onClick={onOpenChat}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  fontSize: 11,
                  background: 'rgba(59,130,246,.2)',
                  border: '1px solid rgba(59,130,246,.35)',
                  color: 'white',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Chat ☁️ -&gt;
              </button>
              <button
                type="button"
                onClick={() => setStickyOpen(true)}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  fontSize: 11,
                  background: 'rgba(251,191,36,.15)',
                  border: '1px solid rgba(251,191,36,.35)',
                  color: 'white',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                📝 Sticky Note
              </button>
            </div>
          </div>

          <div
            className="nimbus-char"
            onClick={onNimbusCharClick}
            onDoubleClick={() => setIsMinimised(true)}
            title="Click to chat with Nimbus"
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onNimbusCharClick()
              }
            }}
          >
            <svg viewBox="0 0 120 80" width="96" height="64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <radialGradient id="cgMain" cx="40%" cy="30%" r="65%">
                  <stop offset="0%" stopColor="#eaf5fb" />
                  <stop offset="100%" stopColor="#b2d1e8" />
                </radialGradient>
                <filter id="cgShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#6aaec8" floodOpacity="0.25" />
                </filter>
              </defs>
              <circle cx="18" cy="58" r="15" fill="url(#cgMain)" />
              <circle cx="38" cy="64" r="18" fill="url(#cgMain)" />
              <circle cx="60" cy="66" r="20" fill="url(#cgMain)" />
              <circle cx="82" cy="64" r="18" fill="url(#cgMain)" />
              <circle cx="102" cy="58" r="15" fill="url(#cgMain)" />
              <circle cx="36" cy="40" r="20" fill="url(#cgMain)" filter="url(#cgShadow)" />
              <circle cx="60" cy="32" r="26" fill="url(#cgMain)" filter="url(#cgShadow)" />
              <circle cx="84" cy="40" r="20" fill="url(#cgMain)" filter="url(#cgShadow)" />
              <rect x="16" y="46" width="88" height="22" fill="url(#cgMain)" />
              <ellipse cx="48" cy="26" rx="13" ry="8" fill="rgba(255,255,255,0.45)" transform="rotate(-18 48 26)" />
              <circle className="n-eye" cx="50" cy="42" r="4.5" fill="#1a3855" />
              <circle className="n-eye" cx="70" cy="42" r="4.5" fill="#1a3855" />
              <circle cx="48" cy="40" r="1.6" fill="white" />
              <circle cx="68" cy="40" r="1.6" fill="white" />
              <path d="M51 52 Q60 59 69 52" fill="none" stroke="#4278a0" strokeWidth="2.4" strokeLinecap="round" />
              <ellipse cx="38" cy="48" rx="7" ry="4.5" fill="#f9a8c4" opacity="0.55" />
              <ellipse cx="82" cy="48" rx="7" ry="4.5" fill="#f9a8c4" opacity="0.55" />
            </svg>
          </div>
        </div>

        <button
          type="button"
          className="nimbus-dot"
          onClick={() => setIsMinimised(false)}
          title="Open Nimbus"
          aria-label="Open Nimbus"
        >
          ☁️
        </button>
      </div>

      {stickyOpen && (
        <div className="nimbus-sticky-note" style={{ left: `${notePos.x}px`, top: `${notePos.y}px` }}>
          <div className="nimbus-sticky-handle" onPointerDown={onStartDrag}>
            <span>Sticky note</span>
            <button type="button" className="nimbus-sticky-close" onClick={() => setStickyOpen(false)}>
              x
            </button>
          </div>

          <textarea
            className="nimbus-sticky-text"
            value={stickyText}
            onChange={(event) => setStickyText(event.target.value)}
            placeholder={`Idea for ${routeLabel.toLowerCase()}...`}
          />

          <div className="nimbus-sticky-actions">
            <button type="button" className="nimbus-widget-btn" onClick={onPinSticky}>
              Pin to this screen
            </button>
            <button type="button" className="nimbus-widget-btn primary" onClick={onOpenInNotes}>
              Open in Notes
            </button>
          </div>

          {stickySavedAt && (
            <div className="nimbus-sticky-saved">
              Saved at{' '}
              {new Date(stickySavedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>
      )}
    </>
  )
}
