'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { TripSidebar } from '@/components/app/TripSidebar'
import { type NoteItem, useAppState } from '@/components/app/AppStateProvider'

type MoodTheme = 'cork' | 'dark' | 'blueprint' | 'white'
type MoodLayout = 'freeform' | 'grid'
type PostitColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple'

type MoodTile = {
  id: string
  type: 'photo' | 'postit' | 'text'
  x: number
  y: number
  width: number
  height: number
  z: number
  keyword?: string
  label?: string
  imageUrl?: string
  text?: string
  color?: PostitColor
}

type DragState = {
  id: string
  mode: 'move' | 'resize'
  startX: number
  startY: number
  originX: number
  originY: number
  originWidth: number
  originHeight: number
}

type MoodSuggestion = {
  label: string
  keyword: string
  emoji: string
}

const MB_DEST_KEYWORDS: Record<string, MoodSuggestion[]> = {
  tokyo: [
    { label: 'Tokyo Tower', keyword: 'tokyo tower night skyline', emoji: '🗼' },
    { label: 'Cherry Blossom', keyword: 'cherry blossom tokyo', emoji: '🌸' },
    { label: 'Shibuya Crossing', keyword: 'shibuya crossing at night', emoji: '🚦' },
    { label: 'Ramen Culture', keyword: 'japanese ramen bowl', emoji: '🍜' },
    { label: 'Shrine Detail', keyword: 'shinto shrine architecture', emoji: '⛩️' },
    { label: 'Mount Fuji', keyword: 'mount fuji sunrise', emoji: '🗻' },
  ],
  paris: [
    { label: 'Eiffel Tower', keyword: 'eiffel tower evening lights', emoji: '🗼' },
    { label: 'Louvre', keyword: 'louvre museum architecture', emoji: '🏛️' },
    { label: 'Cafe Streets', keyword: 'paris cafe street corner', emoji: '☕' },
    { label: 'Montmartre', keyword: 'montmartre paris art', emoji: '🎨' },
    { label: 'Seine River', keyword: 'seine river bridge sunset', emoji: '🌊' },
    { label: 'Macarons', keyword: 'french macarons closeup', emoji: '🍬' },
  ],
  dubai: [
    { label: 'Burj Khalifa', keyword: 'burj khalifa skyline', emoji: '🏙️' },
    { label: 'Desert Dunes', keyword: 'dubai desert dunes', emoji: '🏜️' },
    { label: 'Souk Texture', keyword: 'dubai old souk market', emoji: '🧵' },
    { label: 'Modern Marina', keyword: 'dubai marina night', emoji: '🌃' },
    { label: 'Palm Views', keyword: 'palm jumeirah aerial', emoji: '🌴' },
    { label: 'Gold Coffee', keyword: 'arabic coffee table', emoji: '☕' },
  ],
  sydney: [
    { label: 'Opera House', keyword: 'sydney opera house sunset', emoji: '🎭' },
    { label: 'Harbour Bridge', keyword: 'sydney harbour bridge', emoji: '🌉' },
    { label: 'Bondi Beach', keyword: 'bondi beach waves', emoji: '🏄' },
    { label: 'Blue Mountains', keyword: 'blue mountains australia', emoji: '⛰️' },
    { label: 'Laneway Cafe', keyword: 'sydney cafe lane', emoji: '☕' },
    { label: 'Night Lights', keyword: 'sydney city lights', emoji: '✨' },
  ],
  default: [
    { label: 'Architecture', keyword: 'travel architecture details', emoji: '🏛️' },
    { label: 'Street Scene', keyword: 'street photography travel', emoji: '📸' },
    { label: 'Food Story', keyword: 'local cuisine travel', emoji: '🍽️' },
    { label: 'Landscape', keyword: 'scenic landscape travel', emoji: '🌄' },
    { label: 'Culture', keyword: 'cultural landmark travel', emoji: '🎭' },
    { label: 'Golden Hour', keyword: 'travel sunset golden hour', emoji: '🌅' },
  ],
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

function stripHtml(input: string) {
  return decodeHtmlText(
    input
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function extractTitleFromNote(note: NoteItem) {
  const titleMatch = note.content.match(
    /<h[1-6][^>]*class=(?:"|')[^"']*note-page-title[^"']*(?:"|')[^>]*>([\s\S]*?)<\/h[1-6]>/i
  )

  if (titleMatch) {
    const title = stripHtml(titleMatch[1])
    if (title) return title
  }

  return note.title || 'Untitled Note'
}

function extractPreviewFromNote(note: NoteItem) {
  const withoutTitle = note.content.replace(
    /<h[1-6][^>]*class=(?:"|')[^"']*note-page-title[^"']*(?:"|')[^>]*>[\s\S]*?<\/h[1-6]>/i,
    ''
  )
  const preview = stripHtml(withoutTitle)
  return (preview || note.preview || 'No content yet').slice(0, 60)
}

function countWordsFromHtml(html: string) {
  const withoutTitle = html.replace(
    /<h[1-6][^>]*class=(?:"|')[^"']*note-page-title[^"']*(?:"|')[^>]*>[\s\S]*?<\/h[1-6]>/i,
    ''
  )
  const text = stripHtml(withoutTitle)
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeNoteEditorHtml(note: NoteItem) {
  const title = escapeHtml(extractTitleFromNote(note))
  const content = note.content.trim()

  if (!content) {
    return `<h2 class="note-page-title">${title}</h2><p><br></p>`
  }

  if (content.includes('note-page-title')) {
    return content
  }

  const looksLikeHtml = /<\/?[a-z][^>]*>/i.test(content)
  if (looksLikeHtml) {
    return `<h2 class="note-page-title">${title}</h2>${content}`
  }

  const paragraphs = content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('')

  return `<h2 class="note-page-title">${title}</h2>${paragraphs || '<p><br></p>'}`
}

function moodStorageKeyForTrip(tripId: string) {
  return `cloudsource.moodboard.v1.${tripId}`
}

function getDestinationMoodKey(raw: string) {
  const value = raw.toLowerCase()
  if (value.includes('tokyo') || value.includes('japan')) return 'tokyo'
  if (value.includes('paris') || value.includes('france')) return 'paris'
  if (value.includes('dubai') || value.includes('uae')) return 'dubai'
  if (value.includes('sydney') || value.includes('australia')) return 'sydney'
  return 'default'
}

function nextMoodTileZ(tiles: MoodTile[]) {
  return Math.max(10, ...tiles.map((tile) => tile.z || 0)) + 1
}

function randomCanvasPosition(canvas: HTMLDivElement | null, width: number, height: number) {
  const canvasWidth = canvas?.clientWidth ?? 900
  const canvasHeight = canvas?.clientHeight ?? 540
  return {
    x: Math.max(12, Math.min(canvasWidth - width - 12, 20 + Math.random() * Math.max(20, canvasWidth - width - 40))),
    y: Math.max(12, Math.min(canvasHeight - height - 12, 20 + Math.random() * Math.max(20, canvasHeight - height - 40))),
  }
}

function buildUnsplashUrl(width: number, height: number, keyword: string) {
  return `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(keyword)}`
}

export default function NotesPage() {
  const router = useRouter()
  const {
    state,
    activeTrip,
    setNotesTab,
    setSelectedNoteId,
    updateNoteContent,
    createNote,
    deleteNote,
  } = useAppState()

  const selected = state.notes.find((n) => n.id === state.selectedNoteId) ?? state.notes[0]

  const [searchQuery, setSearchQuery] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const saveTimerRef = useRef<number | null>(null)
  const suppressSaveRef = useRef(false)

  const [mbTiles, setMbTiles] = useState<MoodTile[]>([])
  const [mbTheme, setMbTheme] = useState<MoodTheme>('cork')
  const [mbLayout, setMbLayout] = useState<MoodLayout>('freeform')
  const [mbSidebarOpen, setMbSidebarOpen] = useState(true)
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null)
  const [draggingTileId, setDraggingTileId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState | null>(null)

  const moodStorageKey = useMemo(() => moodStorageKeyForTrip(activeTrip.id), [activeTrip.id])

  const noteSummaries = useMemo(
    () =>
      state.notes.map((note) => ({
        id: note.id,
        title: extractTitleFromNote(note),
        preview: extractPreviewFromNote(note),
        date: note.date,
      })),
    [state.notes]
  )

  const selectedSummary = useMemo(
    () => noteSummaries.find((item) => item.id === selected?.id),
    [noteSummaries, selected?.id]
  )

  const visibleNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return noteSummaries

    return noteSummaries.filter((note) => {
      const noteText = `${note.title} ${note.preview}`.toLowerCase()
      return noteText.includes(query)
    })
  }, [noteSummaries, searchQuery])

  const moodSuggestions = useMemo(() => {
    const key = getDestinationMoodKey(
      `${activeTrip.destination.name} ${activeTrip.name} ${activeTrip.meta}`
    )
    return MB_DEST_KEYWORDS[key] ?? MB_DEST_KEYWORDS.default
  }, [activeTrip.destination.name, activeTrip.name, activeTrip.meta])

  const queueEditorSave = useCallback(() => {
    if (!selected?.id || !editorRef.current) return

    const html = editorRef.current.innerHTML
    setWordCount(countWordsFromHtml(html))

    if (suppressSaveRef.current) return

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = window.setTimeout(() => {
      updateNoteContent(selected.id, html)
      saveTimerRef.current = null
    }, 450)
  }, [selected?.id, updateNoteContent])

  const flushEditorSave = useCallback(() => {
    if (!selected?.id || !editorRef.current || suppressSaveRef.current) return

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    const html = editorRef.current.innerHTML
    updateNoteContent(selected.id, html)
    setWordCount(countWordsFromHtml(html))
  }, [selected?.id, updateNoteContent])

  const execEditorCommand = useCallback(
    (command: string, value?: string) => {
      if (!editorRef.current) return

      editorRef.current.focus()
      document.execCommand(command, false, value ?? '')
      queueEditorSave()
    },
    [queueEditorSave]
  )

  const insertSectionDivider = useCallback(() => {
    execEditorCommand('insertHTML', '<hr>')
  }, [execEditorCommand])

  const insertTextBox = useCallback(() => {
    execEditorCommand(
      'insertHTML',
      '<div class="note-textbox">Type your text box content here...</div><p><br></p>'
    )
  }, [execEditorCommand])

  const selectTile = useCallback((tileId: string) => {
    setSelectedTileId(tileId)
    setMbTiles((prev) => {
      const z = nextMoodTileZ(prev)
      return prev.map((tile) => (tile.id === tileId ? { ...tile, z } : tile))
    })
  }, [])

  const createTileId = useCallback(
    () => `mb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    []
  )

  const addPhotoTile = useCallback(
    (keyword?: string, label?: string, fromTile?: MoodTile) => {
      const width = fromTile?.width ?? 200 + Math.floor(Math.random() * 70)
      const height = fromTile?.height ?? 148 + Math.floor(Math.random() * 50)
      const position = fromTile
        ? { x: fromTile.x + 24, y: fromTile.y + 24 }
        : randomCanvasPosition(canvasRef.current, width, height)

      const id = createTileId()
      const resolvedKeyword = keyword || `${activeTrip.destination.name} travel`
      const imageUrl = buildUnsplashUrl(width * 2, height * 2, resolvedKeyword)

      setMbTiles((prev) => [
        ...prev,
        {
          id,
          type: 'photo',
          x: Math.round(position.x),
          y: Math.round(position.y),
          width,
          height,
          z: nextMoodTileZ(prev),
          keyword: resolvedKeyword,
          label,
          imageUrl,
        },
      ])
      setSelectedTileId(id)
    },
    [activeTrip.destination.name, createTileId]
  )

  const addPostitTile = useCallback(
    (color: PostitColor) => {
      const id = createTileId()
      const width = 165
      const height = 160
      const position = randomCanvasPosition(canvasRef.current, width, height)

      setMbTiles((prev) => [
        ...prev,
        {
          id,
          type: 'postit',
          x: Math.round(position.x),
          y: Math.round(position.y),
          width,
          height,
          z: nextMoodTileZ(prev),
          color,
          text: '',
        },
      ])
      setSelectedTileId(id)
    },
    [createTileId]
  )

  const addTextTile = useCallback(() => {
    const id = createTileId()
    const width = 230
    const height = 110
    const position = randomCanvasPosition(canvasRef.current, width, height)

    setMbTiles((prev) => [
      ...prev,
      {
        id,
        type: 'text',
        x: Math.round(position.x),
        y: Math.round(position.y),
        width,
        height,
        z: nextMoodTileZ(prev),
        text: '',
      },
    ])
    setSelectedTileId(id)
  }, [createTileId])

  const deleteTile = useCallback((tileId: string) => {
    setMbTiles((prev) => prev.filter((tile) => tile.id !== tileId))
    setSelectedTileId((prev) => (prev === tileId ? null : prev))
  }, [])

  const updateTileText = useCallback((tileId: string, text: string) => {
    setMbTiles((prev) =>
      prev.map((tile) => (tile.id === tileId ? { ...tile, text } : tile))
    )
  }, [])

  const startTileDrag = useCallback(
    (event: React.MouseEvent, tile: MoodTile, mode: 'move' | 'resize') => {
      event.preventDefault()
      event.stopPropagation()
      selectTile(tile.id)

      dragRef.current = {
        id: tile.id,
        mode,
        startX: event.clientX,
        startY: event.clientY,
        originX: tile.x,
        originY: tile.y,
        originWidth: tile.width,
        originHeight: tile.height,
      }
      setDraggingTileId(tile.id)
    },
    [selectTile]
  )

  const applyGridLayout = useCallback(() => {
    setMbTiles((prev) => {
      if (!prev.length) return prev

      const canvasWidth = canvasRef.current?.clientWidth ?? 920
      const gap = 14
      let cursorX = 20
      let cursorY = 20
      let rowHeight = 0

      const byDepth = [...prev].sort((a, b) => a.z - b.z)
      const nextPos = new Map<string, { x: number; y: number }>()

      byDepth.forEach((tile) => {
        if (cursorX + tile.width > canvasWidth - 20) {
          cursorX = 20
          cursorY += rowHeight + gap
          rowHeight = 0
        }

        nextPos.set(tile.id, { x: cursorX, y: cursorY })
        cursorX += tile.width + gap
        rowHeight = Math.max(rowHeight, tile.height)
      })

      return prev.map((tile) => {
        const pos = nextPos.get(tile.id)
        return pos ? { ...tile, x: pos.x, y: pos.y } : tile
      })
    })
  }, [])

  useEffect(() => {
    const raw = window.localStorage.getItem(moodStorageKey)
    if (!raw) {
      setMbTiles([])
      setMbTheme('cork')
      setMbLayout('freeform')
      setMbSidebarOpen(true)
      setSelectedTileId(null)
      return
    }

    try {
      const parsed = JSON.parse(raw) as {
        tiles?: MoodTile[]
        theme?: MoodTheme
        layout?: MoodLayout
        sidebarOpen?: boolean
      }

      setMbTiles(Array.isArray(parsed.tiles) ? parsed.tiles : [])
      setMbTheme(
        parsed.theme === 'dark' ||
          parsed.theme === 'blueprint' ||
          parsed.theme === 'white' ||
          parsed.theme === 'cork'
          ? parsed.theme
          : 'cork'
      )
      setMbLayout(parsed.layout === 'grid' ? 'grid' : 'freeform')
      setMbSidebarOpen(parsed.sidebarOpen !== false)
      setSelectedTileId(null)
    } catch {
      setMbTiles([])
      setMbTheme('cork')
      setMbLayout('freeform')
      setMbSidebarOpen(true)
      setSelectedTileId(null)
    }
  }, [moodStorageKey])

  useEffect(() => {
    window.localStorage.setItem(
      moodStorageKey,
      JSON.stringify({
        tiles: mbTiles,
        theme: mbTheme,
        layout: mbLayout,
        sidebarOpen: mbSidebarOpen,
      })
    )
  }, [mbLayout, mbSidebarOpen, mbTheme, mbTiles, moodStorageKey])

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const active = dragRef.current
      if (!active) return

      const deltaX = event.clientX - active.startX
      const deltaY = event.clientY - active.startY

      setMbTiles((prev) =>
        prev.map((tile) => {
          if (tile.id !== active.id) return tile

          if (active.mode === 'resize') {
            return {
              ...tile,
              width: Math.max(90, active.originWidth + deltaX),
              height: Math.max(70, active.originHeight + deltaY),
            }
          }

          const canvasWidth = canvasRef.current?.clientWidth ?? 900
          const canvasHeight = canvasRef.current?.clientHeight ?? 540
          const nextX = Math.max(0, Math.min(canvasWidth - tile.width, active.originX + deltaX))
          const nextY = Math.max(0, Math.min(canvasHeight - tile.height, active.originY + deltaY))

          return {
            ...tile,
            x: nextX,
            y: nextY,
          }
        })
      )
    }

    const onMouseUp = () => {
      dragRef.current = null
      setDraggingTileId(null)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  useEffect(() => {
    if (!selected?.id || !editorRef.current || state.notesTab !== 'notes') return

    const nextHtml = normalizeNoteEditorHtml(selected)
    suppressSaveRef.current = true
    editorRef.current.innerHTML = nextHtml
    setWordCount(countWordsFromHtml(nextHtml))

    window.requestAnimationFrame(() => {
      suppressSaveRef.current = false
    })
  }, [selected?.id, state.notesTab])

  useEffect(
    () => () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
    },
    []
  )

  if (!selected) {
    return (
      <div className="app">
        <TripSidebar />
        <main className="main">
          <div id="screen-notes" className="screen">
            <div className="notes-wrap">
              <div className="notes-main" style={{ alignItems: 'center', justifyContent: 'center' }}>
                <h2>No notes available</h2>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <TripSidebar />
      <main className="main">
        <div id="screen-notes" className="screen">
          <div className="notes-wrap">
            <div className="notes-side">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3>Notes</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '4px 9px', fontSize: 12 }}
                    onClick={() => {
                      const id = createNote({
                        title: 'Untitled Note',
                        content: '<h2 class="note-page-title">Untitled Note</h2><p><br></p>',
                      })
                      setSelectedNoteId(id)
                      window.setTimeout(() => {
                        editorRef.current?.focus()
                      }, 70)
                    }}
                  >
                    + New
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '4px 9px', fontSize: 12 }}
                    onClick={() => router.push('/app')}
                  >
                    ← Back to Globe
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
                <button
                  className={state.notesTab === 'notes' ? 'btn btn-primary' : 'btn btn-ghost'}
                  style={{ flex: 1, padding: 6, fontSize: 11 }}
                  onClick={() => setNotesTab('notes')}
                >
                  📝 Notes
                </button>
                <button
                  className={state.notesTab === 'mood' ? 'btn btn-primary' : 'btn btn-ghost'}
                  style={{ flex: 1, padding: 6, fontSize: 11 }}
                  onClick={() => setNotesTab('mood')}
                >
                  🎨 Moodboard
                </button>
              </div>
              <input
                className="inp"
                type="text"
                placeholder="Search..."
                style={{ fontSize: 12, padding: '8px 11px' }}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <div className="notes-list">
                {visibleNotes.map((note) => {
                  const isActive = state.selectedNoteId === note.id
                  return (
                    <div
                      key={note.id}
                      className={`note-row ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedNoteId(note.id)}
                    >
                      <div className="note-title">{note.title}</div>
                      <div className="note-preview">{note.preview}</div>
                      <div className="note-date">{note.date}</div>
                    </div>
                  )
                })}
                {!visibleNotes.length ? (
                  <div
                    style={{
                      padding: '12px 10px',
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      border: '1px dashed var(--border)',
                      borderRadius: 10,
                    }}
                  >
                    No notes match this search.
                  </div>
                ) : null}
              </div>
            </div>

            {state.notesTab === 'notes' ? (
              <div className="notes-main">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }}>
                    Last edited {selected.date} · {wordCount} word{wordCount === 1 ? '' : 's'}
                  </div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => {
                        if (state.notes.length <= 1) {
                          window.alert('Need at least one note.')
                          return
                        }

                        const noteTitle = selectedSummary?.title || selected.title || 'this note'
                        if (!window.confirm(`Delete "${noteTitle}"?`)) return
                        deleteNote(selected.id)
                      }}
                    >
                      🗑 Delete
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => {
                        window.alert('Use Ctrl+P and Save as PDF to export this note.')
                      }}
                    >
                      Export PDF
                    </button>
                  </div>
                </div>

                <div className="note-toolbar">
                  <select
                    className="tb-select"
                    defaultValue="p"
                    title="Text style"
                    onChange={(event) => {
                      execEditorCommand('formatBlock', event.target.value)
                      event.currentTarget.value = 'p'
                    }}
                  >
                    <option value="p">Normal</option>
                    <option value="h1">Heading 1</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                  </select>
                  <div className="tb-sep" />
                  <button className="tb-btn" onClick={() => execEditorCommand('bold')} title="Bold">
                    <b>B</b>
                  </button>
                  <button className="tb-btn" onClick={() => execEditorCommand('italic')} title="Italic">
                    <i>I</i>
                  </button>
                  <button
                    className="tb-btn"
                    onClick={() => execEditorCommand('underline')}
                    title="Underline"
                    style={{ textDecoration: 'underline' }}
                  >
                    U
                  </button>
                  <button
                    className="tb-btn"
                    onClick={() => execEditorCommand('strikeThrough')}
                    title="Strikethrough"
                    style={{ textDecoration: 'line-through' }}
                  >
                    S
                  </button>
                  <div className="tb-sep" />
                  <div className="tb-swatch" style={{ background: '#ffffff' }} onClick={() => execEditorCommand('foreColor', '#ffffff')} title="White" />
                  <div className="tb-swatch" style={{ background: '#ec4899' }} onClick={() => execEditorCommand('foreColor', '#ec4899')} title="Pink" />
                  <div className="tb-swatch" style={{ background: '#60a5fa' }} onClick={() => execEditorCommand('foreColor', '#60a5fa')} title="Blue" />
                  <div className="tb-swatch" style={{ background: '#4ade80' }} onClick={() => execEditorCommand('foreColor', '#4ade80')} title="Green" />
                  <div className="tb-swatch" style={{ background: '#fbbf24' }} onClick={() => execEditorCommand('foreColor', '#fbbf24')} title="Yellow" />
                  <div className="tb-sep" />
                  <div className="tb-swatch" style={{ background: 'rgba(251,191,36,.5)' }} onClick={() => execEditorCommand('hiliteColor', 'rgba(251,191,36,.35)')} title="Highlight yellow" />
                  <div className="tb-swatch" style={{ background: 'rgba(236,72,153,.4)' }} onClick={() => execEditorCommand('hiliteColor', 'rgba(236,72,153,.28)')} title="Highlight pink" />
                  <div className="tb-swatch" style={{ background: 'rgba(59,130,246,.4)' }} onClick={() => execEditorCommand('hiliteColor', 'rgba(59,130,246,.28)')} title="Highlight blue" />
                  <div className="tb-swatch" style={{ background: 'rgba(34,197,94,.4)' }} onClick={() => execEditorCommand('hiliteColor', 'rgba(34,197,94,.28)')} title="Highlight green" />
                  <div
                    className="tb-swatch"
                    style={{
                      background: 'rgba(255,255,255,.08)',
                      border: '1px solid rgba(255,255,255,.2)',
                    }}
                    onClick={() => execEditorCommand('hiliteColor', 'transparent')}
                    title="Clear highlight"
                  >
                    ✕
                  </div>
                  <div className="tb-sep" />
                  <button className="tb-btn" onClick={() => execEditorCommand('justifyLeft')} title="Left">⬅</button>
                  <button className="tb-btn" onClick={() => execEditorCommand('justifyCenter')} title="Center">⬆</button>
                  <button className="tb-btn" onClick={() => execEditorCommand('justifyRight')} title="Right">➡</button>
                  <div className="tb-sep" />
                  <button className="tb-btn" onClick={() => execEditorCommand('insertUnorderedList')} title="Bullet list">• List</button>
                  <button className="tb-btn" onClick={insertSectionDivider} title="Section divider">- Section</button>
                  <button className="tb-btn" onClick={insertTextBox} title="Insert text box">📦 Box</button>
                </div>

                <div
                  ref={editorRef}
                  className="note-editor-rich"
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck
                  onInput={queueEditorSave}
                  onBlur={flushEditorSave}
                  onKeyDown={(event) => {
                    if (event.key === 'Tab') {
                      event.preventDefault()
                      document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;')
                      queueEditorSave()
                    }
                  }}
                />
              </div>
            ) : (
              <div className="notes-main" style={{ overflow: 'hidden' }}>
                <div className="mb-toolbar">
                  <button className="mb-tool-btn" onClick={() => addPhotoTile()} title="Add photo">
                    📷 Photo
                  </button>
                  <button className="mb-tool-btn" onClick={() => addPostitTile('yellow')} title="Add post-it">
                    📌 Post-it
                  </button>
                  <button className="mb-tool-btn" onClick={() => addTextTile()} title="Add text block">
                    Aa Text
                  </button>
                  <div className="tb-sep" />
                  <span
                    style={{
                      fontFamily: 'var(--f-display)',
                      fontSize: 10,
                      letterSpacing: '.08em',
                      color: 'var(--text-muted)',
                    }}
                  >
                    BOARD:
                  </span>
                  <button className={`mb-tool-btn ${mbTheme === 'cork' ? 'active' : ''}`} onClick={() => setMbTheme('cork')}>
                    🪵 Cork
                  </button>
                  <button className={`mb-tool-btn ${mbTheme === 'dark' ? 'active' : ''}`} onClick={() => setMbTheme('dark')}>
                    ✨ Dark
                  </button>
                  <button className={`mb-tool-btn ${mbTheme === 'blueprint' ? 'active' : ''}`} onClick={() => setMbTheme('blueprint')}>
                    📐 Plan
                  </button>
                  <button className={`mb-tool-btn ${mbTheme === 'white' ? 'active' : ''}`} onClick={() => setMbTheme('white')}>
                    ☁️ White
                  </button>
                  <div className="tb-sep" />
                  <button
                    className={`mb-tool-btn ${mbLayout === 'freeform' ? 'active' : ''}`}
                    onClick={() => setMbLayout('freeform')}
                  >
                    ⊞ Freeform
                  </button>
                  <button
                    className={`mb-tool-btn ${mbLayout === 'grid' ? 'active' : ''}`}
                    onClick={() => {
                      setMbLayout('grid')
                      applyGridLayout()
                    }}
                  >
                    ▦ Grid
                  </button>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      className={`mb-tool-btn ${mbSidebarOpen ? 'active' : ''}`}
                      onClick={() => setMbSidebarOpen((prev) => !prev)}
                    >
                      ☁️ Nimbus
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '5px 12px', fontSize: 12 }}
                      onClick={() => {
                        window.alert(
                          'To save your moodboard, take a screenshot.\nWindows: Win + Shift + S\nMac: Cmd + Shift + 4'
                        )
                      }}
                    >
                      Export ↗
                    </button>
                  </div>
                </div>

                <div className="mb-board-area">
                  <div
                    ref={canvasRef}
                    className={`mb-canvas mb-theme-${mbTheme}`}
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget) {
                        setSelectedTileId(null)
                      }
                    }}
                  >
                    {!mbTiles.length ? (
                      <div
                        id="mbEmpty"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                          pointerEvents: 'none',
                          opacity: 0.38,
                        }}
                      >
                        <div style={{ fontSize: 52 }}>🎨</div>
                        <div style={{ fontFamily: 'var(--f-display)', fontSize: 12, letterSpacing: '.12em' }}>
                          BUILD YOUR MOODBOARD
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>
                          Use the toolbar above or add ideas from Nimbus suggestions
                        </div>
                      </div>
                    ) : null}

                    {mbTiles.map((tile) => {
                      const isSelected = tile.id === selectedTileId
                      const isDragging = tile.id === draggingTileId
                      const tileClass = [
                        'mb-tile',
                        tile.type === 'photo'
                          ? 'mb-photo-tile'
                          : tile.type === 'postit'
                            ? `mb-postit-tile mb-postit-${tile.color || 'yellow'}`
                            : 'mb-text-tile',
                        isSelected ? 'mb-selected' : '',
                        isDragging ? 'grabbing' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')

                      return (
                        <div
                          key={tile.id}
                          className={tileClass}
                          style={{
                            left: tile.x,
                            top: tile.y,
                            width: tile.width,
                            height: tile.height,
                            zIndex: tile.z,
                          }}
                          onMouseDown={(event) => {
                            const target = event.target as HTMLElement
                            if (target.closest('.mb-tile-action') || target.closest('.mb-resize')) return
                            if (tile.type === 'photo') {
                              startTileDrag(event, tile, 'move')
                              return
                            }
                            event.stopPropagation()
                            selectTile(tile.id)
                          }}
                        >
                          <div className="mb-tile-bar">
                            <span className="mb-grip" onMouseDown={(event) => startTileDrag(event, tile, 'move')}>
                              ⠿⠿
                            </span>
                            <div className="mb-tile-bar-actions">
                              {tile.type === 'photo' ? (
                                <button
                                  className="mb-tile-action mb-tile-dup"
                                  title="Duplicate"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    addPhotoTile(tile.keyword, tile.label, tile)
                                  }}
                                >
                                  ⧉
                                </button>
                              ) : null}
                              <button
                                className="mb-tile-action mb-tile-del"
                                title="Delete"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  deleteTile(tile.id)
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {tile.type === 'photo' ? (
                            <>
                              <img
                                src={tile.imageUrl}
                                alt={tile.label || 'mood photo'}
                                draggable={false}
                                onError={(event) => {
                                  event.currentTarget.style.display = 'none'
                                }}
                              />
                              {tile.label ? <div className="mb-photo-label">{tile.label}</div> : null}
                              <div
                                className="mb-resize"
                                title="Resize"
                                onMouseDown={(event) => startTileDrag(event, tile, 'resize')}
                              >
                                ⤡
                              </div>
                            </>
                          ) : (
                            <div
                              className="mb-tile-content"
                              contentEditable
                              suppressContentEditableWarning
                              spellCheck
                              dangerouslySetInnerHTML={{ __html: tile.text || '' }}
                              onInput={(event) => {
                                updateTileText(tile.id, event.currentTarget.innerHTML)
                              }}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className={`mb-sidebar ${mbSidebarOpen ? '' : 'collapsed'}`}>
                    <div
                      style={{
                        fontFamily: 'var(--f-display)',
                        fontSize: 10,
                        letterSpacing: '.12em',
                        color: 'var(--text-muted)',
                        marginBottom: 6,
                      }}
                    >
                      ☁️ NIMBUS SUGGESTS
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        marginBottom: 10,
                        lineHeight: 1.5,
                      }}
                    >
                      Ideas for {activeTrip.destination.name}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {moodSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.keyword}
                          className="mb-suggest-card"
                          onClick={() => addPhotoTile(suggestion.keyword, suggestion.label)}
                        >
                          <img
                            className="mb-suggest-thumb"
                            src={buildUnsplashUrl(326, 160, suggestion.keyword)}
                            alt={suggestion.label}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none'
                            }}
                          />
                          <div className="mb-suggest-label">
                            <span>
                              {suggestion.emoji} {suggestion.label}
                            </span>
                            <button
                              className="mb-suggest-add"
                              title="Add to board"
                              onClick={(event) => {
                                event.stopPropagation()
                                addPhotoTile(suggestion.keyword, suggestion.label)
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 14 }}>
                      <div
                        style={{
                          fontFamily: 'var(--f-display)',
                          fontSize: 10,
                          letterSpacing: '.1em',
                          color: 'var(--text-muted)',
                          marginBottom: 7,
                        }}
                      >
                        POST-IT COLORS
                      </div>
                      <div className="mb-color-strip">
                        <div className="mb-color-dot" style={{ background: '#fef08a' }} title="Yellow" onClick={() => addPostitTile('yellow')} />
                        <div className="mb-color-dot" style={{ background: '#fda4af' }} title="Pink" onClick={() => addPostitTile('pink')} />
                        <div className="mb-color-dot" style={{ background: '#93c5fd' }} title="Blue" onClick={() => addPostitTile('blue')} />
                        <div className="mb-color-dot" style={{ background: '#86efac' }} title="Green" onClick={() => addPostitTile('green')} />
                        <div className="mb-color-dot" style={{ background: '#d8b4fe' }} title="Purple" onClick={() => addPostitTile('purple')} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
