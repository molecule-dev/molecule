/**
 * A colored context ring with progressive context, session and allowance
 * details — the Solid counterpart of `@molecule/app-ide-react`'s
 * `ContextUsageIndicator` (see that file for the design notes): the same props
 * (React names), the same DOM for the same input, the same callbacks and
 * service calls. The collapsed trigger is a ring whose arc fills with the
 * context ratio and whose percentage slides in on hover; the details modal
 * carries the summary, the live session rows, the refresh and settings
 * actions, the request-composition table, the token history chart and the
 * completed compactions. Session totals load on hover/open through the
 * `useContextSessionUsage` primitive beside this file.
 *
 * React's export re-keys its stateful view per conversation
 * (`key={project}:{conversation}`), so navigation discards the open preview,
 * the modal and the in-flight request; this port renders its view inside a
 * `Show keyed` on the same key, which re-creates it the same way.
 * `mergeContextHistory`,
 * the history/estimate merge that feeds the chart, comes from
 * `@molecule/app-ide-panel-logic`, as React's does.
 *
 * The component is a part (React renders it inside ChatPanel without
 * exporting it), so it lives in `src/parts/`.
 *
 * The trigger, the wrapper and the modal chrome read NO reactive state in
 * their own bodies — the preview, open and locale reads sit in attribute and
 * text expressions, so a hover or a locale switch updates the DOM in place and
 * the Tooltip's and Modal's own state survives, the way React's re-render
 * keeps component state. The stateless summary chunks re-create their
 * subtrees on a change, which renders the same DOM either way.
 *
 * Styling uses `getClassMap()` (`cm.*`); inline styles appear exactly where
 * React uses them, written in Solid's kebab-case style-object form. All
 * user-facing text goes through `t()` (each label reads the locale, so a
 * switch re-renders it the way React's whole-component re-render does).
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js'

import type { ContextCompaction, ContextUsage } from '@molecule/app-ai-chat'
import { formatTokenCount } from '@molecule/app-ai-models'
import { contextCategoryLabel, mergeContextHistory } from '@molecule/app-ide-panel-logic/panels'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Modal, Progress, Tooltip } from '@molecule/app-ui-solid'

import { ContextSessionUsage, useContextSessionUsage } from './ContextSessionUsage.jsx'

/** Props for {@link ContextUsageIndicator} — the React prop names, React's own contract. */
export interface ContextUsageIndicatorProps {
  /** The conversation's current usage sample. */
  usage: ContextUsage
  /** The earlier samples of the conversation, for the history chart. */
  history?: ContextUsage[]
  /** The completed compactions of the conversation. */
  compactions?: ContextCompaction[]
  /** The project whose session totals load; absent renders no refresh button. */
  projectId?: string
  /** The conversation the usage belongs to (`null` scopes the session to the project). */
  conversationId?: string | null
  /** Opens the chat settings; absent renders no settings button. */
  onOpenSettings?: () => void
}

/** React's `key` for the view, from the project and conversation ids. */
const sessionKey = (props: ContextUsageIndicatorProps): string =>
  `${props.projectId ?? ''}:${props.conversationId ?? ''}`

/**
 * The percentage span's inline style, from React's reveal widths: hidden the
 * percentage collapses to zero width, revealed it takes its text's width.
 *
 * @param preview - Whether the preview is showing.
 * @returns The style record.
 */
function pctStyle(preview: boolean): Record<string, string> {
  return {
    width: preview ? 'auto' : '0px',
    opacity: preview ? '1' : '0',
    overflow: 'hidden',
    'white-space': 'nowrap',
    transition: 'opacity 150ms',
  }
}

/**
 * The trigger button's inline style: the flex row whose gap opens only while
 * the preview shows (the percentage sliding in beside the ring).
 *
 * @param preview - Whether the preview is showing.
 * @returns The style record.
 */
function triggerStyle(preview: boolean): Record<string, string> {
  return { display: 'inline-flex', gap: preview ? '4px' : '0px' }
}

/**
 * Whether a bubbling over/out crossing the element's boundary counts as an
 * enter/leave the way React's synthetic mouseenter/mouseleave do: moving
 * between descendants fires over/out with the pointer still inside
 * (`relatedTarget` within the element), which is no boundary crossing.
 *
 * @param element - The element the handlers sit on.
 * @param event - The bubbling over/out event.
 * @returns True when the pointer crossed the element's boundary.
 */
function crossedBoundary(element: HTMLElement, event: MouseEvent): boolean {
  return !element.contains(event.relatedTarget as Node)
}

/**
 * The tooltip box's inline style, fixed for every case (React passes the same
 * literal), as a module constant.
 */
const TOOLTIP_STYLE = {
  width: '320px',
  'max-width': 'calc(100vw - 32px)',
  'white-space': 'normal',
} as const

/**
 * Serializes a ClassMap compound-spacing style object (`cm.sp({ p: 4 })`,
 * camelCase longhands) into Solid's style form: four equal sides collapse into
 * the shorthand the DOM records (`padding: 1rem`, what React's style object
 * serializes to), anything else becomes kebab-case longhands.
 *
 * @param record - The ClassMap spacing record.
 * @returns The kebab-case style record with the equal-side shorthand.
 */
function spacingStyle(record: Record<string, string>): Record<string, string> {
  const { paddingTop, paddingBottom, paddingLeft, paddingRight, ...rest } = record
  if (
    paddingTop !== undefined &&
    paddingTop === paddingBottom &&
    paddingTop === paddingLeft &&
    paddingTop === paddingRight
  ) {
    return { ...rest, padding: paddingTop }
  }
  const kebab = (key: string): string => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [kebab(key), value]))
}

/**
 * The stateful view for one conversation: owns the hover preview and the
 * details modal, and loads the session totals while either is showing.
 *
 * @param props - See {@link ContextUsageIndicatorProps}.
 * @returns The rendered view.
 */
function ContextUsageView(props: ContextUsageIndicatorProps): JSX.Element {
  const cm = getClassMap()
  const { t, locale } = useTranslation()
  const [preview, setPreview] = createSignal(false)
  const [open, setOpen] = createSignal(false)

  // While the preview shows, Escape dismisses it from anywhere on the page
  // (the modal's own Escape handling covers the open state).
  createEffect(() => {
    const visible = preview()
    if (typeof document === 'undefined') return
    const dismiss = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setPreview(false)
    }
    if (visible) document.addEventListener('keydown', dismiss)
    onCleanup(() => document.removeEventListener('keydown', dismiss))
  })

  // Navigation must discard totals and in-flight requests from the old session.
  const session = useContextSessionUsage(
    () => props.projectId,
    () => props.conversationId,
    () => open() || preview(),
  )

  /** The compaction threshold this sample rides on (may be undefined). */
  const target = (): number | undefined =>
    props.usage.backgroundCompactAtTokens ?? props.usage.compactAtTokens

  /** The effective limit the ratio reads against (never below one). */
  const limit = (): number => Math.max(1, target() ?? props.usage.contextWindow)

  /** The context ratio, clamped at zero. */
  const ratio = (): number => Math.max(0, props.usage.inputTokens / limit())

  /** The rounded percentage the ring and the summary show. */
  const percent = (): number => Math.round(ratio() * 100)

  /** The semantic color class for the ratio. */
  const color = (): string =>
    ratio() < 0.5 ? cm.textSuccess : ratio() < 0.9 ? cm.textWarning : cm.textError

  /** The progress bar's semantic tone for the ratio. */
  const tone = (): 'success' | 'warning' | 'error' =>
    ratio() < 0.5 ? 'success' : ratio() < 0.9 ? 'warning' : 'error'

  /** The second ring arc's stroke-dashoffset for the clamped ratio. */
  const dashoffset = (): string => `${16 * Math.PI * (1 - Math.min(ratio(), 1))}`

  /** The trigger's translated title (`Context usage`). */
  const title = (): string => {
    locale()
    return t('ide.chat.context.title', undefined, { defaultValue: 'Context usage' })
  }

  /** The limit's label: the compaction target, or the context window. */
  const targetLabel = (): string => {
    locale()
    return target()
      ? t('ide.chat.context.target', undefined, { defaultValue: 'Compaction target' })
      : t('ide.chat.context.window', undefined, { defaultValue: 'Context window' })
  }

  /** The status sentence above the bar. */
  const status = (): string => {
    locale()
    return target() != null && ratio() >= 1
      ? t('ide.chat.context.atTarget', undefined, { defaultValue: 'At compaction target' })
      : ratio() >= 0.9
        ? t('ide.chat.context.nearTarget', undefined, { defaultValue: 'Context nearly full' })
        : t('ide.chat.context.healthy', undefined, { defaultValue: 'Context has room' })
  }

  /** The trigger's aria label: the title, the tokens, the limit and the target. */
  const ariaLabel = (): string => {
    locale()
    const label = t(
      'ide.chat.context.indicator',
      {
        tokens: formatTokenCount(props.usage.inputTokens),
        limit: formatTokenCount(limit()),
        target: targetLabel(),
        percent: percent(),
      },
      { defaultValue: '{{tokens}} / {{limit}} tokens · {{target}} ({{percent}}%)' },
    )
    return `${title()}: ${label}`
  }

  /** The summary rows the tooltip and the modal's first section share. */
  const contextSummary = (): JSX.Element => {
    locale()
    return (
      <div class={cm.flex({ direction: 'col', gap: 'sm' })}>
        <div class={cm.flex({ justify: 'between', align: 'center', gap: 'md' })}>
          <strong>{status()}</strong>
          <strong class={color()}>{percent()}%</strong>
        </div>
        <Progress value={percent()} color={tone()} size="sm" label={targetLabel()} />
        <div class={cm.cn(cm.textMuted, cm.textSize('xs'))}>
          {`${formatTokenCount(props.usage.inputTokens)} / ${formatTokenCount(limit())} `}
          {t('ide.chat.context.tokenUnit', undefined, { defaultValue: 'tokens' })}
          <div>
            {t(
              'ide.chat.context.headroom',
              { tokens: formatTokenCount(Math.max(0, limit() - props.usage.inputTokens)) },
              { defaultValue: '{{tokens}} tokens of headroom' },
            )}
          </div>
        </div>
      </div>
    )
  }

  /** The session rows the tooltip and the modal share. */
  const sessionRows = (): JSX.Element => (
    <ContextSessionUsage
      data={session.data()}
      loading={session.loading()}
      failed={session.failed()}
    />
  )

  /** The tooltip's content: the summary, the session rows and the details hint. */
  const tooltipContent = (): JSX.Element => {
    locale()
    return (
      <div
        class={cm.flex({ direction: 'col', gap: 'md' })}
        style={{ padding: '8px 0px' }}
        onMouseOver={(event: MouseEvent) => {
          if (crossedBoundary(event.currentTarget as HTMLElement, event)) setPreview(true)
        }}
        onMouseOut={(event: MouseEvent) => {
          if (crossedBoundary(event.currentTarget as HTMLElement, event)) setPreview(false)
        }}
      >
        {contextSummary()}
        <div class={cm.borderT} style={{ 'padding-top': '12px' }}>
          {sessionRows()}
        </div>
        <span class={cm.cn(cm.textMuted, cm.textSize('xs'))}>
          {t('ide.chat.context.openDetails', undefined, {
            defaultValue: 'Click for breakdown, history and settings',
          })}
        </span>
      </div>
    )
  }

  /** The trigger: the collapsed percentage beside the ring. */
  const trigger = (): JSX.Element => (
    <Tooltip placement="top-end" style={TOOLTIP_STYLE} content={tooltipContent()}>
      <button
        type="button"
        class={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget)}
        style={triggerStyle(preview())}
        data-mol-id="chat-context-usage"
        aria-label={ariaLabel()}
        aria-haspopup="dialog"
        aria-expanded={open()}
        onClick={() => {
          setPreview(false)
          setOpen(true)
        }}
        onKeyDown={(event: KeyboardEvent) => {
          // Escape is a keyboard event from the focused element, so it
          // belongs on this trigger (the only focusable thing the preview
          // wrapper holds), not on the wrapper div around it.
          if (event.key === 'Escape') setPreview(false)
        }}
      >
        <span class={color()} aria-hidden="true" data-ctx-pct="" style={pctStyle(preview())}>
          {percent()}%
        </span>
        <svg class={color()} width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
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
            stroke-dashoffset={dashoffset()}
            transform="rotate(-90 9 9)"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </Tooltip>
  )

  /** The request-composition table, only when the sample carries one. */
  const compositionSection = (): JSX.Element | null => {
    locale()
    const composition = props.usage.composition
    if (!composition) return null
    const rows = [...composition.categories]
      .filter((category) => category.bytes > 0 || category.unknownItems > 0)
      .sort((a, b) => (b.estimatedTokens ?? 0) - (a.estimatedTokens ?? 0))
    return (
      <section class={cm.flex({ direction: 'col', gap: 'sm' })}>
        <h3 class={cm.fontWeight('semibold')}>
          {t('ide.chat.context.breakdown', undefined, { defaultValue: 'Request composition' })}
        </h3>
        <p>
          {composition.actualInputTokens != null
            ? t(
                'ide.chat.context.actual',
                { tokens: composition.actualInputTokens.toLocaleString() },
                {
                  defaultValue:
                    'Provider-reported input: {{tokens}} tokens (including cached input).',
                },
              )
            : t('ide.chat.context.pending', undefined, {
                defaultValue: 'Provider usage is pending; current token counts are estimates.',
              })}
        </p>
        <p class={cm.textMuted}>
          {t(
            'ide.chat.context.estimate',
            {
              tokens: composition.estimatedTokens.toLocaleString(),
              bytes: composition.totalBytes.toLocaleString(),
              chars: composition.totalChars.toLocaleString(),
            },
            {
              defaultValue:
                'Known text estimate: {{tokens}} tokens. Request: {{chars}} characters / {{bytes}} bytes. Shares describe estimated tokens, not billed allocation.',
            },
          )}
        </p>
        {composition.unknownTokenItems > 0 || composition.serializationFailures > 0 ? (
          <p class={cm.textMuted}>
            {t('ide.chat.context.unknown', undefined, {
              defaultValue:
                'Some image, attachment, or unmeasurable content has an unknown token cost and is excluded from estimated shares.',
            })}
          </p>
        ) : null}
        <div style={{ 'overflow-x': 'auto' }}>
          <table class={cm.table} style={{ 'text-align': 'left' }}>
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
              {rows.map((category) => (
                <tr class={cm.tableRow}>
                  <th scope="row" class={cm.tableCell}>
                    {contextCategoryLabel(t, category.id)}
                  </th>
                  <td class={cm.tableCell}>
                    {`${category.estimatedTokens?.toLocaleString() ?? '—'}${
                      category.unknownItems > 0 ? ' + ?' : ''
                    }`}
                  </td>
                  <td class={cm.tableCell}>
                    {category.percent == null ? '—' : `${category.percent}%`}
                  </td>
                  <td class={cm.tableCell}>{category.bytes.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  /** React's history chart: the dashed target line and the polyline. */
  const historyFigure = (): JSX.Element | null => {
    locale()
    const samples = mergeContextHistory(props.history ?? [], [props.usage])
    if (samples.length <= 1) return null
    const maxTokens = Math.max(limit(), ...samples.map((sample) => sample.inputTokens), 1)
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
    return (
      <figure style={{ margin: '16px 0px' }}>
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
          style={{ width: '100%', height: '120px' }}
        >
          <line
            x1="8"
            x2="312"
            y1={`${88 - (80 * limit()) / maxTokens}`}
            y2={`${88 - (80 * limit()) / maxTokens}`}
            stroke="currentColor"
            opacity=".4"
            stroke-dasharray="4 4"
          />
          <polyline points={points} fill="none" stroke="currentColor" stroke-width="2" />
        </svg>
        <div class={cm.textMuted} style={{ display: 'flex', 'justify-content': 'space-between' }}>
          <span>{start ? new Date(start).toLocaleTimeString() : ''}</span>
          <span>
            {`${formatTokenCount(maxTokens)} `}
            {t('ide.chat.context.tokenUnit', undefined, { defaultValue: 'tokens' })}
          </span>
          <span>{end ? new Date(end).toLocaleTimeString() : ''}</span>
        </div>
      </figure>
    )
  }

  /** The completed compactions, behind the collapsed details element. */
  const compactions = (): JSX.Element | null => {
    locale()
    const events = props.compactions ?? []
    if (events.length === 0) return null
    return (
      <details data-mol-id="chat-context-compactions">
        <summary>
          {t(
            'ide.chat.context.compactions',
            { count: events.length },
            { defaultValue: 'Completed compactions: {{count}}' },
          )}
        </summary>
        <ul>
          {events.map((event, _index) => (
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
          ))}
        </ul>
      </details>
    )
  }

  /** The target help line, only against a compaction target. */
  const targetHelp = (): JSX.Element | null => {
    locale()
    if (target() == null) return null
    return (
      <p class={cm.cn(cm.textMuted, cm.textSize('sm'))}>
        {t('ide.chat.context.targetHelp', undefined, {
          defaultValue:
            'Compaction is scheduled around this target; progress can continue while the summary is prepared.',
        })}
      </p>
    )
  }

  /** The model window line, always shown. */
  const windowSize = (): JSX.Element => {
    locale()
    return (
      <p class={cm.cn(cm.textMuted, cm.textSize('sm'))}>
        {t(
          'ide.chat.context.windowSize',
          { tokens: formatTokenCount(props.usage.contextWindow) },
          { defaultValue: 'Model context window: {{tokens}} tokens.' },
        )}
      </p>
    )
  }

  /** The modal's body: created once, its labels update in place. */
  const modalBody = (): JSX.Element => (
    <div class={cm.flex({ direction: 'col', gap: 'lg' })}>
      <section class={cm.card({ variant: 'outline' })} style={spacingStyle(cm.sp({ p: 4 }))}>
        {contextSummary()}
        <div class={cm.borderT} style={{ 'margin-top': '16px', 'padding-top': '16px' }}>
          {sessionRows()}
        </div>
      </section>
      <div class={cm.flex({ gap: 'sm', wrap: 'wrap' })}>
        <Show when={props.projectId} fallback={null}>
          <button
            type="button"
            data-mol-id="chat-context-refresh"
            class={cm.cn(
              cm.button({ variant: 'outline', color: 'secondary', size: 'sm' }),
              cm.touchTargetCompact,
            )}
            disabled={session.loading()}
            onClick={() => session.refresh()}
          >
            {(() => {
              locale()
              return t('ide.chat.context.refresh', undefined, { defaultValue: 'Refresh usage' })
            })()}
          </button>
        </Show>
        <Show when={props.onOpenSettings} fallback={null}>
          <button
            type="button"
            data-mol-id="chat-context-settings"
            class={cm.cn(
              cm.button({ variant: 'outline', color: 'secondary', size: 'sm' }),
              cm.touchTargetCompact,
            )}
            onClick={() => {
              setOpen(false)
              props.onOpenSettings?.()
            }}
          >
            {(() => {
              locale()
              return t('ide.chat.context.settings', undefined, { defaultValue: 'Chat settings' })
            })()}
          </button>
        </Show>
      </div>
      {targetHelp()}
      {windowSize()}
      {compositionSection()}
      {historyFigure()}
      {compactions()}
    </div>
  )

  return (
    <>
      <div
        style={{ 'margin-left': 'auto' }}
        onMouseOver={(event: MouseEvent) => {
          if (crossedBoundary(event.currentTarget as HTMLElement, event)) setPreview(true)
        }}
        onMouseOut={(event: MouseEvent) => {
          if (crossedBoundary(event.currentTarget as HTMLElement, event)) setPreview(false)
        }}
        onFocusIn={(event: FocusEvent) => {
          const el = event.target as HTMLElement
          try {
            setPreview(typeof el.matches === 'function' && el.matches(':focus-visible'))
          } catch (_error) {
            // :focus-visible unsupported here — don't show on focus; hover still applies.
          }
        }}
        onFocusOut={() => {
          setPreview(false)
        }}
      >
        {trigger()}
      </div>
      <Modal
        open={open()}
        onClose={() => {
          setOpen(false)
        }}
        title={title()}
        size="lg"
      >
        {modalBody()}
      </Modal>
    </>
  )
}

/**
 * A colored context ring with progressive context, session and allowance
 * details. Hovering the collapsed trigger reveals the percentage and the
 * preview tooltip; clicking opens the details modal. Pass `projectId` (and
 * optionally `conversationId`) to load the session totals, and
 * `onOpenSettings` to offer the settings shortcut.
 *
 * @param props - See {@link ContextUsageIndicatorProps}.
 * @returns The rendered indicator.
 */
export function ContextUsageIndicator(props: ContextUsageIndicatorProps): JSX.Element {
  return (
    // Navigation must discard totals and in-flight requests from the old session.
    <For each={[sessionKey(props)]}>
      {() => (
        <ContextUsageView
          usage={props.usage}
          history={props.history}
          compactions={props.compactions}
          projectId={props.projectId}
          conversationId={props.conversationId}
          onOpenSettings={props.onOpenSettings}
        />
      )}
    </For>
  )
}
