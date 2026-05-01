import type { CSSProperties, RefObject } from 'react'
import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Computes the scroll progress (0..1) of an element, measured by how much of
 * the element has scrolled past the top of the viewport.
 *
 * Specifically:
 * - Returns `0` when the element's top is at or below the viewport top.
 * - Returns `1` when the element's bottom is at or above the viewport top
 *   plus the viewport height (i.e. the element has been fully read).
 * - Linearly interpolates between those endpoints in the middle.
 *
 * The same formula works whether the user reads inside `window` (no
 * `containerRef`) or scrolls a fixed element — the bounding rect already
 * accounts for the layout.
 *
 * @param el - The article element whose read-through progress we want.
 * @param viewportHeight - The viewport height to use as the denominator.
 * @returns A number in `[0, 1]`.
 */
export function computeArticleProgress(el: Element, viewportHeight: number): number {
  const rect = el.getBoundingClientRect()
  const total = rect.height - viewportHeight
  if (total <= 0) {
    // Article fits in the viewport — treat as fully read once its top hits the
    // top of the viewport.
    return rect.top <= 0 ? 1 : 0
  }
  const scrolled = -rect.top
  if (scrolled <= 0) return 0
  if (scrolled >= total) return 1
  return scrolled / total
}

/**
 * Computes window scroll progress (0..1) using `scrollY` and the document's
 * total scrollable height.
 *
 * @returns A number in `[0, 1]`. Falls back to `0` when there is nothing to
 *   scroll (page shorter than the viewport).
 */
export function computeWindowProgress(): number {
  const doc = document.documentElement
  const scrollTop = window.scrollY ?? doc.scrollTop ?? 0
  const total = (doc.scrollHeight ?? 0) - (window.innerHeight ?? 0)
  if (total <= 0) return 0
  if (scrollTop <= 0) return 0
  if (scrollTop >= total) return 1
  return scrollTop / total
}

/**
 *
 */
export interface ReadingProgressBarProps {
  /**
   * Optional ref to the article element. When provided, progress is
   * measured against that element's bounding rect (so the bar fills as the
   * user scrolls through the article body, not the whole page). When
   * omitted, progress falls back to `window` scroll position.
   */
  containerRef?: RefObject<Element | null>
  /** Bar thickness in pixels. Defaults to `3`. */
  thickness?: number
  /**
   * Where the bar pins. Defaults to `'top'`. Both variants render fixed
   * across the full viewport width with a high z-index.
   */
  position?: 'top' | 'bottom'
  /**
   * CSS color for the filled portion of the bar. Defaults to
   * `'currentColor'` so the bar inherits whatever text color is in scope —
   * letting the surrounding theme drive it. Pass an explicit color
   * (`'#3b82f6'`, `'var(--brand)'`, etc.) to override.
   */
  color?: string
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent / E2E selectors. */
  dataMolId?: string
}

/**
 * Top-of-page reading progress bar.
 *
 * Tracks how far the user has scrolled through an article and renders a
 * thin horizontal bar pinned to the top (or bottom) of the viewport,
 * filling left-to-right from 0% to 100% as they read.
 *
 * Throttles scroll updates with `requestAnimationFrame` so the work runs
 * at most once per frame — handler attaches in passive mode.
 *
 * Listens to both `scroll` and `resize` because progress changes when the
 * viewport height changes (e.g. mobile toolbar collapse).
 *
 * No `containerRef` → measures `window`. With `containerRef` → measures
 * the element so the bar reflects progress through that specific article
 * even when the page has additional scrollable content above/below.
 * @param root0
 * @param root0.containerRef
 * @param root0.thickness
 * @param root0.position
 * @param root0.color
 * @param root0.className
 * @param root0.dataMolId
 */
export function ReadingProgressBar({
  containerRef,
  thickness = 3,
  position = 'top',
  color,
  className,
  dataMolId,
}: ReadingProgressBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [progress, setProgress] = useState<number>(0)

  useEffect(() => {
    let rafId = 0
    let pending = false
    let cancelled = false

    /**
     * Recompute progress on the next animation frame. Coalesces bursts of
     * scroll events into a single state update — uses a separate `pending`
     * flag (rather than checking `rafId`) so the guard works correctly
     * even when the rAF callback runs synchronously (e.g. under tests).
     */
    function schedule() {
      if (pending) return
      pending = true
      rafId = requestAnimationFrame(() => {
        pending = false
        rafId = 0
        if (cancelled) return
        const el = containerRef?.current ?? null
        const next = el
          ? computeArticleProgress(el, window.innerHeight ?? 0)
          : computeWindowProgress()
        setProgress(next)
      })
    }

    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })

    return () => {
      cancelled = true
      if (rafId !== 0) cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [containerRef])

  const pct = Math.round(progress * 1000) / 10

  const wrapperStyle: CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    [position]: 0,
    height: thickness,
    zIndex: 1000,
    pointerEvents: 'none',
  }

  const fillStyle: CSSProperties = {
    width: `${pct}%`,
    height: '100%',
    background: color ?? 'currentColor',
    transition: 'width 80ms linear',
  }

  return (
    <div
      role="progressbar"
      aria-label={t('readingProgressBar.aria.label', {}, { defaultValue: 'Reading progress' })}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      data-mol-id={dataMolId ?? 'reading-progress-bar'}
      data-position={position}
      className={cm.cn(className)}
      style={wrapperStyle}
    >
      <div data-mol-id="reading-progress-bar-fill" style={fillStyle} />
    </div>
  )
}
