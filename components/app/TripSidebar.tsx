'use client'

import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { useRouter } from 'next/navigation'

import { useAppState } from '@/components/app/AppStateProvider'

type Props = {
  className?: string
  navigateOnTripSelect?: boolean
}

type TripMenuState = {
  tripId: string
  x: number
  y: number
  mode: 'actions' | 'rename' | 'delete'
  draftName: string
}

export function TripSidebar({ className, navigateOnTripSelect = true }: Props) {
  const router = useRouter()
  const { state, trips, setTripIdx, renameTrip, deleteTrip, openTripCreator } = useAppState()
  const [menuState, setMenuState] = useState<TripMenuState | null>(null)

  const menuTrip = useMemo(
    () => (menuState ? trips.find((trip) => trip.id === menuState.tripId) ?? null : null),
    [menuState, trips]
  )

  useEffect(() => {
    if (!menuState) return

    const close = () => setMenuState(null)
    const onPointerDown = (event: globalThis.MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('.trip-context-menu')) return
      close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuState])

  useEffect(() => {
    if (!menuState) return
    if (!menuTrip) {
      setMenuState(null)
    }
  }, [menuState, menuTrip])

  function openTripMenu(event: ReactMouseEvent, tripId: string, currentName: string) {
    event.preventDefault()
    event.stopPropagation()

    const menuWidth = 220
    const menuHeight = 138
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 8)
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - 8)

    setMenuState({
      tripId,
      x,
      y,
      mode: 'actions',
      draftName: currentName,
    })
  }

  return (
    <nav className={`sidebar ${className ?? ''}`}>
      <div className="logo">
        <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 40 40" fill="none" width="34" height="34" aria-hidden="true">
            <defs>
              <linearGradient id="sidebar-lg" x1="0" y1="0" x2="40" y2="40">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <circle cx="20" cy="20" r="17" stroke="url(#sidebar-lg)" strokeWidth="2" />
            <ellipse
              cx="20"
              cy="20"
              rx="17"
              ry="7"
              stroke="url(#sidebar-lg)"
              strokeWidth="1.5"
              opacity=".45"
            />
            <line x1="20" y1="3" x2="20" y2="37" stroke="url(#sidebar-lg)" strokeWidth="1.5" opacity=".35" />
            <circle cx="20" cy="20" r="3.5" fill="url(#sidebar-lg)" />
          </svg>
        </div>
      </div>
      <div className="nav-divider" />
      <div className="nav-label">TRIPS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {trips.map((trip, i) => {
          const active = state.tripIdx === i
          return (
            <button
              key={trip.id}
              type="button"
              onClick={() => {
                setMenuState(null)
                setTripIdx(i)
                if (navigateOnTripSelect) router.push('/app')
              }}
              onContextMenu={(event) => openTripMenu(event, trip.id, trip.name)}
              className={`nav-item trip-item ${active ? 'active' : ''}`}
              title={trip.name}
            >
              <span className="trip-num">{i + 1}</span>
              <span className="nav-tip">
                {trip.name}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={openTripCreator}
          className="nav-item"
          title="New Trip"
          aria-label="New Trip"
        >
          +
          <span className="nav-tip">
            New Trip
          </span>
        </button>
      </div>

      {menuState && menuTrip ? (
        <div
          className="trip-context-menu"
          style={{ left: menuState.x, top: menuState.y }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="trip-context-head">
            Trip {trips.findIndex((trip) => trip.id === menuTrip.id) + 1}
          </div>

          {menuState.mode === 'actions' ? (
            <>
              <button
                type="button"
                className="trip-context-item"
                onClick={() =>
                  setMenuState((prev) =>
                    prev
                      ? {
                          ...prev,
                          mode: 'rename',
                        }
                      : prev
                  )
                }
              >
                Rename
              </button>
              <button
                type="button"
                className="trip-context-item danger"
                onClick={() =>
                  setMenuState((prev) =>
                    prev
                      ? {
                          ...prev,
                          mode: 'delete',
                        }
                      : prev
                  )
                }
              >
                Delete
              </button>
            </>
          ) : null}

          {menuState.mode === 'rename' ? (
            <div className="trip-context-rename">
              <input
                className="trip-context-input"
                value={menuState.draftName}
                maxLength={60}
                autoFocus
                onChange={(event) =>
                  setMenuState((prev) =>
                    prev
                      ? {
                          ...prev,
                          draftName: event.target.value,
                        }
                      : prev
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    const nextName = menuState.draftName.trim()
                    if (nextName) renameTrip(menuTrip.id, nextName)
                    setMenuState(null)
                  }

                  if (event.key === 'Escape') {
                    setMenuState(null)
                  }
                }}
              />
              <div className="trip-context-actions">
                <button
                  type="button"
                  className="trip-context-btn"
                  onClick={() => setMenuState(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="trip-context-btn primary"
                  onClick={() => {
                    const nextName = menuState.draftName.trim()
                    if (nextName) renameTrip(menuTrip.id, nextName)
                    setMenuState(null)
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          ) : null}

          {menuState.mode === 'delete' ? (
            <div className="trip-context-delete">
              <p className="trip-context-confirm">Delete this trip from the sidebar?</p>
              <div className="trip-context-actions">
                <button
                  type="button"
                  className="trip-context-btn"
                  onClick={() => setMenuState(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="trip-context-btn danger"
                  onClick={() => {
                    deleteTrip(menuTrip.id)
                    setMenuState(null)
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </nav>
  )
}
