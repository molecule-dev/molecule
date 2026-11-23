<!--
  The stateful view for one conversation: the hover preview and the details
  modal of `ContextUsageIndicator`, plus the session-usage fetch through
  `useContextSessionUsage`. Re-created whole by the keyed wrapper beside this
  file, the way React's `key` remounts its view, so this file owns one
  conversation's transient state and nothing survives a key change.

  Styling uses `getClassMap()` (`cm.*`); inline styles appear exactly where
  React uses them, written as CSS strings for the plain elements and as
  React-shaped camelCase objects for the kit's components (their `reactStyle`
  action converts those). All user-facing text goes through `t()`; each
  derived label reads the locale, so a switch re-renders it the way React's
  whole-component re-render does.
-->

<script lang="ts">
  import { writable } from 'svelte/store'

  import { formatTokenCount } from '@molecule/app-ai-models'
  import { contextCategoryLabel, mergeContextHistory } from '@molecule/app-ide-panel-logic/panels'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Modal, Progress, Tooltip } from '@molecule/app-ui-svelte'

  import { useContextSessionUsage } from '../hooks/useContextSessionUsage.js'
  import ContextSessionUsage from './ContextSessionUsage.svelte'
  import type { ContextUsageIndicatorProps } from './ContextUsageIndicator.svelte'

  let {
    usage,
    history = [],
    compactions = [],
    projectId = undefined,
    conversationId = undefined,
    onOpenSettings = undefined,
  }: ContextUsageIndicatorProps = $props()

  const cm = $derived(getClassMap())
  const { t, locale } = useTranslation()

  // The hover/preview and modal state of this conversation.
  let preview = $state(false)
  let open = $state(false)

  // The session hook takes stores or plain values; these bridges carry the
  // reactive props and the visibility into it the way React's re-render
  // hands the hook its arguments. The stores seed from the props' initial
  // values (React's hook arguments on mount) and the effects keep them
  // current, the way a re-render hands the hook new arguments.
  // svelte-ignore state_referenced_locally
  const project = writable<string | undefined>(projectId)
  // svelte-ignore state_referenced_locally
  const conversation = writable<string | null | undefined>(conversationId)
  const active = writable(false)
  $effect(() => {
    project.set(projectId)
  })
  $effect(() => {
    conversation.set(conversationId)
  })
  $effect(() => {
    active.set(open || preview)
  })

  // While the preview shows, Escape dismisses it from anywhere on the page
  // (the modal's own Escape handling covers the open state).
  $effect(() => {
    if (!preview) return
    const dismiss = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') preview = false
    }
    document.addEventListener('keydown', dismiss)
    return () => document.removeEventListener('keydown', dismiss)
  })

  // Navigation must discard totals and in-flight requests from the old session.
  const { data, loading, failed, refresh } = useContextSessionUsage(project, conversation, active)

  /** The compaction threshold this sample rides on (may be undefined). */
  const target = $derived(usage.backgroundCompactAtTokens ?? usage.compactAtTokens)

  /** The effective limit the ratio reads against (never below one). */
  const limit = $derived(Math.max(1, target ?? usage.contextWindow))

  /** The context ratio, clamped at zero. */
  const ratio = $derived(Math.max(0, usage.inputTokens / limit))

  /** The rounded percentage the ring and the summary show. */
  const percent = $derived(Math.round(ratio * 100))

  /** The semantic color class for the ratio. */
  const color = $derived(ratio < 0.5 ? cm.textSuccess : ratio < 0.9 ? cm.textWarning : cm.textError)

  /** The progress bar's semantic tone for the ratio. */
  const tone = $derived(ratio < 0.5 ? 'success' : ratio < 0.9 ? 'warning' : 'error')

  /** The second ring arc's stroke-dashoffset for the clamped ratio. */
  const dashoffset = $derived(`${16 * Math.PI * (1 - Math.min(ratio, 1))}`)

  /** The trigger's translated title (`Context usage`). */
  const title = $derived.by((): string => {
    void $locale
    return t('ide.chat.context.title', undefined, { defaultValue: 'Context usage' })
  })

  /** The limit's label: the compaction target, or the context window. */
  const targetLabel = $derived.by((): string => {
    void $locale
    return target
      ? t('ide.chat.context.target', undefined, { defaultValue: 'Compaction target' })
      : t('ide.chat.context.window', undefined, { defaultValue: 'Context window' })
  })

  /** The status sentence above the bar. */
  const status = $derived.by((): string => {
    void $locale
    return target != null && ratio >= 1
      ? t('ide.chat.context.atTarget', undefined, { defaultValue: 'At compaction target' })
      : ratio >= 0.9
        ? t('ide.chat.context.nearTarget', undefined, { defaultValue: 'Context nearly full' })
        : t('ide.chat.context.healthy', undefined, { defaultValue: 'Context has room' })
  })

  /** The trigger's aria label: the title, the tokens, the limit and the target. */
  const ariaLabel = $derived.by((): string => {
    void $locale
    const label = t(
      'ide.chat.context.indicator',
      {
        tokens: formatTokenCount(usage.inputTokens),
        limit: formatTokenCount(limit),
        target: targetLabel,
        percent,
      },
      { defaultValue: '{{tokens}} / {{limit}} tokens · {{target}} ({{percent}}%)' },
    )
    return `${title}: ${label}`
  })

  /** The section's padding, from the ClassMap spacing helper's own record. */
  const sectionStyle = $derived(`padding: ${cm.sp({ p: 4 }).paddingTop}`)

  /** The trigger button's style: the gap opens only while the preview shows. */
  const triggerStyle = $derived(`display: inline-flex; gap: ${preview ? '4px' : '0px'}`)

  /** The percentage span's style, from React's reveal widths. */
  const pctStyle = $derived(
    `width: ${preview ? 'auto' : '0px'}; opacity: ${preview ? '1' : '0'}; overflow: hidden; white-space: nowrap; transition: opacity 150ms`,
  )

  /** The merged samples behind the history chart. */
  const samples = $derived(mergeContextHistory(history, [usage]))

  /** The history chart's polyline points and bounds (empty while a lone sample). */
  const chart = $derived.by(
    (): { points: string; maxTokens: number; start: number; end: number } | null => {
      if (samples.length <= 1) return null
      const maxTokens = Math.max(limit, ...samples.map((sample) => sample.inputTokens), 1)
      const start = Date.parse(samples[0]?.at ?? '') || 0
      const end = Date.parse(samples.at(-1)?.at ?? '') || start
      const points = samples
        .map((sample, i) => {
          const x =
            end > start
              ? 8 + 304 * ((Date.parse(sample.at ?? '') - start) / (end - start))
              : 8 + 304 * (i / Math.max(1, samples.length - 1))
          return `${x},${88 - (80 * sample.inputTokens) / maxTokens}`
        })
        .join(' ')
      return { points, maxTokens, start, end }
    },
  )

  /** The composition table's measurable rows, best estimate first. */
  const categories = $derived(
    usage.composition
      ? [...usage.composition.categories]
          .filter((category) => category.bytes > 0 || category.unknownItems > 0)
          .sort((a, b) => (b.estimatedTokens ?? 0) - (a.estimatedTokens ?? 0))
      : [],
  )

  /**
   * Whether a bubbling over/out crossing the element's boundary counts as an
   * enter/leave the way React's synthetic mouseenter/mouseleave do: moving
   * between descendants fires over/out with the pointer still inside
   * (`relatedTarget` within the element), which is no boundary crossing.
   * @param element - The element the handlers sit on.
   * @param event - The bubbling over/out event.
   * @returns True when the pointer crossed the element's boundary.
   */
  function crossedBoundary(element: HTMLElement, event: MouseEvent): boolean {
    return !element.contains(event.relatedTarget as Node)
  }

  /** React's wrapper hover: only a boundary crossing toggles the preview. */
  const onWrapperOver = (event: MouseEvent): void => {
    if (crossedBoundary(event.currentTarget as HTMLElement, event)) preview = true
  }
  const onWrapperOut = (event: MouseEvent): void => {
    if (crossedBoundary(event.currentTarget as HTMLElement, event)) preview = false
  }
  const onWrapperFocusIn = (event: FocusEvent): void => {
    const el = event.target as HTMLElement
    try {
      preview = typeof el.matches === 'function' && el.matches(':focus-visible')
    } catch (_error) {
      // :focus-visible unsupported here — don't show on focus; hover still applies.
    }
  }
  const onContentOver = (event: MouseEvent): void => {
    if (crossedBoundary(event.currentTarget as HTMLElement, event)) preview = true
  }
  const onContentOut = (event: MouseEvent): void => {
    if (crossedBoundary(event.currentTarget as HTMLElement, event)) preview = false
  }

  /** Closes the modal (React's onClose). */
  const closeModal = (): void => {
    open = false
  }

  /** Opens the modal and dismisses the preview (React's onClick). */
  const openModal = (): void => {
    preview = false
    open = true
  }

  /** The Escape keydown on the trigger dismisses the preview at once. */
  const onTriggerKeyDown = (event: KeyboardEvent): void => {
    // Escape is a keyboard event from the focused element, so it belongs on
    // this trigger (the only focusable thing the preview wrapper holds), not
    // on the wrapper div around it.
    if (event.key === 'Escape') preview = false
  }
</script>

{#snippet contextSummary()}
  <div class={cm.flex({ direction: 'col', gap: 'sm' })}>
    <div class={cm.flex({ justify: 'between', align: 'center', gap: 'md' })}>
      <strong>{status}</strong>
      <strong class={color}>{percent}%</strong>
    </div>
    <Progress value={percent} color={tone} size="sm" label={targetLabel} />
    <div class={cm.cn(cm.textMuted, cm.textSize('xs'))}>
      {formatTokenCount(usage.inputTokens)} / {formatTokenCount(limit)}
      {t('ide.chat.context.tokenUnit', undefined, { defaultValue: 'tokens' })}
      <div>
        {t(
          'ide.chat.context.headroom',
          { tokens: formatTokenCount(Math.max(0, limit - usage.inputTokens)) },
          { defaultValue: '{{tokens}} tokens of headroom' },
        )}
      </div>
    </div>
  </div>
{/snippet}

<!-- The wrapper div is React's plain presentation wrapper around the
     trigger (no role, no keyboard role to pair the hover with — the
     trigger inside it is the focusable control). -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  style="margin-left: auto"
  onmouseover={onWrapperOver}
  onmouseout={onWrapperOut}
  onfocusin={onWrapperFocusIn}
  onfocusout={() => (preview = false)}
>
  <Tooltip
    placement="top-end"
    style={{ width: 320, maxWidth: 'calc(100vw - 32px)', whiteSpace: 'normal' }}
  >
    <button
      type="button"
      class={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget)}
      style={triggerStyle}
      data-mol-id="chat-context-usage"
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      aria-expanded={open}
      onclick={openModal}
      onkeydown={onTriggerKeyDown}
    >
      <span class={color} aria-hidden="true" data-ctx-pct style={pctStyle}>{percent}%</span>
      <svg class={color} width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <circle
          cx="9"
          cy="9"
          r="8"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          opacity=".15"
        />
        <circle
          cx="9"
          cy="9"
          r="8"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-dasharray={`${16 * Math.PI}`}
          stroke-dashoffset={dashoffset}
          transform="rotate(-90 9 9)"
          stroke-linecap="round"
        />
      </svg>
    </button>
    {#snippet content()}
      <!-- React's content wrapper is a plain presentation div: keeping the
           preview alive while the pointer is over it, not a focus target. -->
      <!-- svelte-ignore a11y_no_static_element_interactions, a11y_mouse_events_have_key_events -->
      <div
        class={cm.flex({ direction: 'col', gap: 'md' })}
        style="padding: 8px 0px"
        onmouseover={onContentOver}
        onmouseout={onContentOut}
      >
        {@render contextSummary()}
        <div class={cm.borderT} style="padding-top: 12px">
          <ContextSessionUsage data={$data} loading={$loading} failed={$failed} />
        </div>
        <span class={cm.cn(cm.textMuted, cm.textSize('xs'))}>
          {t('ide.chat.context.openDetails', undefined, {
            defaultValue: 'Click for breakdown, history and settings',
          })}
        </span>
      </div>
    {/snippet}
  </Tooltip>
</div>

<Modal {open} onClose={closeModal} {title} size="lg">
  <div class={cm.flex({ direction: 'col', gap: 'lg' })}>
    <section class={cm.card({ variant: 'outline' })} style={sectionStyle}>
      {@render contextSummary()}
      <div class={cm.borderT} style="margin-top: 16px; padding-top: 16px">
        <ContextSessionUsage data={$data} loading={$loading} failed={$failed} />
      </div>
    </section>
    <div class={cm.flex({ gap: 'sm', wrap: 'wrap' })}>
      {#if projectId}
        <button
          type="button"
          data-mol-id="chat-context-refresh"
          class={cm.cn(
            cm.button({ variant: 'outline', color: 'secondary', size: 'sm' }),
            cm.touchTargetCompact,
          )}
          disabled={$loading}
          onclick={() => refresh()}
        >
          {t('ide.chat.context.refresh', undefined, { defaultValue: 'Refresh usage' })}
        </button>
      {/if}
      {#if onOpenSettings}
        <button
          type="button"
          data-mol-id="chat-context-settings"
          class={cm.cn(
            cm.button({ variant: 'outline', color: 'secondary', size: 'sm' }),
            cm.touchTargetCompact,
          )}
          onclick={() => {
            open = false
            onOpenSettings()
          }}
        >
          {t('ide.chat.context.settings', undefined, { defaultValue: 'Chat settings' })}
        </button>
      {/if}
    </div>
    {#if target != null}
      <p class={cm.cn(cm.textMuted, cm.textSize('sm'))}>
        {t('ide.chat.context.targetHelp', undefined, {
          defaultValue:
            'Compaction is scheduled around this target; progress can continue while the summary is prepared.',
        })}
      </p>
    {/if}
    <p class={cm.cn(cm.textMuted, cm.textSize('sm'))}>
      {t(
        'ide.chat.context.windowSize',
        { tokens: formatTokenCount(usage.contextWindow) },
        { defaultValue: 'Model context window: {{tokens}} tokens.' },
      )}
    </p>
    {#if usage.composition}
      <section class={cm.flex({ direction: 'col', gap: 'sm' })}>
        <h3 class={cm.fontWeight('semibold')}>
          {t('ide.chat.context.breakdown', undefined, { defaultValue: 'Request composition' })}
        </h3>
        <p>
          {#if usage.composition.actualInputTokens != null}
            {t(
              'ide.chat.context.actual',
              { tokens: usage.composition.actualInputTokens.toLocaleString() },
              {
                defaultValue:
                  'Provider-reported input: {{tokens}} tokens (including cached input).',
              },
            )}
          {:else}
            {t('ide.chat.context.pending', undefined, {
              defaultValue: 'Provider usage is pending; current token counts are estimates.',
            })}
          {/if}
        </p>
        <p class={cm.textMuted}>
          {t(
            'ide.chat.context.estimate',
            {
              tokens: usage.composition.estimatedTokens.toLocaleString(),
              bytes: usage.composition.totalBytes.toLocaleString(),
              chars: usage.composition.totalChars.toLocaleString(),
            },
            {
              defaultValue:
                'Known text estimate: {{tokens}} tokens. Request: {{chars}} characters / {{bytes}} bytes. Shares describe estimated tokens, not billed allocation.',
            },
          )}
        </p>
        {#if usage.composition.unknownTokenItems > 0 || usage.composition.serializationFailures > 0}
          <p class={cm.textMuted}>
            {t('ide.chat.context.unknown', undefined, {
              defaultValue:
                'Some image, attachment, or unmeasurable content has an unknown token cost and is excluded from estimated shares.',
            })}
          </p>
        {/if}
        <div style="overflow-x: auto">
          <table class={cm.table} style="text-align: left">
            <caption class={cm.srOnly}>
              {t('ide.chat.context.breakdown', undefined, { defaultValue: 'Request composition' })}
            </caption>
            <thead>
              <tr>
                <th class={cm.tableHead}>
                  {t('ide.chat.context.category', undefined, { defaultValue: 'Category' })}
                </th>
                <th class={cm.tableHead}>
                  {t('ide.chat.context.tokens', undefined, { defaultValue: 'Est. tokens' })}
                </th>
                <th class={cm.tableHead}>
                  {t('ide.chat.context.share', undefined, { defaultValue: 'Share' })}
                </th>
                <th class={cm.tableHead}>
                  {t('ide.chat.context.bytes', undefined, { defaultValue: 'Bytes' })}
                </th>
              </tr>
            </thead>
            <tbody>
              {#each categories as category (category.id)}
                <tr class={cm.tableRow}>
                  <th scope="row" class={cm.tableCell}>
                    {contextCategoryLabel(t, category.id)}
                  </th>
                  <td class={cm.tableCell}>
                    {`${category.estimatedTokens?.toLocaleString() ?? '—'}${category.unknownItems > 0 ? ' + ?' : ''}`}
                  </td>
                  <td class={cm.tableCell}>
                    {category.percent == null ? '—' : `${category.percent}%`}
                  </td>
                  <td class={cm.tableCell}>{category.bytes.toLocaleString()}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/if}
    {#if chart}
      <figure style="margin: 16px 0px">
        <figcaption class={cm.fontWeight('semibold')}>
          {t(
            'ide.chat.context.history',
            { count: samples.length },
            { defaultValue: 'Context over time · {{count}} requests' },
          )}
        </figcaption>
        <svg
          viewBox="0 0 320 96"
          role="img"
          aria-label={t('ide.chat.context.chart', undefined, {
            defaultValue: 'Input tokens over time; dashed line marks the current target',
          })}
          style="width: 100%; height: 120px"
        >
          <line
            x1="8"
            x2="312"
            y1={`${88 - (80 * limit) / chart.maxTokens}`}
            y2={`${88 - (80 * limit) / chart.maxTokens}`}
            stroke="currentColor"
            opacity=".4"
            stroke-dasharray="4 4"
          />
          <polyline points={chart.points} fill="none" stroke="currentColor" stroke-width="2" />
        </svg>
        <div class={cm.textMuted} style="display: flex; justify-content: space-between">
          <span>{chart.start ? new Date(chart.start).toLocaleTimeString() : ''}</span>
          <span>
            {formatTokenCount(chart.maxTokens)}
            {t('ide.chat.context.tokenUnit', undefined, { defaultValue: 'tokens' })}
          </span>
          <span>{chart.end ? new Date(chart.end).toLocaleTimeString() : ''}</span>
        </div>
      </figure>
    {/if}
    {#if compactions.length > 0}
      <details data-mol-id="chat-context-compactions">
        <summary>
          {t(
            'ide.chat.context.compactions',
            { count: compactions.length },
            { defaultValue: 'Completed compactions: {{count}}' },
          )}
        </summary>
        <ul>
          {#each compactions as event, index (`${event.at}-${index}`)}
            <li>
              {t(
                'ide.chat.context.compaction',
                {
                  at: new Date(event.at).toLocaleTimeString(),
                  before: event.beforeChars.toLocaleString(),
                  after: event.afterChars.toLocaleString(),
                  seconds: Math.round(event.elapsedMs / 1000),
                },
                { defaultValue: '{{at}} · {{before}} → {{after}} characters · {{seconds}}s' },
              )}
            </li>
          {/each}
        </ul>
      </details>
    {/if}
  </div>
</Modal>
