'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { TripSidebar } from '@/components/app/TripSidebar'
import { useAppState } from '@/components/app/AppStateProvider'
import type { CultureCode } from '@/lib/culture-data'
import {
  buildTodoDidIForgetPrompt,
  buildTodoOrganizePrompt,
} from '@/lib/prompts/todo'

type TodoPriority = 'critical' | 'high' | 'medium' | 'low'
type TodoSectionColor = 'red' | 'pink' | 'blue' | 'green' | 'purple' | 'yellow' | 'orange'

type TodoSectionItem = {
  id: number
  text: string
  priority: TodoPriority
  done: boolean
}

type TodoSection = {
  id: string
  title: string
  color: TodoSectionColor
  items: TodoSectionItem[]
}

type TodoSuggestion = {
  text: string
  priority: TodoPriority
  sectionId?: string
}

type TodoPriorityResult = {
  forgottenCriticalItems: TodoSuggestion[]
  highPriorityReminders: TodoSuggestion[]
  topPriorityList: Array<{ text: string; reason?: string }>
}

type TodoNlpResponse = {
  forgottenCriticalItems?: Array<string | { text?: string; priority?: string; sectionId?: string }>
  highPriorityReminders?: Array<string | { text?: string; priority?: string; sectionId?: string }>
  topPriorityList?: Array<string | { text?: string; reason?: string }>
}

const PRIO_ORDER: Record<TodoPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const TODO_COLOR_DOT: Record<TodoSectionColor, string> = {
  red: '#ef4444',
  pink: '#ec4899',
  blue: '#3b82f6',
  green: '#4ade80',
  purple: '#a855f7',
  yellow: '#fbbf24',
  orange: '#f97316',
}

const TODO_COLOR_CARD: Record<TodoSectionColor, string> = {
  red: 'rgba(239,68,68,.22)',
  pink: 'rgba(236,72,153,.22)',
  blue: 'rgba(59,130,246,.22)',
  green: 'rgba(74,222,128,.22)',
  purple: 'rgba(168,85,247,.22)',
  yellow: 'rgba(251,191,36,.22)',
  orange: 'rgba(249,115,22,.22)',
}

const SECTION_COLOR_ROTATION: TodoSectionColor[] = ['purple', 'orange', 'yellow', 'blue', 'green', 'pink']

const VISA_BY_DEST: Record<
  CultureCode | 'us',
  {
    flag: string
    ok: boolean | null
    text: string
  }
> = {
  jp: {
    flag: '🇯🇵',
    ok: true,
    text: 'No visa required. Canadians can stay up to 90 days in Japan as visitors.',
  },
  fr: {
    flag: '🇫🇷',
    ok: true,
    text: 'No visa required. Canadians can stay up to 90 days in the Schengen zone.',
  },
  ae: {
    flag: '🇦🇪',
    ok: true,
    text: 'No visa required. Canadians receive 30 days on arrival in the UAE.',
  },
  th: {
    flag: '🇹🇭',
    ok: true,
    text: 'No visa required for many short stays. Confirm latest rules for your passport.',
  },
  it: {
    flag: '🇮🇹',
    ok: true,
    text: 'No visa required. Italy follows Schengen short-stay rules for Canadians.',
  },
  au: {
    flag: '🇦🇺',
    ok: false,
    text: 'ETA required before departure. Apply online and carry your approval details.',
  },
  us: {
    flag: '🇺🇸',
    ok: true,
    text: 'No visa required for most short Canadian tourist visits. Carry documentation.',
  },
}

function toValidPriority(priority: unknown): TodoPriority {
  if (priority === 'critical' || priority === 'high' || priority === 'medium' || priority === 'low') {
    return priority
  }
  return 'medium'
}

function toNumberId() {
  return Date.now() + Math.floor(Math.random() * 1000)
}

function buildDefaultSections(destinationName: string, fromCode: string, toCode: string): TodoSection[] {
  return [
    {
      id: 'docs',
      title: 'Documents & Visa',
      color: 'red',
      items: [
        { id: 1001, text: 'Passport valid for 6+ months beyond travel date', priority: 'critical', done: true },
        { id: 1002, text: 'Confirm visa requirements for destination', priority: 'critical', done: true },
        { id: 1003, text: 'Photo copies of all docs stored in cloud', priority: 'high', done: false },
        { id: 1004, text: 'Travel insurance policy documents saved offline', priority: 'high', done: false },
      ],
    },
    {
      id: 'before',
      title: 'Before You Go',
      color: 'pink',
      items: [
        { id: 2001, text: `Book flights ${fromCode} -> ${toCode}`, priority: 'critical', done: true },
        { id: 2002, text: 'Reserve hotel / accommodation', priority: 'critical', done: true },
        { id: 2003, text: 'Notify bank of international travel dates', priority: 'high', done: false },
        { id: 2004, text: 'Download translation and maps for offline usage', priority: 'high', done: false },
        { id: 2005, text: `Book one must-do experience in ${destinationName}`, priority: 'medium', done: false },
      ],
    },
    {
      id: 'packing',
      title: 'Packing List',
      color: 'blue',
      items: [
        { id: 3001, text: 'Passport + copies', priority: 'critical', done: true },
        { id: 3002, text: 'Portable charger / power bank', priority: 'medium', done: false },
        { id: 3003, text: 'Universal travel adapter', priority: 'high', done: false },
        { id: 3004, text: 'Comfortable walking shoes', priority: 'medium', done: false },
      ],
    },
    {
      id: 'activities',
      title: 'Activities',
      color: 'green',
      items: [
        { id: 4001, text: `Build a day-by-day mini itinerary for ${destinationName}`, priority: 'medium', done: true },
        { id: 4002, text: 'Reserve top attractions early to avoid sellouts', priority: 'medium', done: false },
        { id: 4003, text: 'Create a rainy-day backup plan', priority: 'low', done: false },
      ],
    },
  ]
}

function mapLegacyTodosToSections(
  legacyTodos: Array<{ id: string; text: string; done: boolean; group: 'before' | 'packing' | 'activities' }>,
  destinationName: string,
  fromCode: string,
  toCode: string
): TodoSection[] {
  const defaults = buildDefaultSections(destinationName, fromCode, toCode)

  if (!legacyTodos.length) {
    return defaults
  }

  const byGroup = {
    before: legacyTodos.filter((td) => td.group === 'before'),
    packing: legacyTodos.filter((td) => td.group === 'packing'),
    activities: legacyTodos.filter((td) => td.group === 'activities'),
  }

  return defaults.map((section) => {
    if (section.id !== 'before' && section.id !== 'packing' && section.id !== 'activities') {
      return section
    }

    const source = byGroup[section.id]
    if (!source.length) return section

    return {
      ...section,
      items: source.map((item, index) => ({
        id: toNumberId() + index,
        text: item.text,
        done: item.done,
        priority: section.id === 'before' ? 'high' : section.id === 'packing' ? 'medium' : 'low',
      })),
    }
  })
}

function sanitizeSections(input: unknown): TodoSection[] | null {
  if (!input || typeof input !== 'object') return null
  const candidate = input as { sections?: unknown }
  if (!Array.isArray(candidate.sections) || !candidate.sections.length) return null

  const validSections: TodoSection[] = []
  for (const rawSection of candidate.sections) {
    if (!rawSection || typeof rawSection !== 'object') continue
    const section = rawSection as {
      id?: unknown
      title?: unknown
      color?: unknown
      items?: unknown
    }

    if (typeof section.id !== 'string' || !section.id.trim()) continue
    if (typeof section.title !== 'string' || !section.title.trim()) continue
    if (!Array.isArray(section.items)) continue

    const color =
      section.color === 'red' ||
      section.color === 'pink' ||
      section.color === 'blue' ||
      section.color === 'green' ||
      section.color === 'purple' ||
      section.color === 'yellow' ||
      section.color === 'orange'
        ? section.color
        : 'purple'

    const items: TodoSectionItem[] = []
    for (const rawItem of section.items) {
      if (!rawItem || typeof rawItem !== 'object') continue
      const item = rawItem as {
        id?: unknown
        text?: unknown
        priority?: unknown
        done?: unknown
      }
      if (typeof item.text !== 'string' || !item.text.trim()) continue

      const itemId = typeof item.id === 'number' ? item.id : toNumberId()
      items.push({
        id: itemId,
        text: item.text.trim(),
        priority: toValidPriority(item.priority),
        done: Boolean(item.done),
      })
    }

    validSections.push({
      id: section.id,
      title: section.title.trim(),
      color,
      items,
    })
  }

  return validSections.length ? validSections : null
}

async function readNimbusSse(response: Response) {
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(detail || `HTTP ${response.status}`)
  }
  if (!response.body) {
    throw new Error('Nimbus stream body missing')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (raw === '[DONE]') continue
      try {
        const payload = JSON.parse(raw) as { text?: string; error?: string }
        if (payload.error) throw new Error(payload.error)
        if (payload.text) full += payload.text
      } catch {
        // Ignore malformed chunks.
      }
    }
  }

  return full.trim()
}

function extractJsonObject(text: string) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  const candidate = text.slice(start, end + 1)
  try {
    return JSON.parse(candidate) as TodoNlpResponse
  } catch {
    return null
  }
}

function normalizedSuggestions(input: TodoNlpResponse | null): TodoPriorityResult | null {
  if (!input) return null

  const normalizeSuggestion = (
    item: string | { text?: string; priority?: string; sectionId?: string },
    fallbackPriority: TodoPriority,
    fallbackSection: string
  ): TodoSuggestion | null => {
    if (typeof item === 'string') {
      const text = item.trim()
      if (!text) return null
      return {
        text,
        priority: fallbackPriority,
        sectionId: fallbackSection,
      }
    }

    const text = typeof item.text === 'string' ? item.text.trim() : ''
    if (!text) return null

    return {
      text,
      priority: toValidPriority(item.priority ?? fallbackPriority),
      sectionId: typeof item.sectionId === 'string' ? item.sectionId : fallbackSection,
    }
  }

  const forgotten = (input.forgottenCriticalItems ?? [])
    .map((item) => normalizeSuggestion(item, 'critical', 'before'))
    .filter((item): item is TodoSuggestion => Boolean(item))

  const reminders = (input.highPriorityReminders ?? [])
    .map((item) => normalizeSuggestion(item, 'high', 'before'))
    .filter((item): item is TodoSuggestion => Boolean(item))

  const top = (input.topPriorityList ?? [])
    .map((item) => {
      if (typeof item === 'string') {
        const text = item.trim()
        return text ? { text } : null
      }
      const text = typeof item.text === 'string' ? item.text.trim() : ''
      if (!text) return null
      const reason = typeof item.reason === 'string' ? item.reason.trim() : undefined
      return { text, reason }
    })
    .filter((item): item is { text: string; reason?: string } => Boolean(item))

  if (!forgotten.length && !reminders.length && !top.length) return null

  return {
    forgottenCriticalItems: forgotten,
    highPriorityReminders: reminders,
    topPriorityList: top,
  }
}

function fallbackPriorityResult(destinationName: string): TodoPriorityResult {
  return {
    forgottenCriticalItems: [
      {
        text: `Save emergency contacts and embassy details for ${destinationName} offline`,
        priority: 'critical',
        sectionId: 'docs',
      },
      {
        text: 'Notify your bank and card issuer about international travel dates',
        priority: 'high',
        sectionId: 'before',
      },
      {
        text: 'Store hotel and transport confirmations in offline files',
        priority: 'high',
        sectionId: 'before',
      },
    ],
    highPriorityReminders: [
      {
        text: 'Download offline maps and translation packs before departure',
        priority: 'high',
        sectionId: 'before',
      },
      {
        text: 'Prepare a small first-day cash reserve in local currency',
        priority: 'medium',
        sectionId: 'packing',
      },
    ],
    topPriorityList: [
      { text: 'Passport and visa readiness', reason: 'Entry failures stop the whole trip.' },
      { text: 'Bank and payment readiness', reason: 'Prevents cards getting blocked abroad.' },
      { text: 'Connectivity plan (SIM/eSIM/WiFi)', reason: 'Navigation and communication depend on this.' },
      { text: 'Core bookings reconfirmed', reason: 'Avoids last-minute cancellation surprises.' },
      { text: 'Offline backup docs', reason: 'Covers poor signal and device battery loss.' },
    ],
  }
}

export default function TodoPage() {
  const router = useRouter()
  const { state, activeTrip } = useAppState()
  const [sections, setSections] = useState<TodoSection[]>([])
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isOrganizing, setIsOrganizing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [priorityPanelOpen, setPriorityPanelOpen] = useState(false)
  const [priorityResult, setPriorityResult] = useState<TodoPriorityResult | null>(null)
  const autoResizeRef = useRef<number | null>(null)

  const storageKey = useMemo(() => `cloudsource.todo.v2.${activeTrip.id}`, [activeTrip.id])

  const destinationLabel = useMemo(() => {
    const monthYear = activeTrip.meta.split('-')[1]?.trim() || 'Upcoming Trip'
    return `${activeTrip.destination.name} · ${monthYear}`
  }, [activeTrip.destination.name, activeTrip.meta])

  const visaInfo = useMemo(() => {
    const fallback = {
      flag: '🌍',
      ok: null,
      text: 'Verify visa requirements through official government travel advisories before departure.',
    }
    return VISA_BY_DEST[state.cultureCode] ?? fallback
  }, [state.cultureCode])

  const progress = useMemo(() => {
    const all = sections.flatMap((section) => section.items)
    const done = all.filter((item) => item.done).length
    const percent = all.length ? Math.round((done / all.length) * 100) : 0
    return { all: all.length, done, percent }
  }, [sections])

  useEffect(() => {
    if (autoResizeRef.current !== null) {
      window.clearTimeout(autoResizeRef.current)
    }

    autoResizeRef.current = window.setTimeout(() => {
      document.querySelectorAll<HTMLTextAreaElement>('.todo-txt-edit').forEach((textarea) => {
        textarea.style.height = 'auto'
        textarea.style.height = `${textarea.scrollHeight}px`
      })
    }, 30)

    return () => {
      if (autoResizeRef.current !== null) {
        window.clearTimeout(autoResizeRef.current)
      }
    }
  }, [sections])

  useEffect(() => {
    let loadedFromStorage = false
    try {
      const raw = window.localStorage.getItem(storageKey)
      const parsed = raw ? sanitizeSections(JSON.parse(raw)) : null
      if (parsed?.length) {
        setSections(parsed)
        loadedFromStorage = true
      }
    } catch {
      loadedFromStorage = false
    }

    if (!loadedFromStorage) {
      const seeded = mapLegacyTodosToSections(
        state.todos,
        activeTrip.destination.name,
        state.flightSearch.fromCode,
        state.flightSearch.toCode
      )
      setSections(seeded)
    }
  }, [activeTrip.destination.name, state.flightSearch.fromCode, state.flightSearch.toCode, state.todos, storageKey])

  useEffect(() => {
    if (!sections.length) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ sections }))
    } catch {
      // Ignore storage quota errors.
    }
  }, [sections, storageKey])

  const mutateSection = useCallback((sectionId: string, updater: (section: TodoSection) => TodoSection) => {
    setSections((prev) => prev.map((section) => (section.id === sectionId ? updater(section) : section)))
  }, [])

  function toggleItem(sectionId: string, itemId: number) {
    mutateSection(sectionId, (section) => ({
      ...section,
      items: section.items.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)),
    }))
  }

  function deleteItem(sectionId: string, itemId: number) {
    mutateSection(sectionId, (section) => ({
      ...section,
      items: section.items.filter((item) => item.id !== itemId),
    }))
  }

  function updateItemText(sectionId: string, itemId: number, text: string) {
    mutateSection(sectionId, (section) => ({
      ...section,
      items: section.items.map((item) => (item.id === itemId ? { ...item, text } : item)),
    }))
  }

  function normalizeItemText(sectionId: string, itemId: number, text: string) {
    const clean = text.trim()
    updateItemText(sectionId, itemId, clean || 'New task')
  }

  function addItem(sectionId?: string, seed?: { text?: string; priority?: TodoPriority }) {
    const targetSectionId = sectionId || sections[0]?.id
    if (!targetSectionId) return

    const nextItem: TodoSectionItem = {
      id: toNumberId(),
      text: seed?.text || 'New task',
      priority: seed?.priority || 'medium',
      done: false,
    }

    mutateSection(targetSectionId, (section) => ({
      ...section,
      items: [...section.items, nextItem],
    }))
  }

  function renameSection(sectionId: string, title: string) {
    const clean = title.trim()
    if (!clean) return
    mutateSection(sectionId, (section) => ({
      ...section,
      title: clean,
    }))
  }

  function deleteSection(sectionId: string) {
    if (sections.length <= 1) {
      setStatusMessage('Need at least one section in your checklist.')
      return
    }
    setSections((prev) => prev.filter((section) => section.id !== sectionId))
  }

  function addSection() {
    const used = sections.map((section) => section.color)
    const color = SECTION_COLOR_ROTATION.find((candidate) => !used.includes(candidate)) || 'purple'

    setSections((prev) => [
      ...prev,
      {
        id: `sec-${Date.now()}`,
        title: 'New Section',
        color,
        items: [],
      },
    ])
  }

  async function todoNimbusOrganize() {
    if (!sections.length || isOrganizing) return

    setIsOrganizing(true)
    setStatusMessage('Nimbus is reviewing your checklist...')

    const context = sections
      .map((section) => {
        const lines = section.items.map((item, index) => `${index + 1}. [${item.done ? 'DONE' : 'TODO'}] ${item.text}`)
        return `${section.title}:\n${lines.join('\n')}`
      })
      .join('\n\n')

    const prompt = buildTodoOrganizePrompt(activeTrip.destination.name, context)

    try {
      const response = await fetch('/api/nimbus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: activeTrip.destination.name,
          preferences: { checklist: true },
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const text = await readNimbusSse(response)
      setStatusMessage(text || 'Your checklist already looks very organized.')
    } catch (error) {
      console.error('todoNimbusOrganize error:', error)
      setStatusMessage('Nimbus could not reorganize right now. Your list is still saved and up to date.')
    } finally {
      setIsOrganizing(false)
    }
  }

  async function todoDidIForget() {
    if (!sections.length || isAnalyzing) return

    setIsAnalyzing(true)
    setPriorityPanelOpen(true)

    const existing = sections
      .flatMap((section) => section.items.map((item) => `[${item.done ? 'DONE' : 'TODO'}][${item.priority}] ${item.text}`))
      .join('\n')

    const prompt = buildTodoDidIForgetPrompt(activeTrip.destination.name, existing)

    try {
      const response = await fetch('/api/nimbus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: activeTrip.destination.name,
          preferences: { checklist: true, priority: true },
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const streamText = await readNimbusSse(response)
      const parsed = extractJsonObject(streamText)
      const normalized = normalizedSuggestions(parsed)
      setPriorityResult(normalized ?? fallbackPriorityResult(activeTrip.destination.name))
    } catch (error) {
      console.error('todoDidIForget error:', error)
      setPriorityResult(fallbackPriorityResult(activeTrip.destination.name))
    } finally {
      setIsAnalyzing(false)
    }
  }

  function addSuggestion(item: TodoSuggestion) {
    const targetSectionId =
      item.sectionId && sections.some((section) => section.id === item.sectionId)
        ? item.sectionId
        : sections.some((section) => section.id === 'before')
          ? 'before'
          : sections[0]?.id

    if (!targetSectionId) return

    addItem(targetSectionId, {
      text: item.text,
      priority: item.priority,
    })
    setStatusMessage(`Added: ${item.text}`)
  }

  const visaTone =
    visaInfo.ok === false
      ? {
          icon: '⚠️',
          bg: 'rgba(251,146,60,.1)',
          border: 'rgba(251,146,60,.3)',
        }
      : {
          icon: visaInfo.ok === true ? '✅' : 'ℹ️',
          bg: 'rgba(59,130,246,.08)',
          border: 'rgba(59,130,246,.2)',
        }

  return (
    <div className="app">
      <TripSidebar />
      <main className="main">
        <div id="screen-todo" className="screen" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="todo-wrap">
            <div className="todo-header">
              <span style={{ fontSize: 24, flexShrink: 0 }}>✅</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, fontWeight: 800, letterSpacing: '.04em' }}>
                  TRIP TO-DO
                </div>
                <div className="ph-sub" style={{ fontSize: 11, marginTop: 1 }}>
                  {destinationLabel}
                </div>
              </div>

              <button className="btn btn-ghost" style={{ padding: '7px 13px', fontSize: 12 }} onClick={addSection}>
                + Section
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: '7px 13px', fontSize: 12 }}
                onClick={todoNimbusOrganize}
                disabled={isOrganizing}
              >
                {isOrganizing ? '☁️ Organizing...' : '☁️ Organize'}
              </button>
              <button className="btn btn-primary" style={{ padding: '7px 14px', fontSize: 12 }} onClick={() => addItem()}>
                + Task
              </button>
              <button className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: 12 }} onClick={() => router.push('/app')}>
                ← Back to Globe
              </button>
            </div>

            <div className="todo-nimbus-banner" style={{ background: visaTone.bg, borderColor: visaTone.border }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{visaTone.icon}</span>
              <div>
                <span style={{ fontFamily: 'var(--f-display)', fontSize: 10, letterSpacing: '.08em', color: 'var(--pink-soft)' }}>
                  ☁️ NIMBUS VISA GUIDE {visaInfo.flag}
                </span>
                <br />
                {visaInfo.text}
              </div>
            </div>

            {statusMessage ? (
              <div className="todo-nimbus-banner todo-helper-banner">
                <span style={{ fontSize: 16, flexShrink: 0 }}>☁️</span>
                <div>{statusMessage}</div>
              </div>
            ) : null}

            <div className="todo-scroll-area">
              <div className="todo-cols">
                {sections.map((section) => {
                  const dot = TODO_COLOR_DOT[section.color]
                  const card = TODO_COLOR_CARD[section.color]
                  const sortedItems = [...section.items].sort((a, b) => PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority])
                  const done = section.items.filter((item) => item.done).length

                  return (
                    <div key={section.id} className="todo-col" style={{ borderColor: card }}>
                      <div className="todo-col-head">
                        <div className="todo-dot" style={{ background: dot, boxShadow: `0 0 7px ${dot}88` }} />
                        <input
                          className="todo-col-title-edit"
                          defaultValue={section.title}
                          onBlur={(event) => renameSection(section.id, event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.currentTarget.blur()
                            }
                          }}
                        />
                        <div className="todo-count">
                          {done}/{section.items.length}
                        </div>
                        <button className="todo-col-del" title="Delete section" onClick={() => deleteSection(section.id)}>
                          ✕
                        </button>
                      </div>

                      {sortedItems.map((item) => (
                        <div key={item.id} className={`todo-item ${item.done ? 'done' : ''}`}>
                          <button className="todo-check-btn" title="Mark done" onClick={() => toggleItem(section.id, item.id)}>
                            {item.done ? '✓' : ''}
                          </button>
                          <textarea
                            className="todo-txt-edit"
                            rows={1}
                            value={item.text}
                            onChange={(event) => updateItemText(section.id, item.id, event.target.value)}
                            onBlur={(event) => normalizeItemText(section.id, item.id, event.target.value)}
                            onInput={(event) => {
                              const target = event.currentTarget
                              target.style.height = 'auto'
                              target.style.height = `${target.scrollHeight}px`
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault()
                                event.currentTarget.blur()
                              }
                            }}
                          />
                          <span className={`todo-priority-badge priority-${item.priority}`}>{item.priority.toUpperCase()}</span>
                          <button className="todo-del-btn" title="Delete" onClick={() => deleteItem(section.id, item.id)}>
                            ✕
                          </button>
                        </div>
                      ))}

                      <button className="todo-add-item-btn" onClick={() => addItem(section.id)}>
                        + Add task
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="todo-bottom-bar">
              <div style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)' }}>
                {progress.done} of {progress.all} tasks · {progress.percent}% complete
              </div>
              <button className="btn btn-primary todo-forget-btn" onClick={todoDidIForget} disabled={isAnalyzing}>
                {isAnalyzing ? '☁️ Analyzing...' : '🤔 Did I forget something?'}
              </button>
            </div>
          </div>

          {priorityPanelOpen ? (
            <div className="todo-priority-panel">
              <div className="tpp-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>☁️</span>
                  <div>
                    <div className="tpp-title">NIMBUS FINAL PRIORITY LIST</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Trip to {activeTrip.destination.name}</div>
                  </div>
                </div>
                <button
                  onClick={() => setPriorityPanelOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,.5)',
                    cursor: 'pointer',
                    fontSize: 20,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>

              <div className="tpp-content">
                {isAnalyzing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '24px 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 30 }}>☁️</div>
                    <div>
                      <div style={{ fontFamily: 'var(--f-display)', fontSize: 12, letterSpacing: '.08em' }}>
                        ANALYZING YOUR TRIP...
                      </div>
                      <div style={{ fontSize: 11, marginTop: 5 }}>
                        Checking all sections against common travel requirements.
                      </div>
                    </div>
                  </div>
                ) : null}

                {!isAnalyzing && priorityResult ? (
                  <>
                    <div className="tpp-section-head">🔴 FORGOTTEN CRITICAL ITEMS</div>
                    {priorityResult.forgottenCriticalItems.map((item, index) => (
                      <div key={`forgot-${index}`} className="tpp-item">
                        <span className="tpp-item-num">{index + 1}.</span>
                        <span className="tpp-item-text">{item.text}</span>
                        <button className="tpp-item-add" onClick={() => addSuggestion(item)}>
                          + Add
                        </button>
                      </div>
                    ))}

                    <div className="tpp-section-head">🟠 HIGH PRIORITY REMINDERS</div>
                    {priorityResult.highPriorityReminders.map((item, index) => (
                      <div key={`reminder-${index}`} className="tpp-item">
                        <span className="tpp-item-num">{index + 1}.</span>
                        <span className="tpp-item-text">{item.text}</span>
                        <button className="tpp-item-add" onClick={() => addSuggestion(item)}>
                          + Add
                        </button>
                      </div>
                    ))}

                    <div className="tpp-section-head">🟢 FINAL TOP PRIORITY LIST</div>
                    {priorityResult.topPriorityList.map((item, index) => (
                      <div key={`top-${index}`} className="tpp-item">
                        <span className="tpp-item-num">{index + 1}.</span>
                        <span className="tpp-item-text">
                          <strong>{item.text}</strong>
                          {item.reason ? ` — ${item.reason}` : ''}
                        </span>
                      </div>
                    ))}
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
