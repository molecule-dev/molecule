import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

interface CarouselProps {
  /** Slides — each child is one frame. */
  children: ReactNode[]
  /** Controlled active index — caller owns state. */
  index?: number
  /** Called when the active index changes. */
  onChange?: (index: number) => void
  /** Show prev/next arrows. Defaults to true. */
  showArrows?: boolean
  /** Show dot indicator strip. Defaults to true. */
  showDots?: boolean
  /** Auto-advance interval in ms (set 0 to disable). */
  autoplayMs?: number
  /** Pause autoplay on mouseover. Defaults to true. */
  pauseOnHover?: boolean
  /** Loop back to start at end. Defaults to true. */
  loop?: boolean
  /** Extra classes. */
  className?: string
}

/**
 * Generic image / card carousel with arrows + dots + optional autoplay.
 * Controlled-optional: omit `index` to let the component manage its own
 * state.
 * @param root0
 * @param root0.children
 * @param root0.index
 * @param root0.onChange
 * @param root0.showArrows
 * @param root0.showDots
 * @param root0.autoplayMs
 * @param root0.pauseOnHover
 * @param root0.loop
 * @param root0.className
 */
export function Carousel({
  children,
  index,
  onChange,
  showArrows = true,
  showDots = true,
  autoplayMs = 0,
  pauseOnHover = true,
  loop = true,
  className,
}: CarouselProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const total = children.length
  const [internal, setInternal] = useState(0)
  const active = index ?? internal
  const [hovered, setHovered] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const setIdx = useCallback(
    (next: number) => {
      const clamped = loop ? (next + total) % total : Math.max(0, Math.min(total - 1, next))
      if (index === undefined) setInternal(clamped)
      onChange?.(clamped)
    },
    [index, onChange, total, loop],
  )

  useEffect(() => {
    if (!autoplayMs || (pauseOnHover && hovered)) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }
    timerRef.current = setInterval(() => setIdx(active + 1), autoplayMs)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [autoplayMs, hovered, pauseOnHover, active, setIdx])

  if (total === 0) return null

  return (
    <div
      className={cm.cn(cm.position('relative'), className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            width: `${total * 100}%`,
            transform: `translateX(-${(active / total) * 100}%)`,
            transition: 'transform 250ms ease',
          }}
        >
          {children.map((c, i) => (
            <div
              key={i}
              style={{ width: `${100 / total}%`, flexShrink: 0 }}
              aria-hidden={i !== active}
            >
              {c}
            </div>
          ))}
        </div>
      </div>
      {showArrows && total > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIdx(active - 1)}
            aria-label={t('carousel.previous', {}, { defaultValue: 'Previous' })}
            className={cm.position('absolute')}
          >
            ‹
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIdx(active + 1)}
            aria-label={t('carousel.next', {}, { defaultValue: 'Next' })}
            className={cm.position('absolute')}
          >
            ›
          </Button>
        </>
      )}
      {showDots && total > 1 && (
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.sp('py', 2),
          )}
        >
          {children.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === active ? 'true' : undefined}
              onClick={() => setIdx(i)}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                border: 'none',
                background: i === active ? 'currentColor' : 'rgba(0,0,0,0.2)',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
