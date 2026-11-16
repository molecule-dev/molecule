import type { Component } from 'solid-js'
import { createEffect, createSignal, on, onCleanup } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { computeArticleProgress, computeWindowProgress } from './progress.js'
import type { ReadingProgressBarProps } from './types.js'

/**
 * Top-of-page reading progress bar.
 *
 * Tracks how far the user has scrolled through an article and renders a thin
 * horizontal bar pinned to the top (or bottom) of the viewport, filling
 * left-to-right from 0% to 100% as they read.
 *
 * Throttles scroll updates with `requestAnimationFrame` so the work runs at
 * most once per frame — the handler attaches in passive mode. Listens to both
 * `scroll` and `resize` because progress changes when the viewport height
 * changes (e.g. mobile toolbar collapse).
 *
 * This is the Solid counterpart of `@molecule/app-reading-progress-bar-react`:
 * the same props (React names), the same ClassMap tokens, the same i18n key,
 * and the same DOM for the same input.
 *
 * @param props - Component props (see {@link ReadingProgressBarProps}).
 * @returns The rendered reading progress bar.
 */
export const ReadingProgressBar: Component<ReadingProgressBarProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [progress, setProgress] = createSignal(0)

  /**
   * Attaches the scroll/resize listeners and schedules the first measurement,
   * exactly as React's effect does; the returned function is its cleanup.
   *
   * @returns What undoes this installation.
   */
  const install = (): (() => void) => {
    let rafId = 0
    let pending = false
    let cancelled = false

    /**
     * Recomputes progress on the next animation frame. Coalesces bursts of
     * scroll events into a single state update.
     */
    const schedule = (): void => {
      if (pending) return
      pending = true
      rafId = requestAnimationFrame(() => {
        pending = false
        rafId = 0
        if (cancelled) return
        const el = props.containerRef?.current ?? null
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
  }

  // React's effect depends on `containerRef`: a new ref object tears the
  // listeners down and installs a fresh measurement over the new element.
  createEffect(
    on(
      () => props.containerRef,
      () => onCleanup(install()),
    ),
  )

  /**
   * The rounded percentage the bar shows (React's
   * `Math.round(progress * 1000) / 10`).
   *
   * @returns The percentage, to one decimal.
   */
  const pct = (): number => Math.round(progress() * 1000) / 10

  /**
   * The fixed wrapper's inline style, matching React's style object.
   *
   * @returns Style properties, in kebab case as the DOM expects.
   */
  const wrapperStyle = (): Record<string, string> => {
    const style: Record<string, string> = {
      position: 'fixed',
      left: '0px',
      right: '0px',
      height: `${props.thickness ?? 3}px`,
      'z-index': '1000',
      'pointer-events': 'none',
    }
    if ((props.position ?? 'top') === 'bottom') style.bottom = '0px'
    else style.top = '0px'
    return style
  }

  /**
   * The fill's inline style, matching React's style object.
   *
   * @returns Style properties, in kebab case as the DOM expects.
   */
  const fillStyle = (): Record<string, string> => ({
    width: `${pct()}%`,
    height: '100%',
    background: props.color ?? 'currentColor',
    transition: 'width 80ms linear',
  })

  return (
    <div
      role="progressbar"
      aria-label={t('readingProgressBar.aria.label', {}, { defaultValue: 'Reading progress' })}
      aria-valuenow={pct()}
      aria-valuemin={0}
      aria-valuemax={100}
      data-mol-id={props.dataMolId ?? 'reading-progress-bar'}
      data-position={props.position ?? 'top'}
      class={cm.cn(props.className)}
      style={wrapperStyle()}
    >
      <div data-mol-id="reading-progress-bar-fill" style={fillStyle()} />
    </div>
  )
}
