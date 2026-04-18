'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { getAirportByCode } from '@/lib/airports'
import type { FlightSearchInput, FlightSearchResult } from '@/lib/flight-types'
import type { CultureCode } from '@/lib/culture-data'
import type { GeneratedProjectPayload, ManualTripInput } from '@/lib/trip-project'

export type TripDestination = {
  name: string
  lat: number
  lng: number
}

export type Trip = {
  id: string
  name: string
  meta: string
  destination: TripDestination
}

type TripOverride = {
  name?: string
  meta?: string
}

export type TodoItem = {
  id: string
  text: string
  done: boolean
  group: 'before' | 'packing' | 'activities'
}

export type NoteItem = {
  id: string
  title: string
  preview: string
  content: string
  date: string
}

export type BudgetCategory = 'flights' | 'hotels' | 'food' | 'transport' | 'activities' | 'other'

export type BudgetExpense = {
  id: string
  icon: string
  label: string
  date: string
  amount: number
  currency: string
  category: BudgetCategory
}

export type BudgetExpensePrefill = {
  label?: string
  amount?: number
  currency?: string
  category?: BudgetCategory
  date?: string
}

type ChatMessage = {
  id: string
  role: 'user' | 'bot'
  text: string
}

function createChatId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function createNimbusIntro(destination?: string): ChatMessage {
  const destinationLabel = destination || 'your destination'
  return {
    id: createChatId(),
    role: 'bot',
    text:
      `Hey there, traveller! I'm **Nimbus** ☁️ — your AI companion for Cloud Source.\n\n` +
      `I'm tuned into **${destinationLabel}** right now — cultural tips, hidden gems, food, and practical advice, all ready to go.\n\n` +
      `Before I start suggesting, tell me — what kind of traveller are you? Solo explorer, foodie, culture-seeker? 🌍`,
  }
}

function budgetIconForCategory(category: BudgetCategory) {
  if (category === 'flights') return '✈️'
  if (category === 'hotels') return '🏨'
  if (category === 'food') return '🍜'
  if (category === 'transport') return '🚇'
  if (category === 'activities') return '🎌'
  return '💰'
}

function parseBudgetInput(raw: string) {
  const clean = raw.replace(/,/g, '')
  const match = clean.match(/([£$€¥])?\s*(\d+(?:\.\d+)?)/)
  if (!match) return null
  const amount = Number(match[2])
  if (!Number.isFinite(amount) || amount <= 0) return null
  return {
    amount,
    currency: match[1] || undefined,
  }
}

function decodeHtmlText(source: string) {
  return source
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function plainTextFromHtml(input: string) {
  if (!input) return ''

  if (typeof document !== 'undefined') {
    const div = document.createElement('div')
    div.innerHTML = input
    return (div.textContent || '').replace(/\s+/g, ' ').trim()
  }

  return input
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractNoteMetaFromContent(content: string, fallbackTitle: string, fallbackPreview: string) {
  const titleMatch = content.match(
    /<h[1-6][^>]*class=(?:"|')[^"']*note-page-title[^"']*(?:"|')[^>]*>([\s\S]*?)<\/h[1-6]>/i
  )

  const titleFromContent = titleMatch
    ? decodeHtmlText(titleMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    : ''

  const bodyHtml = titleMatch ? content.replace(titleMatch[0], '') : content
  const bodyText = plainTextFromHtml(bodyHtml)

  return {
    title: titleFromContent || fallbackTitle || 'Untitled Note',
    preview: (bodyText || fallbackPreview || 'No content yet').slice(0, 60),
  }
}

export const TRIPS: Trip[] = [
  {
    id: 'tokyo-26',
    name: "Tokyo '26",
    meta: 'Japan - May 2026',
    destination: { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  },
  {
    id: 'paris-26',
    name: "Paris '26",
    meta: 'France - Jul 2026',
    destination: { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  },
  {
    id: 'dubai-26',
    name: "Dubai '26",
    meta: 'UAE - Nov 2026',
    destination: { name: 'Dubai', lat: 25.2048, lng: 55.2708 },
  },
]

const DEFAULT_FLIGHT_SEARCH: FlightSearchInput = {
  fromCode: 'YUL',
  toCode: 'NRT',
  departDate: '2026-05-15',
  returnDate: '2026-05-28',
  adults: 2,
}

const DEFAULT_TODOS: TodoItem[] = [
  { id: 'td-1', text: 'Book flights', done: true, group: 'before' },
  { id: 'td-2', text: 'Reserve hotel', done: true, group: 'before' },
  { id: 'td-3', text: 'Get travel insurance', done: true, group: 'before' },
  { id: 'td-4', text: 'Book TeamLab Borderless', done: false, group: 'before' },
  { id: 'td-5', text: 'Get pocket WiFi or SIM card', done: false, group: 'packing' },
  { id: 'td-6', text: 'Portable charger', done: false, group: 'packing' },
  { id: 'td-7', text: 'Senso-ji sunrise visit', done: true, group: 'activities' },
  { id: 'td-8', text: 'Shibuya crossing rush hour', done: false, group: 'activities' },
]

const DEFAULT_NOTES: NoteItem[] = [
  {
    id: 'n-1',
    title: 'Tokyo Itinerary',
    preview: 'Day 1: Arrive Narita, check into Park Hyatt...',
    date: '2026-04-14',
    content:
      'DAY 1 - ARRIVAL\n- Land at Narita\n- Narita Express to Shinjuku\n- Evening in Golden Gai',
  },
  {
    id: 'n-2',
    title: 'Restaurant Wishlist',
    preview: 'Narisawa, Sushi Saito, Sukiyabashi Jiro...',
    date: '2026-04-10',
    content: 'Narisawa\nSushi Saito\nSukiyabashi Jiro',
  },
]

const DEFAULT_BUDGET_EXPENSES: BudgetExpense[] = [
  {
    id: 'be-1',
    icon: '✈️',
    label: 'British Airways LHR → NRT',
    date: '2026-05-15',
    amount: 689,
    currency: '£',
    category: 'flights',
  },
  {
    id: 'be-2',
    icon: '🏨',
    label: 'Park Hyatt Tokyo · 7 nights',
    date: '2026-05-15 → 2026-05-22',
    amount: 840,
    currency: '£',
    category: 'hotels',
  },
  {
    id: 'be-3',
    icon: '🍜',
    label: 'Narisawa Restaurant',
    date: '2026-05-16',
    amount: 148,
    currency: '£',
    category: 'food',
  },
  {
    id: 'be-4',
    icon: '🎌',
    label: 'TeamLab Borderless',
    date: '2026-05-17',
    amount: 32,
    currency: '£',
    category: 'activities',
  },
  {
    id: 'be-5',
    icon: '🚇',
    label: 'JR Pass (7-day)',
    date: '2026-05-15',
    amount: 231,
    currency: '£',
    category: 'transport',
  },
]

function resolveTrips(input: {
  customTrips: Trip[]
  tripOverrides: Record<string, TripOverride>
  deletedTripIds: string[]
}) {
  const deleted = new Set(input.deletedTripIds)

  return [...TRIPS, ...input.customTrips]
    .filter((trip) => !deleted.has(trip.id))
    .map((trip) => {
      const override = input.tripOverrides[trip.id]
      if (!override) return trip

      return {
        ...trip,
        name: override.name?.trim() || trip.name,
        meta: override.meta?.trim() || trip.meta,
      }
    })
}

type AppState = {
  tripIdx: number
  customTrips: Trip[]
  tripOverrides: Record<string, TripOverride>
  deletedTripIds: string[]
  tripCreatorOpen: boolean
  flightSearch: FlightSearchInput
  flightResult: FlightSearchResult | null
  selectedItineraryId: string | null
  notesTab: 'notes' | 'mood'
  selectedNoteId: string
  notes: NoteItem[]
  todos: TodoItem[]
  cultureCode: CultureCode
  budgetTotal: number
  budgetCurrency: string
  budgetExpenses: BudgetExpense[]
  budgetExpenseModalOpen: boolean
  budgetExpensePrefill: BudgetExpensePrefill | null
  budgetConfigModalOpen: boolean
  chat: ChatMessage[]
}

const STORAGE_KEY = 'cloudsource.app.state.v1'

const DEFAULT_STATE: AppState = {
  tripIdx: 0,
  customTrips: [],
  tripOverrides: {},
  deletedTripIds: [],
  tripCreatorOpen: false,
  flightSearch: DEFAULT_FLIGHT_SEARCH,
  flightResult: null,
  selectedItineraryId: null,
  notesTab: 'notes',
  selectedNoteId: DEFAULT_NOTES[0].id,
  notes: DEFAULT_NOTES,
  todos: DEFAULT_TODOS,
  cultureCode: 'jp',
  budgetTotal: 3200,
  budgetCurrency: '£',
  budgetExpenses: DEFAULT_BUDGET_EXPENSES,
  budgetExpenseModalOpen: false,
  budgetExpensePrefill: null,
  budgetConfigModalOpen: false,
  chat: [createNimbusIntro('Tokyo')],
}

type AppStateContextValue = {
  state: AppState
  trips: Trip[]
  activeTrip: Trip
  startAirport: { name: string; lat: number; lng: number }
  flightDestination: { name: string; lat: number; lng: number }
  setTripIdx: (idx: number) => void
  renameTrip: (id: string, name: string) => void
  deleteTrip: (id: string) => void
  openTripCreator: () => void
  closeTripCreator: () => void
  createManualTrip: (input: ManualTripInput) => void
  applyGeneratedProject: (payload: GeneratedProjectPayload) => void
  setFlightSearch: (next: FlightSearchInput) => void
  setFlightResult: (result: FlightSearchResult | null) => void
  setSelectedItineraryId: (id: string | null) => void
  setNotesTab: (tab: 'notes' | 'mood') => void
  setSelectedNoteId: (id: string) => void
  updateNoteContent: (id: string, content: string) => void
  createNote: (note?: { title?: string; content?: string; date?: string }) => string
  deleteNote: (id: string) => void
  toggleTodo: (id: string) => void
  setCultureCode: (code: AppState['cultureCode']) => void
  setBudgetConfig: (config: { total?: number; currency?: string }) => void
  addBudgetExpense: (expense: Omit<BudgetExpense, 'id' | 'icon'> & { icon?: string }) => void
  openBudgetExpenseModal: (prefill?: BudgetExpensePrefill) => void
  closeBudgetExpenseModal: () => void
  openBudgetConfigModal: () => void
  closeBudgetConfigModal: () => void
  addQuickNote: (note: { title: string; content: string; preview?: string; date?: string }) => void
  pushChatMessage: (message: Omit<ChatMessage, 'id'>) => void
  clearChatMessages: () => void
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

function parseStoredState(raw: string | null): AppState | null {
  if (!raw) return null
  try {
    const next = JSON.parse(raw) as AppState
    return {
      ...DEFAULT_STATE,
      ...next,
    }
  } catch {
    return null
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = parseStoredState(window.localStorage.getItem(STORAGE_KEY))
    if (stored) {
      setState(stored)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state, hydrated])

  const value = useMemo<AppStateContextValue>(() => {
    const trips = resolveTrips(state)
    const safeTripIdx = trips.length
      ? Math.max(0, Math.min(state.tripIdx, trips.length - 1))
      : 0
    const activeTrip = trips[safeTripIdx] ?? TRIPS[0]
    const fromAirport = getAirportByCode(state.flightSearch.fromCode)
    const toAirport = getAirportByCode(state.flightSearch.toCode)

    return {
      state: { ...state, tripIdx: safeTripIdx },
      trips,
      activeTrip,
      startAirport: {
        name: `${fromAirport.city} (${fromAirport.code})`,
        lat: fromAirport.lat,
        lng: fromAirport.lng,
      },
      flightDestination: {
        name: `${toAirport.city} (${toAirport.code})`,
        lat: toAirport.lat,
        lng: toAirport.lng,
      },
      setTripIdx: (idx) =>
        setState((prev) => ({
          ...prev,
          tripIdx: Math.max(0, Math.min(idx, resolveTrips(prev).length - 1)),
        })),
      renameTrip: (id, name) =>
        setState((prev) => {
          const nextName = name.trim()
          if (!nextName) return prev

          const exists = resolveTrips(prev).some((trip) => trip.id === id)
          if (!exists) return prev

          const baseTrip = [...TRIPS, ...prev.customTrips].find((trip) => trip.id === id)
          if (!baseTrip) return prev

          if (prev.customTrips.some((trip) => trip.id === id)) {
            return {
              ...prev,
              customTrips: prev.customTrips.map((trip) =>
                trip.id === id ? { ...trip, name: nextName } : trip
              ),
            }
          }

          return {
            ...prev,
            tripOverrides: {
              ...prev.tripOverrides,
              [id]: {
                ...prev.tripOverrides[id],
                name: nextName,
              },
            },
          }
        }),
      deleteTrip: (id) =>
        setState((prev) => {
          const visibleTrips = resolveTrips(prev)
          if (visibleTrips.length <= 1) return prev

          const targetIdx = visibleTrips.findIndex((trip) => trip.id === id)
          if (targetIdx < 0) return prev

          const isCustomTrip = prev.customTrips.some((trip) => trip.id === id)
          const nextCustomTrips = isCustomTrip
            ? prev.customTrips.filter((trip) => trip.id !== id)
            : prev.customTrips

          const nextDeletedTripIds = isCustomTrip
            ? prev.deletedTripIds
            : [...new Set([...prev.deletedTripIds, id])]

          const nextTripOverrides = { ...prev.tripOverrides }
          delete nextTripOverrides[id]

          const nextState: AppState = {
            ...prev,
            customTrips: nextCustomTrips,
            deletedTripIds: nextDeletedTripIds,
            tripOverrides: nextTripOverrides,
          }

          const nextVisibleTrips = resolveTrips(nextState)
          if (!nextVisibleTrips.length) return prev

          const nextIdx =
            prev.tripIdx > targetIdx
              ? prev.tripIdx - 1
              : prev.tripIdx === targetIdx
                ? Math.min(targetIdx, nextVisibleTrips.length - 1)
                : prev.tripIdx

          return {
            ...nextState,
            tripIdx: Math.max(0, Math.min(nextIdx, nextVisibleTrips.length - 1)),
          }
        }),
      openTripCreator: () =>
        setState((prev) => ({
          ...prev,
          tripCreatorOpen: true,
        })),
      closeTripCreator: () =>
        setState((prev) => ({
          ...prev,
          tripCreatorOpen: false,
        })),
      createManualTrip: (input) =>
        setState((prev) => {
          const nextTrip: Trip = {
            id: `trip-${Date.now()}`,
            name: input.name.trim() || `${input.destinationName} Trip`,
            meta: `${input.destinationName} - ${input.startDate || 'TBD'}`,
            destination: {
              name: input.destinationName.trim() || 'New Destination',
              lat: input.destinationLat ?? getAirportByCode(input.toCode).lat,
              lng: input.destinationLng ?? getAirportByCode(input.toCode).lng,
            },
          }

          const notes = input.notes.trim()
            ? [
                {
                  id: `n-${Date.now()}`,
                  title: `${nextTrip.name} Brief`,
                  preview: input.notes.trim().slice(0, 48),
                  content: input.notes.trim(),
                  date: new Date().toISOString().slice(0, 10),
                },
              ]
            : prev.notes

          const todos = [
            { id: `td-${Date.now()}-1`, text: 'Confirm flights', done: false, group: 'before' as const },
            { id: `td-${Date.now()}-2`, text: 'Book stay', done: false, group: 'before' as const },
            { id: `td-${Date.now()}-3`, text: 'Prepare packing list', done: false, group: 'packing' as const },
          ]

          const manualBudget = parseBudgetInput(input.budget)

          const nextState: AppState = {
            ...prev,
            customTrips: [...prev.customTrips, nextTrip],
            tripCreatorOpen: false,
            cultureCode: input.cultureCode,
            flightSearch: {
              fromCode: input.fromCode,
              toCode: input.toCode,
              departDate: input.startDate || prev.flightSearch.departDate,
              returnDate: input.endDate || prev.flightSearch.returnDate,
              adults: Math.max(1, input.travelers || 1),
            },
            flightResult: null,
            selectedItineraryId: null,
            notes,
            selectedNoteId: notes[0]?.id ?? prev.selectedNoteId,
            todos,
            budgetTotal: manualBudget?.amount ?? prev.budgetTotal,
            budgetCurrency: manualBudget?.currency ?? prev.budgetCurrency,
            chat: [
              {
                id: `m-${Date.now()}`,
                role: 'bot',
                text: `Trip created for ${nextTrip.destination.name}. Flights, notes, and checklist are ready to customize.`,
              },
            ],
          }

          const nextTrips = resolveTrips(nextState)

          return {
            ...nextState,
            tripIdx: Math.max(0, nextTrips.length - 1),
          }
        }),
      applyGeneratedProject: (payload) =>
        setState((prev) => {
          const nextTrip: Trip = {
            id: `trip-${Date.now()}`,
            name: payload.trip.name,
            meta: payload.trip.meta,
            destination: payload.trip.destination,
          }
          const notes = payload.notes.length
            ? payload.notes.map((note, index) => ({
                id: `n-${Date.now()}-${index}`,
                title: note.title,
                preview: note.preview,
                content: note.content,
                date: note.date,
              }))
            : prev.notes
          const todos = payload.todos.length
            ? payload.todos.map((todo, index) => ({
                id: `td-${Date.now()}-${index}`,
                text: todo.text,
                done: Boolean(todo.done),
                group: todo.group,
              }))
            : prev.todos

          const nextState: AppState = {
            ...prev,
            customTrips: [...prev.customTrips, nextTrip],
            tripCreatorOpen: false,
            cultureCode: payload.cultureCode,
            flightSearch: payload.flightSearch,
            flightResult: null,
            selectedItineraryId: null,
            notes,
            selectedNoteId: notes[0]?.id ?? prev.selectedNoteId,
            todos,
            chat: [
              {
                id: `m-${Date.now()}`,
                role: 'bot',
                text:
                  payload.chatIntro ??
                  `Project generated for ${payload.trip.destination.name}. Review flights, culture, notes, and to-do next.`,
              },
            ],
          }

          const nextTrips = resolveTrips(nextState)

          return {
            ...nextState,
            tripIdx: Math.max(0, nextTrips.length - 1),
          }
        }),
      setFlightSearch: (next) =>
        setState((prev) => ({
          ...prev,
          flightSearch: next,
        })),
      setFlightResult: (result) =>
        setState((prev) => ({
          ...prev,
          flightResult: result,
          selectedItineraryId: result?.itineraries[0]?.id ?? null,
        })),
      setSelectedItineraryId: (id) =>
        setState((prev) => ({
          ...prev,
          selectedItineraryId: id,
        })),
      setNotesTab: (tab) =>
        setState((prev) => ({
          ...prev,
          notesTab: tab,
        })),
      setSelectedNoteId: (id) =>
        setState((prev) => ({
          ...prev,
          selectedNoteId: id,
        })),
      updateNoteContent: (id, content) =>
        setState((prev) => ({
          ...prev,
          notes: prev.notes.map((n) => {
            if (n.id !== id) return n

            const meta = extractNoteMetaFromContent(content, n.title, n.preview)
            return {
              ...n,
              title: meta.title,
              preview: meta.preview,
              content,
              date: new Date().toISOString().slice(0, 10),
            }
          }),
        })),
      createNote: (note) => {
        const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        const today = new Date().toISOString().slice(0, 10)
        const title = note?.title?.trim() || 'Untitled Note'
        const content = note?.content ?? ''
        const meta = extractNoteMetaFromContent(content, title, title)

        setState((prev) => ({
          ...prev,
          notes: [
            {
              id,
              title: meta.title,
              preview: meta.preview,
              content,
              date: note?.date ?? today,
            },
            ...prev.notes,
          ],
          selectedNoteId: id,
          notesTab: 'notes',
        }))

        return id
      },
      deleteNote: (id) =>
        setState((prev) => {
          if (prev.notes.length <= 1) return prev

          const nextNotes = prev.notes.filter((n) => n.id !== id)
          if (!nextNotes.length) return prev

          return {
            ...prev,
            notes: nextNotes,
            selectedNoteId:
              prev.selectedNoteId === id
                ? nextNotes[0].id
                : nextNotes.some((n) => n.id === prev.selectedNoteId)
                  ? prev.selectedNoteId
                  : nextNotes[0].id,
          }
        }),
      toggleTodo: (id) =>
        setState((prev) => ({
          ...prev,
          todos: prev.todos.map((td) => (td.id === id ? { ...td, done: !td.done } : td)),
        })),
      setCultureCode: (code) =>
        setState((prev) => ({
          ...prev,
          cultureCode: code,
        })),
      setBudgetConfig: ({ total, currency }) =>
        setState((prev) => ({
          ...prev,
          budgetTotal:
            typeof total === 'number' && Number.isFinite(total) && total > 0
              ? total
              : prev.budgetTotal,
          budgetCurrency: currency?.trim() ? currency.trim() : prev.budgetCurrency,
        })),
      addBudgetExpense: (expense) =>
        setState((prev) => {
          const amount = Number(expense.amount)
          if (!Number.isFinite(amount) || amount <= 0) return prev

          return {
            ...prev,
            budgetExpenses: [
              ...prev.budgetExpenses,
              {
                id: `be-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                icon: expense.icon ?? budgetIconForCategory(expense.category),
                label: expense.label,
                date: expense.date,
                amount,
                currency: expense.currency || prev.budgetCurrency,
                category: expense.category,
              },
            ],
          }
        }),
      openBudgetExpenseModal: (prefill) =>
        setState((prev) => ({
          ...prev,
          budgetExpenseModalOpen: true,
          budgetExpensePrefill: prefill ?? null,
        })),
      closeBudgetExpenseModal: () =>
        setState((prev) => ({
          ...prev,
          budgetExpenseModalOpen: false,
          budgetExpensePrefill: null,
        })),
      openBudgetConfigModal: () =>
        setState((prev) => ({
          ...prev,
          budgetConfigModalOpen: true,
        })),
      closeBudgetConfigModal: () =>
        setState((prev) => ({
          ...prev,
          budgetConfigModalOpen: false,
        })),
      addQuickNote: (note) =>
        setState((prev) => {
          const content = note.content.trim()
          if (!content) return prev

          const now = new Date().toISOString().slice(0, 10)
          const nextNote: NoteItem = {
            id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: note.title.trim() || 'Quick Note',
            preview: (note.preview?.trim() || content).slice(0, 60),
            content,
            date: note.date ?? now,
          }

          return {
            ...prev,
            notes: [nextNote, ...prev.notes],
            selectedNoteId: nextNote.id,
            notesTab: 'notes',
          }
        }),
      pushChatMessage: (message) =>
        setState((prev) => ({
          ...prev,
          chat: [
            ...prev.chat,
            {
              id: createChatId(),
              role: message.role,
              text: message.text,
            },
          ],
        })),
      clearChatMessages: () =>
        setState((prev) => {
          const trips = resolveTrips(prev)
          const safeTripIdx = Math.max(0, Math.min(prev.tripIdx, trips.length - 1))
          const destination = trips[safeTripIdx]?.destination.name
          return {
            ...prev,
            chat: [createNimbusIntro(destination)],
          }
        }),
    }
  }, [state])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) {
    throw new Error('useAppState must be used within AppStateProvider')
  }
  return ctx
}
