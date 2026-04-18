'use client'

import { useRouter } from 'next/navigation'

import { TripSidebar } from '@/components/app/TripSidebar'
import { useAppState } from '@/components/app/AppStateProvider'

const HOTEL_CARDS = [
  {
    id: 'h1',
    emoji: '🏯',
    name: 'Park Hyatt Tokyo',
    loc: 'Shinjuku, Tokyo',
    amount: 45000,
    currency: '¥',
    stars: '★★★★★',
    badges: ['Recommended', 'Free Cancel'],
    bookingUrl: 'https://www.hyatt.com/en-US/hotel/japan/park-hyatt-tokyo/tyoph',
  },
  {
    id: 'h2',
    emoji: '🗼',
    name: 'Andaz Tokyo Toranomon',
    loc: 'Toranomon, Tokyo',
    amount: 38000,
    currency: '¥',
    stars: '★★★★★',
    badges: ['Pool', 'Breakfast'],
    bookingUrl: 'https://www.hyatt.com/en-US/hotel/japan/andaz-tokyo-toranomon-hills/tyoan',
  },
  {
    id: 'h3',
    emoji: '🌸',
    name: 'Aman Tokyo',
    loc: 'Otemachi, Tokyo',
    amount: 92000,
    currency: '¥',
    stars: '★★★★★',
    badges: ['Luxury', 'Spa'],
    bookingUrl: 'https://www.aman.com/hotels/aman-tokyo',
  },
  {
    id: 'h4',
    emoji: '🏙️',
    name: 'The Prince Gallery',
    loc: 'Kioicho, Tokyo',
    amount: 28000,
    currency: '¥',
    stars: '★★★★☆',
    badges: ['Best Value'],
    bookingUrl: 'https://www.marriott.com/en-us/hotels/tyolc-the-prince-gallery-tokyo-kioicho-a-luxury-collection-hotel/overview/',
  },
  {
    id: 'h5',
    emoji: '⛩️',
    name: 'Hoshinoya Tokyo',
    loc: 'Otemachi, Tokyo',
    amount: 55000,
    currency: '¥',
    stars: '★★★★★',
    badges: ['Ryokan Style'],
    bookingUrl: 'https://hoshinoya.com/tokyo/en/',
  },
  {
    id: 'h6',
    emoji: '🌆',
    name: 'Cerulean Tower Tokyu',
    loc: 'Shibuya, Tokyo',
    amount: 32000,
    currency: '¥',
    stars: '★★★★☆',
    badges: ['City View', 'Gym'],
    bookingUrl: 'https://www.ceruleantower-hotel.com/en/',
  },
]

export default function HotelsPage() {
  const router = useRouter()
  const { activeTrip, openBudgetExpenseModal } = useAppState()

  return (
    <div className="app">
      <TripSidebar />
      <main className="main">
        <div id="screen-hotels" className="screen">
          <div className="hotels-wrap">
            <div className="ph">
              <div className="ph-icon">🏨</div>
              <div>
                <h1>Hotels</h1>
                <div className="ph-sub">Find your perfect stay</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <button className="btn btn-ghost" onClick={() => router.push('/app')}>
                  ← Back to Globe
                </button>
              </div>
            </div>

            <div className="search-bar" style={{ gridTemplateColumns: '1fr 160px 160px auto' }}>
              <div className="fg">
                <label>Destination</label>
                <input className="inp" defaultValue={`${activeTrip.destination.name}, Japan`} />
              </div>
              <div className="fg">
                <label>Check-in</label>
                <input className="inp" type="date" defaultValue="2026-05-15" />
              </div>
              <div className="fg">
                <label>Check-out</label>
                <input className="inp" type="date" defaultValue="2026-05-22" />
              </div>
              <button className="btn btn-primary" style={{ alignSelf: 'flex-end', height: 42 }}>
                Search
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: 12, color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--text)', fontSize: 15 }}>48 hotels</span> in {activeTrip.destination.name} · May 15-22
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>⭐ Rating</button>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>💰 Price</button>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>🗺️ Map</button>
              </div>
            </div>

            <div className="hotels-grid">
              {HOTEL_CARDS.map((hotel) => (
                <div key={hotel.id} className="hotel-card">
                  <div className="hotel-thumb">{hotel.emoji}</div>
                  <div className="hotel-body">
                    <div className="hotel-name">{hotel.name}</div>
                    <div className="hotel-loc">📍 {hotel.loc}</div>
                    <div className="hotel-foot">
                      <div className="hotel-price">
                        {hotel.currency}{hotel.amount.toLocaleString()} <span>/ night</span>
                      </div>
                      <div className="stars">{hotel.stars}</div>
                    </div>
                    <div style={{ marginTop: 9, display: 'flex', gap: 5 }}>
                      {hotel.badges.map((badge) => (
                        <span key={badge} className={badge === 'Recommended' || badge === 'Luxury' ? 'badge badge-pink' : badge === 'Best Value' || badge === 'Breakfast' ? 'badge badge-green' : 'badge badge-blue'}>
                          {badge}
                        </span>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: 12, flex: 1 }}
                        onClick={() => window.open(hotel.bookingUrl, '_blank', 'noopener,noreferrer')}
                      >
                        Book
                      </button>
                      <button
                        className="track-btn"
                        onClick={() =>
                          openBudgetExpenseModal({
                            label: hotel.name,
                            amount: hotel.amount,
                            currency: hotel.currency,
                            category: 'hotels',
                          })
                        }
                      >
                        + Budget
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
