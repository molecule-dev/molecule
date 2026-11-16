/**
 * Vue top-of-page reading progress bar.
 *
 * Vue counterpart of `@molecule/app-reading-progress-bar-react`'s
 * `ReadingProgressBar` — the same props (React names), the same ClassMap
 * tokens, the same i18n key, and the same DOM for the same input.
 *
 * @module
 */

import {
  computed,
  defineComponent,
  h,
  onUnmounted,
  type PropType,
  ref,
  type VNode,
  watch,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { computeArticleProgress, computeWindowProgress } from './progress.js'
import type { ReadingProgressBarProps } from './types.js'

/** A probed container ref, in either React's or Vue's shape. */
type ContainerRef = { readonly current?: Element | null; readonly value?: Element | null }

/**
 * The element a `containerRef` currently points at.
 *
 * @param ref - The ref, in React's `{ current }` or Vue's `{ value }` shape.
 * @returns The element, or null when there is none.
 */
const elementOf = (ref: ContainerRef | undefined): Element | null =>
  ref?.current ?? ref?.value ?? null

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
 * @param props - Component props (see {@link ReadingProgressBarProps}).
 * @returns The reading progress bar component.
 */
export const ReadingProgressBar = defineComponent({
  name: 'ReadingProgressBar',
  props: {
    containerRef: {
      type: Object as PropType<NonNullable<ReadingProgressBarProps['containerRef']>>,
      default: undefined,
    },
    thickness: {
      type: Number,
      default: 3,
    },
    position: {
      type: String as PropType<'top' | 'bottom'>,
      default: 'top',
    },
    color: String,
    className: String,
    dataMolId: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const progress = ref(0)

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
          const el = elementOf(props.containerRef)
          const next = el
            ? computeArticleProgress(el, window.innerHeight ?? 0)
            : computeWindowProgress()
          progress.value = next
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

    let uninstall = install()

    // React's effect depends on `containerRef`: a new ref object tears the
    // listeners down and installs a fresh measurement over the new element.
    watch(
      () => props.containerRef,
      () => {
        uninstall()
        uninstall = install()
      },
      { flush: 'post' },
    )

    onUnmounted(() => uninstall())

    /**
     * The rounded percentage the bar shows (React's
     * `Math.round(progress * 1000) / 10`).
     *
     * @returns The percentage, to one decimal.
     */
    const pct = computed((): number => Math.round(progress.value * 1000) / 10)

    /**
     * The fixed wrapper's inline style, matching React's style object.
     *
     * @returns Style properties, keyed the way Vue's style patcher expects.
     */
    const wrapperStyle = (): Record<string, string> => {
      const style: Record<string, string> = {
        position: 'fixed',
        left: '0px',
        right: '0px',
        height: `${props.thickness}px`,
        zIndex: '1000',
        pointerEvents: 'none',
      }
      if (props.position === 'bottom') style.bottom = '0px'
      else style.top = '0px'
      return style
    }

    /**
     * The fill's inline style, matching React's style object.
     *
     * @returns Style properties, keyed the way Vue's style patcher expects.
     */
    const fillStyle = (): Record<string, string> => ({
      width: `${pct.value}%`,
      height: '100%',
      background: props.color ?? 'currentColor',
      transition: 'width 80ms linear',
    })

    return (): VNode =>
      h(
        'div',
        {
          role: 'progressbar',
          'aria-label': t(
            'readingProgressBar.aria.label',
            {},
            {
              defaultValue: 'Reading progress',
            },
          ),
          'aria-valuenow': pct.value,
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          'data-mol-id': props.dataMolId ?? 'reading-progress-bar',
          'data-position': props.position,
          class: cm.cn(props.className),
          style: wrapperStyle(),
        },
        [
          h('div', {
            'data-mol-id': 'reading-progress-bar-fill',
            style: fillStyle(),
          }),
        ],
      )
  },
})
