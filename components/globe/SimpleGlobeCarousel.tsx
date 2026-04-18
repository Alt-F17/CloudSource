'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import styles from './SimpleGlobeCarousel.module.css'

type OrbitCard = {
  title: string
  subtitle: string
  hint: string
}

type SimpleGlobeCarouselProps = {
  cards?: OrbitCard[]
  autoPlayMs?: number
}

const DEFAULT_CARDS: OrbitCard[] = [
  { title: 'Montreal', subtitle: 'North America', hint: 'Street food + old port sunsets.' },
  { title: 'Lisbon', subtitle: 'Europe', hint: 'Ocean wind, trams, and pastel light.' },
  { title: 'Kyoto', subtitle: 'Asia', hint: 'Temple paths and calm garden mornings.' },
  { title: 'Nairobi', subtitle: 'Africa', hint: 'Savanna horizons and local markets.' },
  { title: 'Sydney', subtitle: 'Oceania', hint: 'Harbor trails and beach evenings.' },
  { title: 'Lima', subtitle: 'South America', hint: 'Clifftop views and vibrant flavors.' },
]

const ORBIT_RADIUS_X = 220
const ORBIT_RADIUS_Y = 118

function wrapIndex(value: number, length: number) {
  return ((value % length) + length) % length
}

function getCardStyle(index: number, activeIndex: number, cardCount: number): CSSProperties {
  const angle = ((index - activeIndex) / cardCount) * Math.PI * 2 - Math.PI / 2
  const x = Math.cos(angle) * ORBIT_RADIUS_X
  const y = Math.sin(angle) * ORBIT_RADIUS_Y
  const depth = (Math.sin(angle) + 1) / 2
  const scale = 0.78 + depth * 0.38
  const opacity = 0.42 + depth * 0.58

  return {
    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale.toFixed(3)})`,
    opacity,
    zIndex: Math.round(10 + depth * 100),
  }
}

export function SimpleGlobeCarousel({
  cards = DEFAULT_CARDS,
  autoPlayMs = 2800,
}: SimpleGlobeCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (cards.length < 2) {
      return
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => wrapIndex(current + 1, cards.length))
    }, autoPlayMs)

    return () => window.clearInterval(interval)
  }, [autoPlayMs, cards.length])

  const activeCard = useMemo(() => cards[activeIndex], [activeIndex, cards])

  const goPrev = () => setActiveIndex((current) => wrapIndex(current - 1, cards.length))
  const goNext = () => setActiveIndex((current) => wrapIndex(current + 1, cards.length))

  return (
    <section className={styles.wrapper} aria-label="Globe with orbiting carousel">
      <div className={styles.scene}>
        <div className={styles.orbit} />
        <div className={styles.orbitSecondary} />

        <div className={styles.globe}>
          <span className={styles.shine} />
        </div>

        {cards.map((card, index) => {
          const style = getCardStyle(index, activeIndex, cards.length)

          return (
            <button
              key={card.title}
              type="button"
              className={`${styles.card} ${index === activeIndex ? styles.activeCard : ''}`}
              style={style}
              onClick={() => setActiveIndex(index)}
              aria-label={`Focus ${card.title}`}
            >
              <p className={styles.cardTitle}>{card.title}</p>
              <p className={styles.cardSubTitle}>{card.subtitle}</p>
            </button>
          )
        })}
      </div>

      <div className={styles.controls}>
        <button type="button" className={styles.controlButton} onClick={goPrev}>
          Previous
        </button>
        <span className={styles.status}>{`Stop ${activeIndex + 1} / ${cards.length}`}</span>
        <button type="button" className={styles.controlButton} onClick={goNext}>
          Next
        </button>
      </div>

      <div className={styles.caption}>
        <p className={styles.captionTitle}>{activeCard.title}</p>
        <p className={styles.captionText}>{activeCard.hint}</p>
      </div>
    </section>
  )
}
