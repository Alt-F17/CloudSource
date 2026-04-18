'use client'

import { useRouter } from 'next/navigation'

import { TripSidebar } from '@/components/app/TripSidebar'
import { useAppState } from '@/components/app/AppStateProvider'
import { CULTURE_DATA, type CultureCode } from '@/lib/culture-data'

const DESTS: CultureCode[] = ['jp', 'fr', 'ae', 'th', 'it', 'au']

export default function AboutPage() {
  const router = useRouter()
  const { state, setCultureCode } = useAppState()
  const destination = CULTURE_DATA[state.cultureCode]

  return (
    <div className="app">
      <TripSidebar />
      <main className="main">
        <div id="screen-about" className="screen">
          <div className="about-wrap">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
              <h1
                style={{
                  fontFamily: 'var(--f-display)',
                  fontSize: 22,
                  margin: 0,
                  background: 'linear-gradient(135deg,var(--pink),var(--blue-soft))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                CULTURE GUIDE
              </h1>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DESTS.map((code) => {
                  const d = CULTURE_DATA[code]
                  const active = code === state.cultureCode
                  return (
                    <button
                      key={code}
                      className={active ? 'btn btn-primary' : 'btn btn-ghost'}
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => setCultureCode(code)}
                    >
                      {d.flag} {d.name}
                    </button>
                  )
                })}
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => router.push('/app')}>
                  ← Back to Globe
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg,var(--pink),var(--blue))', display: 'grid', placeItems: 'center' }}>
                ☁️
              </div>
              <div
                style={{
                  background: 'rgba(5,5,18,.55)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,.1)',
                  borderRadius: 14,
                  padding: '14px 16px',
                  flex: 1,
                }}
              >
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 11, color: 'var(--pink-soft)', marginBottom: 6 }}>NIMBUS SAYS</div>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{destination.intro}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, width: '100%' }}>
              {destination.cards.map((card) => (
                <div
                  key={card.title}
                  style={{
                    background: 'rgba(5,5,18,.52)',
                    backdropFilter: 'blur(18px)',
                    border: '1px solid rgba(255,255,255,.1)',
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 22 }}>{card.icon}</span>
                    <span
                      style={{
                        fontFamily: 'var(--f-display)',
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '.06em',
                        color: card.color === 'pink' ? 'var(--pink-soft)' : 'var(--blue-soft)',
                      }}
                    >
                      {card.title}
                    </span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {card.items.map((item) => (
                      <li key={item} style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
