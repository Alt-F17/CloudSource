'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppState } from '@/components/app/AppStateProvider'
import { getAirportMap } from '@/lib/airports'
import type { CultureCode } from '@/lib/culture-data'
import type { GeneratedProjectPayload, ManualTripInput } from '@/lib/trip-project'

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = 'pick' | 'ai' | 'manual'
type AiStep = 'form' | 'generating' | 'done' | 'error'

const CULTURE_OPTIONS: { code: CultureCode; label: string; flag: string }[] = [
  { code: 'jp', label: 'Japan', flag: '🇯🇵' },
  { code: 'fr', label: 'France', flag: '🇫🇷' },
  { code: 'ae', label: 'UAE', flag: '🇦🇪' },
  { code: 'th', label: 'Thailand', flag: '🇹🇭' },
  { code: 'it', label: 'Italy', flag: '🇮🇹' },
  { code: 'au', label: 'Australia', flag: '🇦🇺' },
]

const VIBE_CHIPS = [
  'Adventure 🧗', 'Relaxation 🧘', 'Culture 🏛️', 'Food & Drink 🍜',
  'Nightlife 🎉', 'Nature 🌿', 'Shopping 🛍️', 'Photography 📸',
  'Romance 💕', 'Budget-Friendly 💸', 'Luxury ✨', 'Family 👨‍👩‍👧',
]

// ─── AI Flow ─────────────────────────────────────────────────────────────────

type AiForm = {
  destination: string
  budget: string
  startDate: string
  endDate: string
  travelers: number
  fromCode: string
  vibe: string[]
}

const DEFAULT_AI_FORM: AiForm = {
  destination: '',
  budget: '',
  startDate: '',
  endDate: '',
  travelers: 2,
  fromCode: 'YUL',
  vibe: [],
}

function AiPane({
  onClose,
  onApply,
}: {
  onClose: () => void
  onApply: (payload: GeneratedProjectPayload) => void
}) {
  const airports = Object.values(getAirportMap())
  const [form, setForm] = useState<AiForm>(DEFAULT_AI_FORM)
  const [step, setStep] = useState<AiStep>('form')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  function field<K extends keyof AiForm>(key: K, val: AiForm[K]) {
    setForm((p) => ({ ...p, [key]: val }))
  }

  function toggleVibe(v: string) {
    setForm((p) => ({
      ...p,
      vibe: p.vibe.includes(v) ? p.vibe.filter((x) => x !== v) : [...p.vibe, v],
    }))
  }

  async function generate() {
    if (!form.destination.trim()) return
    setStep('generating')
    setError('')

    const messages = [
      'Consulting flight databases…',
      'Crafting your itinerary…',
      'Researching local culture…',
      'Compiling packing list…',
      'Finalising your trip plan…',
    ]
    let i = 0
    setProgress(messages[0])
    const ticker = setInterval(() => {
      i = Math.min(i + 1, messages.length - 1)
      setProgress(messages[i])
    }, 1800)

    try {
      const res = await fetch('/api/trip/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      clearInterval(ticker)

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const payload: GeneratedProjectPayload = await res.json()
      setStep('done')
      setTimeout(() => onApply(payload), 700)
    } catch (err) {
      clearInterval(ticker)
      setError(err instanceof Error ? err.message : 'Generation failed')
      setStep('error')
    }
  }

  if (step === 'generating') {
    return (
      <div className="tc-generating">
        <div className="tc-spinner" />
        <div className="tc-gen-title">Gemini is building your trip</div>
        <div className="tc-gen-sub">{progress}</div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="tc-generating">
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div className="tc-gen-title">Trip generated!</div>
        <div className="tc-gen-sub">Loading your project…</div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="tc-generating">
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div className="tc-gen-title" style={{ color: 'var(--pink)' }}>Generation failed</div>
        <div className="tc-gen-sub" style={{ marginBottom: 24 }}>{error}</div>
        <button className="btn btn-primary" onClick={() => setStep('form')}>Try Again</button>
      </div>
    )
  }

  return (
    <div className="tc-body">
      <div className="tc-section-label">Destination</div>
      <input
        className="inp"
        placeholder="Where are you going? e.g. Tokyo, Japan"
        value={form.destination}
        onChange={(e) => field('destination', e.target.value)}
        autoFocus
      />

      <div className="tc-row">
        <div className="tc-field">
          <div className="tc-section-label">Depart</div>
          <input className="inp" type="date" value={form.startDate} onChange={(e) => field('startDate', e.target.value)} />
        </div>
        <div className="tc-field">
          <div className="tc-section-label">Return</div>
          <input className="inp" type="date" value={form.endDate} onChange={(e) => field('endDate', e.target.value)} />
        </div>
        <div className="tc-field" style={{ maxWidth: 110 }}>
          <div className="tc-section-label">Travellers</div>
          <input className="inp" type="number" min={1} max={20} value={form.travelers} onChange={(e) => field('travelers', Number(e.target.value))} />
        </div>
      </div>

      <div className="tc-row">
        <div className="tc-field">
          <div className="tc-section-label">Flying from</div>
          <select className="inp" value={form.fromCode} onChange={(e) => field('fromCode', e.target.value)} style={{ colorScheme: 'dark' }}>
            {airports.map((a) => (
              <option key={a.code} value={a.code}>{a.city} ({a.code})</option>
            ))}
          </select>
        </div>
        <div className="tc-field">
          <div className="tc-section-label">Budget (optional)</div>
          <input className="inp" placeholder="e.g. $3,000 CAD" value={form.budget} onChange={(e) => field('budget', e.target.value)} />
        </div>
      </div>

      <div className="tc-section-label" style={{ marginTop: 4 }}>Trip Vibe</div>
      <div className="tc-chips">
        {VIBE_CHIPS.map((v) => (
          <button
            key={v}
            type="button"
            className={`tc-chip ${form.vibe.includes(v) ? 'active' : ''}`}
            onClick={() => toggleVibe(v)}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="tc-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          onClick={generate}
          disabled={!form.destination.trim()}
        >
          ✨ Generate Trip
        </button>
      </div>
    </div>
  )
}

// ─── Manual Flow ──────────────────────────────────────────────────────────────

const DEFAULT_MANUAL: ManualTripInput = {
  name: '',
  destinationName: '',
  destinationLat: undefined,
  destinationLng: undefined,
  startDate: '',
  endDate: '',
  travelers: 2,
  budget: '',
  fromCode: 'YUL',
  toCode: 'NRT',
  cultureCode: 'jp',
  vibe: [],
  notes: '',
}

function ManualPane({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (input: ManualTripInput) => void
}) {
  const airports = Object.values(getAirportMap())
  const [form, setForm] = useState<ManualTripInput>(DEFAULT_MANUAL)

  function field<K extends keyof ManualTripInput>(key: K, val: ManualTripInput[K]) {
    setForm((p) => ({ ...p, [key]: val }))
  }

  function toggleVibe(v: string) {
    setForm((p) => ({
      ...p,
      vibe: p.vibe.includes(v) ? p.vibe.filter((x) => x !== v) : [...p.vibe, v],
    }))
  }

  const valid = form.destinationName.trim().length > 0

  return (
    <div className="tc-body">
      {/* Core */}
      <div className="tc-section-label">Trip Name <span className="tc-optional">optional</span></div>
      <input className="inp" placeholder="e.g. Tokyo Spring '26" value={form.name} onChange={(e) => field('name', e.target.value)} />

      <div className="tc-section-label">Destination <span className="tc-required">*</span></div>
      <input className="inp" placeholder="City or place name" value={form.destinationName} onChange={(e) => field('destinationName', e.target.value)} autoFocus />

      {/* Dates + travellers */}
      <div className="tc-row">
        <div className="tc-field">
          <div className="tc-section-label">Depart</div>
          <input className="inp" type="date" value={form.startDate} onChange={(e) => field('startDate', e.target.value)} />
        </div>
        <div className="tc-field">
          <div className="tc-section-label">Return</div>
          <input className="inp" type="date" value={form.endDate} onChange={(e) => field('endDate', e.target.value)} />
        </div>
        <div className="tc-field" style={{ maxWidth: 110 }}>
          <div className="tc-section-label">Travellers</div>
          <input className="inp" type="number" min={1} max={20} value={form.travelers} onChange={(e) => field('travelers', Number(e.target.value))} />
        </div>
      </div>

      {/* Airports + budget */}
      <div className="tc-row">
        <div className="tc-field">
          <div className="tc-section-label">Flying from</div>
          <select className="inp" value={form.fromCode} onChange={(e) => field('fromCode', e.target.value)} style={{ colorScheme: 'dark' }}>
            {airports.map((a) => <option key={a.code} value={a.code}>{a.city} ({a.code})</option>)}
          </select>
        </div>
        <div className="tc-field">
          <div className="tc-section-label">Flying to</div>
          <select className="inp" value={form.toCode} onChange={(e) => field('toCode', e.target.value)} style={{ colorScheme: 'dark' }}>
            {airports.map((a) => <option key={a.code} value={a.code}>{a.city} ({a.code})</option>)}
          </select>
        </div>
      </div>

      <div className="tc-section-label">Budget <span className="tc-optional">optional</span></div>
      <input className="inp" placeholder="e.g. $3,000 CAD" value={form.budget} onChange={(e) => field('budget', e.target.value)} />

      {/* Culture / destination panel */}
      <div className="tc-section-label" style={{ marginTop: 4 }}>Culture Region <span className="tc-optional">optional</span></div>
      <div className="tc-chips">
        {CULTURE_OPTIONS.map((c) => (
          <button
            key={c.code}
            type="button"
            className={`tc-chip ${form.cultureCode === c.code ? 'active' : ''}`}
            onClick={() => field('cultureCode', c.code)}
          >
            {c.flag} {c.label}
          </button>
        ))}
      </div>

      {/* Vibe */}
      <div className="tc-section-label" style={{ marginTop: 4 }}>Trip Vibe <span className="tc-optional">optional</span></div>
      <div className="tc-chips">
        {VIBE_CHIPS.map((v) => (
          <button
            key={v}
            type="button"
            className={`tc-chip ${form.vibe.includes(v) ? 'active' : ''}`}
            onClick={() => toggleVibe(v)}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Notes */}
      <div className="tc-section-label" style={{ marginTop: 4 }}>Initial Notes <span className="tc-optional">optional</span></div>
      <textarea
        className="inp"
        rows={3}
        placeholder="Any special requirements, ideas, or details for your trip…"
        value={form.notes}
        onChange={(e) => field('notes', e.target.value)}
        style={{ resize: 'vertical', minHeight: 72 }}
      />

      <div className="tc-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={() => onCreate(form)}>
          Create Trip →
        </button>
      </div>
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function TripCreatorModal() {
  const router = useRouter()
  const { state, closeTripCreator, createManualTrip, applyGeneratedProject } = useAppState()
  const [mode, setMode] = useState<Mode>('pick')

  const open = state.tripCreatorOpen

  // Reset mode when modal closes
  useEffect(() => {
    if (!open) setMode('pick')
  }, [open])

  const handleClose = useCallback(() => {
    closeTripCreator()
  }, [closeTripCreator])

  // Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, handleClose])

  if (!open) return null

  function handleApplyGenerated(payload: GeneratedProjectPayload) {
    applyGeneratedProject(payload)
    router.push('/app')
  }

  function handleCreateManual(input: ManualTripInput) {
    createManualTrip(input)
    router.push('/app')
  }

  return (
    <div className="tc-backdrop" onClick={handleClose}>
      <div className="tc-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="tc-header">
          <div className="tc-header-icon">
            {mode === 'ai' ? '✨' : mode === 'manual' ? '📋' : '🌍'}
          </div>
          <div>
            <div className="tc-title">
              {mode === 'pick' && 'New Trip'}
              {mode === 'ai' && 'Generate with AI'}
              {mode === 'manual' && 'Set Up Manually'}
            </div>
            <div className="tc-subtitle">
              {mode === 'pick' && 'How do you want to plan your next adventure?'}
              {mode === 'ai' && 'Gemini builds your full trip plan from scratch'}
              {mode === 'manual' && 'Fill in the details yourself'}
            </div>
          </div>
          <button className="tc-close" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        {/* ── Mode picker ── */}
        {mode === 'pick' && (
          <div className="tc-pick">
            <button className="tc-pick-card tc-pick-ai" onClick={() => setMode('ai')}>
              <div className="tc-pick-icon">✨</div>
              <div className="tc-pick-label">Generate with AI</div>
              <div className="tc-pick-desc">
                Tell Gemini your destination and preferences — it builds your entire trip plan in seconds. Flights, itinerary, packing list, culture guide, and notes all populated automatically.
              </div>
              <div className="tc-pick-cta">Let AI plan it →</div>
            </button>

            <div className="tc-pick-divider">or</div>

            <button className="tc-pick-card tc-pick-manual" onClick={() => setMode('manual')}>
              <div className="tc-pick-icon">📋</div>
              <div className="tc-pick-label">Set Up Manually</div>
              <div className="tc-pick-desc">
                Fill in the details yourself. Destination, dates, airports, budget, vibe, and notes — everything you need to start planning your way.
              </div>
              <div className="tc-pick-cta">Build it myself →</div>
            </button>
          </div>
        )}

        {/* ── Back button ── */}
        {mode !== 'pick' && (
          <button
            className="tc-back"
            onClick={() => setMode('pick')}
          >
            ← Back
          </button>
        )}

        {/* ── Panes ── */}
        {mode === 'ai' && (
          <AiPane onClose={handleClose} onApply={handleApplyGenerated} />
        )}
        {mode === 'manual' && (
          <ManualPane onClose={handleClose} onCreate={handleCreateManual} />
        )}
      </div>
    </div>
  )
}
