<!--
  The consistent session-and-allowance rows for the context tooltip and
  modal: what the current conversation spent (prompt and output tokens, a
  live mark while the turn streams) and what remains of the project owner's
  AI allowance (the percent, its window, and when it resets).

  Svelte counterpart of `@molecule/app-ide-react`'s `ContextSessionUsage` (see
  the React file for the design notes): the same props (React names), the same
  DOM for the same input. Presentational — the totals arrive whole as props;
  the load-on-hover fetch is the `useContextSessionUsage` hook in `src/hooks`.

  Styling uses `getClassMap()` (`cm.*`); the component adds no inline styles.
  All user-facing text goes through `t()`.
-->

<script lang="ts">
  import { formatTokenTotal, totalPromptTokens } from '@molecule/app-ide-panel-logic/panels'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  // The props and usage types live once, in the hook that loads the usage
  // (the counterpart of React's single file holding the hook and the
  // component together), and are exported by the package through
  // `src/hooks`.
  import type { ContextSessionUsageProps } from '../hooks/useContextSessionUsage.js'

  let { data, loading, failed }: ContextSessionUsageProps = $props()

  const { t, locale } = useTranslation()
  const cm = $derived(getClassMap())

  // React computes these once per render from the props; Svelte derives them
  // so the same values stay current across prop changes. Each translated
  // label also reads the locale, so a locale switch re-renders it the way
  // React's whole-component re-render does.
  const available = $derived(data !== null && !failed)

  /** The clamped remaining-allowance percent (`null` when it cannot be one). */
  const remaining = $derived.by((): number | null => {
    const percent = data?.allowancePercent
    return typeof percent === 'number' && Number.isFinite(percent)
      ? Math.max(0, Math.min(100, 100 - percent))
      : null
  })

  /** The row's left label (`Current session`). */
  const sessionLabel = $derived.by((): string => {
    void $locale
    return t('ide.chat.context.session', undefined, { defaultValue: 'Current session' })
  })

  /** The right-hand session total (or the loading / unavailable fallback). */
  const sessionTotal = $derived.by((): string => {
    void $locale
    if (data !== null && !failed) {
      return t(
        'ide.chat.context.sessionTotal',
        { tokens: formatTokenTotal(totalPromptTokens(data) + data.outputTokens) },
        { defaultValue: '{{tokens}} tokens' },
      )
    }
    return loading
      ? t('ide.chat.context.loading', undefined, { defaultValue: 'Loading…' })
      : t('ide.chat.context.unavailable', undefined, { defaultValue: 'Unavailable' })
  })

  /** The session line's muted detail, with the live mark while streaming. */
  const sessionDetail = $derived.by((): string => {
    void $locale
    if (data === null || failed) return ''
    const detail = t(
      'ide.chat.context.sessionDetail',
      {
        input: formatTokenTotal(totalPromptTokens(data)),
        output: formatTokenTotal(data.outputTokens),
      },
      { defaultValue: '{{input}} input (incl. cache) · {{output}} output' },
    )
    return data.streaming
      ? `${detail} · ${t('ide.chat.context.live', undefined, { defaultValue: 'Live' })}`
      : detail
  })

  /** The row's left label (`Overall AI allowance`). */
  const allowanceLabel = $derived.by((): string => {
    void $locale
    return t('ide.chat.context.allowance', undefined, { defaultValue: 'Overall AI allowance' })
  })

  /** The right-hand allowance figure (or the loading / unavailable fallback). */
  const allowanceValue = $derived.by((): string => {
    void $locale
    const rest = remaining
    const percent = data?.allowancePercent
    if (!available) {
      return loading
        ? t('ide.chat.context.loading', undefined, { defaultValue: 'Loading…' })
        : t('ide.chat.context.unavailable', undefined, { defaultValue: 'Unavailable' })
    }
    if (rest !== null) {
      return t(
        'ide.chat.context.remainingPercent',
        { percent: rest },
        { defaultValue: '~{{percent}}% remaining' },
      )
    }
    return percent === null
      ? t('ide.chat.context.unmetered', undefined, { defaultValue: 'Unmetered' })
      : t('ide.chat.context.unavailable', undefined, { defaultValue: 'Unavailable' })
  })

  /**
   * The allowance row's muted line: the error, the shared-across-projects
   * note, the window, and the reset moment — the segments React renders (the
   * falsy ones as nothing), joined the way the DOM draws them.
   */
  const allowanceNote = $derived.by((): string => {
    void $locale
    let note = ''
    if (failed) {
      note += t('ide.chat.context.usageError', undefined, {
        defaultValue: 'Usage could not be refreshed. Open details to retry.',
      })
    } else if (available) {
      note += t('ide.chat.context.ownerAllowance', undefined, {
        defaultValue: 'Shared across the project owner’s projects.',
      })
    }
    if (available && data?.allowanceWindow) {
      note += ' '
      note +=
        data.allowanceWindow === 'billing-period'
          ? t('ide.chat.context.monthly', undefined, { defaultValue: 'Monthly allowance.' })
          : t('ide.chat.context.daily', undefined, { defaultValue: 'Daily allowance.' })
    }
    if (
      available &&
      remaining !== null &&
      typeof data?.allowanceResetAt === 'number' &&
      Number.isFinite(data.allowanceResetAt)
    ) {
      note += ' '
      note += t(
        'ide.chat.context.resets',
        {
          at: new Date(data.allowanceResetAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
        { defaultValue: 'Resets {{at}}.' },
      )
    }
    return note
  })

  /** Whether the remaining figure is low enough to turn red. */
  const remainingLow = $derived(available && remaining !== null && remaining <= 10)
</script>

<div class={cm.flex({ direction: 'col', gap: 'sm' })} aria-live="polite">
  <div>
    <div class={cm.flex({ justify: 'between', gap: 'md', align: 'baseline' })}>
      <span>{sessionLabel}</span>
      <strong>{sessionTotal}</strong>
    </div>
    {#if available}
      <div class={cm.cn(cm.textMuted, cm.textSize('xs'))}>{sessionDetail}</div>
    {/if}
  </div>
  <div>
    <div class={cm.flex({ justify: 'between', gap: 'md', align: 'baseline' })}>
      <span>{allowanceLabel}</span>
      <strong class={remainingLow ? cm.textError : undefined}>{allowanceValue}</strong>
    </div>
    <div class={cm.cn(cm.textMuted, cm.textSize('xs'))}>{allowanceNote}</div>
  </div>
</div>
