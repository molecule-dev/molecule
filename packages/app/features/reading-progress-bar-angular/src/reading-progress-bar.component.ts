/**
 * ReadingProgressBar component (React parity).
 *
 * @module
 */

import {
  Component,
  type OnChanges,
  type OnDestroy,
  type OnInit,
  signal,
  type SimpleChanges,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { computeArticleProgress, computeWindowProgress } from './progress.js'
import type { ReadingProgressBarProps } from './types.js'

/**
 * ReadingProgressBar component.
 *
 * Tracks how far the user has scrolled through an article and renders a thin
 * horizontal bar pinned to the top (or bottom) of the viewport, filling
 * left-to-right from 0% to 100% as they read. The host IS the root `<div>`
 * (`div[mol-reading-progress-bar]`), matching React's root exactly: `role`,
 * the aria values, `data-mol-id`, `data-position`, the class and the inline
 * style all live on it.
 *
 * Throttles scroll updates with `requestAnimationFrame` so the work runs at
 * most once per frame — the handler attaches in passive mode. Listens to both
 * `scroll` and `resize` because progress changes when the viewport height
 * changes (e.g. mobile toolbar collapse). The aria label comes from
 * `useTranslation()` (`readingProgressBar.aria.label`), read reactively so a
 * locale switch refreshes it.
 */
@Component({
  selector: 'div[mol-reading-progress-bar]',
  standalone: true,
  inputs: ['containerRef', 'thickness', 'position', 'color', 'className', 'dataMolId'],
  host: {
    role: 'progressbar',
    '[attr.aria-label]': 'label()',
    '[attr.aria-valuenow]': 'pct()',
    '[attr.aria-valuemin]': '0',
    '[attr.aria-valuemax]': '100',
    '[attr.data-mol-id]': 'dataMolId ?? "reading-progress-bar"',
    '[attr.data-position]': 'position ?? "top"',
    '[class]': 'classes()',
    '[style.position]': '"fixed"',
    '[style.left]': '"0px"',
    '[style.right]': '"0px"',
    '[style.top]': 'topOffset()',
    '[style.bottom]': 'bottomOffset()',
    '[style.height]': 'heightPx()',
    '[style.z-index]': '"1000"',
    '[style.pointer-events]': '"none"',
  },
  template: `<div
    data-mol-id="reading-progress-bar-fill"
    [style.width]="widthPct()"
    [style.height]="'100%'"
    [style.background]="fillColor()"
    [style.transition]="'width 80ms linear'"
  ></div>`,
})
export class ReadingProgressBar implements OnInit, OnChanges, OnDestroy {
  /** Optional ref to the article element measured instead of the window. */
  containerRef?: ReadingProgressBarProps['containerRef']
  /** Bar thickness in pixels (React's default is applied at read time). */
  thickness?: number
  /** Where the bar pins (React's default is applied at read time). */
  position?: 'top' | 'bottom'
  /** CSS color for the filled portion of the bar. */
  color?: string
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent / E2E selectors. */
  dataMolId?: string

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the label on a locale switch.
   */
  private readonly i18n = useTranslation()
  /** The measured progress, 0..1. */
  private readonly progress = signal(0)
  /** What undoes the current listeners and frame callback. */
  private dispose?: () => void

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The wrapper class list (React's `cm.cn(className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.className)
  }

  /**
   * The rounded percentage the bar shows (React's
   * `Math.round(progress * 1000) / 10`).
   * @returns The percentage, to one decimal.
   */
  pct(): number {
    return Math.round(this.progress() * 1000) / 10
  }

  /**
   * The accessible label (React's `readingProgressBar.aria.label`).
   * @returns The label text.
   */
  label(): string {
    return this.i18n.t(
      'readingProgressBar.aria.label',
      {},
      {
        defaultValue: 'Reading progress',
      },
    )
  }

  /**
   * The inline `top` of the wrapper: `0px` while pinned to the top.
   * @returns The value, or null when the bar is pinned to the bottom.
   */
  topOffset(): string | null {
    return (this.position ?? 'top') === 'top' ? '0px' : null
  }

  /**
   * The inline `bottom` of the wrapper: `0px` while pinned to the bottom.
   * @returns The value, or null when the bar is pinned to the top.
   */
  bottomOffset(): string | null {
    return this.position === 'bottom' ? '0px' : null
  }

  /**
   * The wrapper's inline height.
   * @returns The height in pixels.
   */
  heightPx(): string {
    return `${this.thickness ?? 3}px`
  }

  /**
   * The fill's inline width.
   * @returns The percentage to one decimal.
   */
  widthPct(): string {
    return `${this.pct()}%`
  }

  /**
   * The fill's inline background (React's `color ?? 'currentColor'`).
   * @returns The CSS color.
   */
  fillColor(): string {
    return this.color ?? 'currentColor'
  }

  /**
   * Attaches the scroll/resize listeners and schedules the first measurement,
   * exactly as React's effect does; the returned function is its cleanup.
   * @returns What undoes this installation.
   */
  install(): () => void {
    const ref = this.containerRef
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
        const el = ref?.current ?? null
        this.progress.set(
          el ? computeArticleProgress(el, window.innerHeight ?? 0) : computeWindowProgress(),
        )
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

  /** Installs the listeners once the inputs are bound, as React's mount effect. */
  ngOnInit(): void {
    this.dispose = this.install()
  }

  /**
   * Re-installs the listeners when the `containerRef` object is replaced, the
   * way React's effect depends on it.
   *
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['containerRef'] || !this.dispose) return
    this.dispose()
    this.dispose = this.install()
  }

  /** Removes the listeners when the component is destroyed. */
  ngOnDestroy(): void {
    this.dispose?.()
    this.dispose = undefined
  }
}
