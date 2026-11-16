<!--
  ReadingProgressBar: the Svelte counterpart of
  `@molecule/app-reading-progress-bar-react`'s `ReadingProgressBar` — a thin
  bar pinned to the viewport edge that fills as the reader scrolls through an
  article. Same props, same DOM for the same input; every visible string goes
  through `t()` so a locale switch re-renders it.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { computeArticleProgress, computeWindowProgress } from './progress.js'
  import type { ReadingProgressBarProps } from './types.js'

  let {
    containerRef,
    thickness = 3,
    position = 'top',
    color,
    className,
    dataMolId,
  }: ReadingProgressBarProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let progress = $state(0)

  /**
   * Attaches the scroll/resize listeners and schedules the first measurement,
   * exactly as React's effect does; the returned function is its cleanup.
   *
   * @param ref - The case's container ref, read the way React's effect reads it.
   * @returns What undoes this installation.
   */
  function install(ref: ReadingProgressBarProps['containerRef']): () => void {
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
        progress = el
          ? computeArticleProgress(el, window.innerHeight ?? 0)
          : computeWindowProgress()
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
  $effect(() => install(containerRef))

  /** The rounded percentage the bar shows (React's `Math.round(progress * 1000) / 10`). */
  const pct = $derived(Math.round(progress * 1000) / 10)
  // Translation runs inside a `$derived`: it reads the i18n version under the
  // hood, so this re-runs on a locale switch the way React's render-time `t`
  // call re-runs on a re-render.
  const label = $derived(
    t('readingProgressBar.aria.label', {}, { defaultValue: 'Reading progress' }),
  )
</script>

<div
  role="progressbar"
  aria-label={label}
  aria-valuenow={pct}
  aria-valuemin={0}
  aria-valuemax={100}
  data-mol-id={dataMolId ?? 'reading-progress-bar'}
  data-position={position}
  class={cm.cn(className)}
  style:position="fixed"
  style:left="0px"
  style:right="0px"
  style:top={position === 'bottom' ? undefined : '0px'}
  style:bottom={position === 'bottom' ? '0px' : undefined}
  style:height={`${thickness}px`}
  style:z-index="1000"
  style:pointer-events="none"
>
  <div
    data-mol-id="reading-progress-bar-fill"
    style:width={`${pct}%`}
    style:height="100%"
    style:background={color ?? 'currentColor'}
    style:transition="width 80ms linear"
  ></div>
</div>
