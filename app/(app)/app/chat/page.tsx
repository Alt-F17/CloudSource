'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { TripSidebar } from '@/components/app/TripSidebar'
import { useAppState } from '@/components/app/AppStateProvider'
import type { CultureCode } from '@/lib/culture-data'

const QUICK_REPLIES = [
  "Cultural do's and don'ts",
  'Show me hidden gems',
  'What should I eat there?',
  'Practical tips for transport and currency',
  'Build me a 3-day itinerary',
]

const TYPING_DELAY_MS = 420

type NimbusHistoryMessage = {
  role: 'user' | 'assistant'
  content: string
}

const NIMBUS_PREFS_KEY = 'cloudsource.nimbus.prefs.v1'

const DEST_NAME_TO_CODE: Record<string, CultureCode> = {
  tokyo: 'jp',
  japan: 'jp',
  paris: 'fr',
  france: 'fr',
  dubai: 'ae',
  uae: 'ae',
  bangkok: 'th',
  thailand: 'th',
  rome: 'it',
  italy: 'it',
  sydney: 'au',
  australia: 'au',
}

const SCREEN_ROUTE_MAP: Record<string, string> = {
  globe: '/app',
  flights: '/app/flights',
  hotels: '/app/hotels',
  budget: '/app/budget',
  chatbot: '/app/chat',
  chat: '/app/chat',
  notes: '/app/notes',
  todo: '/app/todo',
  about: '/app/about',
}

function toCultureCode(destination: string): CultureCode | null {
  const key = destination.toLowerCase().split(',')[0].trim()
  return DEST_NAME_TO_CODE[key] ?? null
}

function formatNimbusText(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
}

export default function ChatPage() {
  const router = useRouter()
  const {
    state,
    activeTrip,
    setCultureCode,
    setFlightSearch,
    setBudgetConfig,
    addBudgetExpense,
    pushChatMessage,
    clearChatMessages,
  } = useAppState()
  const [value, setValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [streamingReply, setStreamingReply] = useState('')
  const typingTimeoutRef = useRef<number | null>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const seededHistoryRef = useRef(false)
  const historyRef = useRef<NimbusHistoryMessage[]>([])
  const prefsRef = useRef<Record<string, string>>({})

  const destinationLabel = useMemo(() => {
    const countryOrRegion = activeTrip.meta.split('-')[0]?.trim()
    if (!countryOrRegion) return activeTrip.destination.name
    return `${activeTrip.destination.name}, ${countryOrRegion}`
  }, [activeTrip.destination.name, activeTrip.meta])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(NIMBUS_PREFS_KEY)
      prefsRef.current = stored ? (JSON.parse(stored) as Record<string, string>) : {}
    } catch {
      prefsRef.current = {}
    }
  }, [])

  const persistPrefs = useCallback(() => {
    try {
      window.localStorage.setItem(NIMBUS_PREFS_KEY, JSON.stringify(prefsRef.current))
    } catch {
      // Ignore storage failures in private mode.
    }
  }, [])

  useEffect(() => {
    if (seededHistoryRef.current) return
    historyRef.current = state.chat.map((msg) => ({
      role: msg.role === 'bot' ? 'assistant' : 'user',
      content: msg.text,
    }))
    seededHistoryRef.current = true
  }, [state.chat])

  const stopPendingAnimation = useCallback(() => {
    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      stopPendingAnimation()
    }
  }, [stopPendingAnimation])

  useEffect(() => {
    const el = messagesRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [state.chat, isTyping, streamingReply])

  const executeNimbusAction = useCallback(
    (type: string, params: Record<string, unknown>) => {
      if (type === 'set_destination') {
        const destination = typeof params.destination === 'string' ? params.destination : ''
        const explicitCode = typeof params.code === 'string' ? params.code : ''
        const inferredCode = explicitCode || (destination ? toCultureCode(destination) : null)
        if (
          inferredCode === 'jp' ||
          inferredCode === 'fr' ||
          inferredCode === 'ae' ||
          inferredCode === 'th' ||
          inferredCode === 'it' ||
          inferredCode === 'au'
        ) {
          setCultureCode(inferredCode)
        }
        return
      }

      if (type === 'set_origin') {
        const airport = typeof params.airport === 'string' ? params.airport.trim().toUpperCase() : ''
        if (airport.length >= 3) {
          setFlightSearch({ ...state.flightSearch, fromCode: airport.slice(0, 4) })
        }
        return
      }

      if (type === 'set_budget') {
        const total = Number(params.total)
        const currency = typeof params.currency === 'string' ? params.currency : undefined
        setBudgetConfig({ total: Number.isFinite(total) ? total : undefined, currency })
        return
      }

      if (type === 'add_expense') {
        const amount = Number(params.amount)
        if (!Number.isFinite(amount) || amount <= 0) return

        const label = typeof params.label === 'string' ? params.label : 'Expense'
        const date = typeof params.date === 'string' ? params.date : new Date().toISOString().slice(0, 10)
        const currency = typeof params.currency === 'string' ? params.currency : state.budgetCurrency
        const categoryRaw = typeof params.category === 'string' ? params.category : 'other'
        const category =
          categoryRaw === 'flights' ||
          categoryRaw === 'hotels' ||
          categoryRaw === 'food' ||
          categoryRaw === 'transport' ||
          categoryRaw === 'activities'
            ? categoryRaw
            : 'other'

        addBudgetExpense({
          label,
          date,
          amount,
          currency,
          category,
        })
        return
      }

      if (type === 'navigate') {
        const screen = typeof params.screen === 'string' ? params.screen.trim().toLowerCase() : ''
        const path = SCREEN_ROUTE_MAP[screen]
        if (path) router.push(path)
      }
    },
    [addBudgetExpense, router, setBudgetConfig, setCultureCode, setFlightSearch, state.budgetCurrency, state.flightSearch]
  )

  const parseAndRunNimbusActions = useCallback(
    (text: string) => {
      const re = /\[ACTION:(\w+):(\{[\s\S]*?\})\]/g
      let match: RegExpExecArray | null

      while ((match = re.exec(text)) !== null) {
        try {
          const type = match[1]
          const params = JSON.parse(match[2]) as Record<string, unknown>
          executeNimbusAction(type, params)
        } catch {
          // Ignore malformed action payloads.
        }
      }

      return text.replace(/\[ACTION:\w+:\{[\s\S]*?\}\]\s*/g, '').trim()
    },
    [executeNimbusAction]
  )

  const extractPrefs = useCallback(
    (userMessage: string) => {
      const lower = userMessage.toLowerCase()
      if (/budget|cheap|affordable|backpack/.test(lower)) prefsRef.current.budget = 'budget'
      if (/luxury|splurge|premium|five.star|high.end/.test(lower)) prefsRef.current.budget = 'luxury'
      if (/solo/.test(lower)) prefsRef.current.group = 'solo'
      if (/couple|partner|honeymoon/.test(lower)) prefsRef.current.group = 'couple'
      if (/family|kids|children/.test(lower)) prefsRef.current.group = 'family'
      if (/food|eat|restaurant|cuisine/.test(lower)) prefsRef.current.interests = 'food'
      if (/history|culture|museum|temple/.test(lower)) prefsRef.current.interests = 'culture'
      persistPrefs()
    },
    [persistPrefs]
  )

  const detectBudgetIntent = useCallback(
    (text: string) => {
      const lower = text.toLowerCase()
      const budgetMatch = lower.match(/budget\s+(?:to|is|=|at)?\s*([£$€¥]?)\s*([\d,]+)/i)
      if (!budgetMatch) return

      const amount = Number(budgetMatch[2].replace(/,/g, ''))
      if (!Number.isFinite(amount) || amount <= 0) return

      const currency = budgetMatch[1] || state.budgetCurrency
      setBudgetConfig({ total: amount, currency })
    },
    [setBudgetConfig, state.budgetCurrency]
  )

  const callNimbusApi = useCallback(
    async (history: NimbusHistoryMessage[], userText: string) => {
      const response = await fetch('/api/nimbus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          destination: destinationLabel,
          preferences: prefsRef.current,
        }),
      })

      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        throw new Error(detail || `HTTP ${response.status}`)
      }

      if (!response.body) {
        throw new Error('Empty streaming response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      let buffer = ''

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

          let parsed: { text?: string; error?: string }
          try {
            parsed = JSON.parse(raw) as { text?: string; error?: string }
          } catch {
            // Ignore non-json/partial lines.
            continue
          }

          if (parsed.error) {
            throw new Error(parsed.error)
          }
          if (parsed.text) {
            full += parsed.text
            setStreamingReply(full)
          }
        }
      }

      const clean = parseAndRunNimbusActions(full)
      historyRef.current = [...history, { role: 'assistant', content: clean }]
      pushChatMessage({ role: 'bot', text: clean || 'I am here. Ask me another travel question.' })
      extractPrefs(userText)
    },
    [destinationLabel, extractPrefs, parseAndRunNimbusActions, pushChatMessage]
  )

  function send(rawText?: string) {
    const text = (rawText ?? value).trim()
    if (!text || isTyping) return

    stopPendingAnimation()
    setValue('')
    pushChatMessage({ role: 'user', text })
    detectBudgetIntent(text)

    const nextHistory = [...historyRef.current, { role: 'user' as const, content: text }]
    historyRef.current = nextHistory

    setIsTyping(true)
    setStreamingReply('')

    typingTimeoutRef.current = window.setTimeout(async () => {
      try {
        await callNimbusApi(nextHistory, text)
      } catch (error) {
        console.error('Nimbus chat error:', error)
        pushChatMessage({
          role: 'bot',
          text: 'I seem to have drifted off. Please check GOOGLE_AI_API_KEY and try again.',
        })
      } finally {
        setIsTyping(false)
        setStreamingReply('')
      }
    }, TYPING_DELAY_MS)
  }

  function clearChat() {
    stopPendingAnimation()
    setIsTyping(false)
    setStreamingReply('')
    setValue('')
    historyRef.current = []
    seededHistoryRef.current = false
    clearChatMessages()
  }

  const showQuickReplies = state.chat.length <= 1 && !isTyping && !streamingReply

  return (
    <div className="app">
      <TripSidebar />
      <main className="main">
        <div id="screen-chatbot" className="screen">
          <div className="chat-wrap">
            <div className="chat-head">
              <div className="chat-avatar-bot nimbus-chat-avatar">☁</div>
              <div>
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 14, fontWeight: 700, letterSpacing: '.06em' }}>NIMBUS</div>
                <div style={{ fontSize: 11, color: 'var(--green)' }}>Online · AI Travel Companion</div>
              </div>
              <div className="chat-head-actions">
                <span className="nimbus-dest-pill">{destinationLabel}</span>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => router.push('/app')}>← Back to Globe</button>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={clearChat}>Clear Chat</button>
              </div>
            </div>
            <div className="chat-messages" ref={messagesRef}>
              {state.chat.map((m) => (
                <div key={m.id} className={`chat-msg ${m.role === 'user' ? 'user' : 'bot'}`}>
                  <div className={`chat-ico ${m.role === 'user' ? 'user' : 'bot'}`}>{m.role === 'user' ? 'U' : '☁'}</div>
                  {m.role === 'bot' ? (
                    <div className="bubble" dangerouslySetInnerHTML={{ __html: formatNimbusText(m.text) }} />
                  ) : (
                    <div className="bubble">{m.text}</div>
                  )}
                </div>
              ))}

              {isTyping && !streamingReply && (
                <div className="chat-msg bot">
                  <div className="chat-ico bot">☁</div>
                  <div className="bubble" aria-label="Nimbus is typing">
                    <div className="nimbus-typing" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

              {streamingReply && (
                <div className="chat-msg bot">
                  <div className="chat-ico bot">☁</div>
                  <div className="bubble bubble-stream" dangerouslySetInnerHTML={{ __html: `${formatNimbusText(streamingReply)}<span class=\"nimbus-cursor\">|</span>` }} />
                </div>
              )}
            </div>

            {showQuickReplies && (
              <div className="nimbus-chips">
                {QUICK_REPLIES.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="nimbus-chip"
                    onClick={() => send(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <div className="chat-footer">
              <input
                className="inp"
                value={value}
                placeholder={`Ask Nimbus about ${destinationLabel}...`}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send()
                }}
                disabled={isTyping}
              />
              <button
                className="btn btn-primary"
                onClick={() => send()}
                style={{ flexShrink: 0 }}
                disabled={isTyping || !value.trim()}
              >
                {isTyping ? 'Thinking...' : 'Send ↗'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
