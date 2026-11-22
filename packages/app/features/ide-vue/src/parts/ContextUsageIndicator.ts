/**
 * A colored context ring with progressive context, session and allowance
 * details — the Vue counterpart of `@molecule/app-ide-react`'s
 * `ContextUsageIndicator` (see that file for the design notes): the same props
 * (React names), the same DOM for the same input, the same callbacks and
 * service calls. The collapsed trigger is a ring whose arc fills with the
 * context ratio and whose percentage slides in on hover; the details modal
 * carries the summary, the live session rows, the refresh and settings
 * actions, the request-composition table, the token history chart and the
 * completed compactions. Session totals load on hover/open through the
 * `useContextSessionUsage` composable beside this file.
 *
 * React's export re-keys its stateful view per conversation
 * (`key={project}:{conversation}`), so navigation discards the open preview,
 * the modal and the in-flight request; this port renders its view component
 * with the same key, which re-creates it the same way. `mergeContextHistory`,
 * the history/estimate merge that feeds the chart, comes from
 * `@molecule/app-ide-panel-logic`, as React's does.
 *
 * The component is a part (React renders it inside ChatPanel without
 * exporting it), so it lives in `src/parts/`.
 *
 * Styling uses `getClassMap()` (`cm.*`); inline styles appear exactly where
 * React uses them. All user-facing text goes through `t()`.
 *
 * @module
 */

import { defineComponent, h, onUnmounted, type PropType, ref, type VNodeChild, watch } from 'vue'

import type { ContextCompaction, ContextUsage } from '@molecule/app-ai-chat'
import { formatTokenCount } from '@molecule/app-ai-models'
import { contextCategoryLabel, mergeContextHistory } from '@molecule/app-ide-panel-logic/panels'
import { getClassMap } from '@molecule/app-ui'
import { Modal, Progress, Tooltip } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import { ContextSessionUsage, useContextSessionUsage } from './ContextSessionUsage.js'

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
 * The stateful view for one conversation: owns the hover preview and the
 * details modal, and loads the session totals while either is showing.
 *
 * @param props - See {@link ContextUsageIndicatorProps}.
 * @returns The rendered view.
 */
const ContextUsageView = defineComponent({
  name: 'ContextUsageView',
  props: {
    usage: { type: Object as PropType<ContextUsage>, required: true },
    history: { type: Array as PropType<ContextUsage[]>, required: false, default: () => [] },
    compactions: {
      type: Array as PropType<ContextCompaction[]>,
      required: false,
      default: () => [],
    },
    projectId: {
      type: String as PropType<string | undefined>,
      required: false,
      default: undefined,
    },
    conversationId: {
      type: [String, null] as PropType<string | null | undefined>,
      required: false,
      default: undefined,
    },
    onOpenSettings: {
      type: Function as PropType<(() => void) | undefined>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const preview = ref(false)
    const open = ref(false)

    // While the preview shows, Escape dismisses it from anywhere on the page
    // (the modal's own Escape handling covers the open state).
    const onDocumentKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') preview.value = false
    }
    watch(preview, (visible) => {
      if (typeof document === 'undefined') return
      if (visible) document.addEventListener('keydown', onDocumentKeydown)
      else document.removeEventListener('keydown', onDocumentKeydown)
    })
    onUnmounted(() => {
      if (typeof document === 'undefined') return
      document.removeEventListener('keydown', onDocumentKeydown)
    })

    // Navigation must discard totals and in-flight requests from the old session.
    const session = useContextSessionUsage(
      (): string | undefined => props.projectId,
      (): string | null | undefined => props.conversationId,
      (): boolean => open.value || preview.value,
    )

    return (): VNodeChild => {
      const usage = props.usage
      const target = usage.backgroundCompactAtTokens ?? usage.compactAtTokens
      const limit = Math.max(1, target ?? usage.contextWindow)
      const ratio = Math.max(0, usage.inputTokens / limit)
      const percent = Math.round(ratio * 100)
      const color = ratio < 0.5 ? cm.textSuccess : ratio < 0.9 ? cm.textWarning : cm.textError
      const tone = ratio < 0.5 ? 'success' : ratio < 0.9 ? 'warning' : 'error'
      const status =
        target != null && ratio >= 1
          ? t('ide.chat.context.atTarget', undefined, { defaultValue: 'At compaction target' })
          : ratio >= 0.9
            ? t('ide.chat.context.nearTarget', undefined, { defaultValue: 'Context nearly full' })
            : t('ide.chat.context.healthy', undefined, { defaultValue: 'Context has room' })
      const title = t('ide.chat.context.title', undefined, { defaultValue: 'Context usage' })
      const targetLabel = target
        ? t('ide.chat.context.target', undefined, { defaultValue: 'Compaction target' })
        : t('ide.chat.context.window', undefined, { defaultValue: 'Context window' })
      const composition = usage.composition
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
      const samples = mergeContextHistory(props.history, [usage])

      // The summary rows the tooltip and the modal's first section share.
      const contextSummary = h('div', { class: cm.flex({ direction: 'col', gap: 'sm' }) }, [
        h('div', { class: cm.flex({ justify: 'between', align: 'center', gap: 'md' }) }, [
          h('strong', [status]),
          h('strong', { class: color }, [`${percent}%`]),
        ]),
        h(Progress, { value: percent, color: tone, size: 'sm', label: targetLabel }),
        h('div', { class: cm.cn(cm.textMuted, cm.textSize('xs')) }, [
          `${formatTokenCount(usage.inputTokens)} / ${formatTokenCount(limit)} `,
          t('ide.chat.context.tokenUnit', undefined, { defaultValue: 'tokens' }),
          h('div', [
            t(
              'ide.chat.context.headroom',
              { tokens: formatTokenCount(Math.max(0, limit - usage.inputTokens)) },
              { defaultValue: '{{tokens}} tokens of headroom' },
            ),
          ]),
        ]),
      ])

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

      // React's history chart: the dashed target line and the polyline.
      const historyFigure =
        samples.length > 1
          ? h('figure', { style: { margin: '16px 0' } }, [
              h('figcaption', { class: cm.fontWeight('semibold') }, [
                t(
                  'ide.chat.context.history',
                  { count: samples.length },
                  { defaultValue: 'Context over time · {{count}} requests' },
                ),
              ]),
              h(
                'svg',
                {
                  viewBox: '0 0 320 96',
                  role: 'img',
                  'aria-label': t('ide.chat.context.chart', undefined, {
                    defaultValue: 'Input tokens over time; dashed line marks the current target',
                  }),
                  style: { width: '100%', height: '120px' },
                },
                [
                  h('line', {
                    x1: '8',
                    x2: '312',
                    y1: `${88 - (80 * limit) / maxTokens}`,
                    y2: `${88 - (80 * limit) / maxTokens}`,
                    stroke: 'currentColor',
                    opacity: '.4',
                    'stroke-dasharray': '4 4',
                  }),
                  h('polyline', {
                    points,
                    fill: 'none',
                    stroke: 'currentColor',
                    'stroke-width': '2',
                  }),
                ],
              ),
              h(
                'div',
                {
                  class: cm.textMuted,
                  style: { display: 'flex', 'justify-content': 'space-between' },
                },
                [
                  h('span', [start ? new Date(start).toLocaleTimeString() : '']),
                  h('span', [
                    `${formatTokenCount(maxTokens)} `,
                    t('ide.chat.context.tokenUnit', undefined, { defaultValue: 'tokens' }),
                  ]),
                  h('span', [end ? new Date(end).toLocaleTimeString() : '']),
                ],
              ),
            ])
          : null

      // The completed compactions, behind the collapsed details element.
      const compactions =
        props.compactions.length > 0
          ? h('details', { 'data-mol-id': 'chat-context-compactions' }, [
              h('summary', [
                t(
                  'ide.chat.context.compactions',
                  { count: props.compactions.length },
                  { defaultValue: 'Completed compactions: {{count}}' },
                ),
              ]),
              h(
                'ul',
                {},
                props.compactions.map((event, index) =>
                  h(
                    'li',
                    { key: `${event.at}-${index}` },
                    t(
                      'ide.chat.context.compaction',
                      {
                        at: new Date(event.at).toLocaleTimeString(),
                        before: event.beforeChars.toLocaleString(),
                        after: event.afterChars.toLocaleString(),
                        seconds: Math.round(event.elapsedMs / 1000),
                      },
                      { defaultValue: '{{at}} · {{before}} → {{after}} characters · {{seconds}}s' },
                    ),
                  ),
                ),
              ),
            ])
          : null

      // The request-composition table, only when the sample carries one.
      const compositionSection = composition
        ? h('section', { class: cm.flex({ direction: 'col', gap: 'sm' }) }, [
            h('h3', { class: cm.fontWeight('semibold') }, [
              t('ide.chat.context.breakdown', undefined, { defaultValue: 'Request composition' }),
            ]),
            h('p', [
              composition.actualInputTokens != null
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
                  }),
            ]),
            h('p', { class: cm.textMuted }, [
              t(
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
              ),
            ]),
            composition.unknownTokenItems > 0 || composition.serializationFailures > 0
              ? h('p', { class: cm.textMuted }, [
                  t('ide.chat.context.unknown', undefined, {
                    defaultValue:
                      'Some image, attachment, or unmeasurable content has an unknown token cost and is excluded from estimated shares.',
                  }),
                ])
              : null,
            h('div', { style: { 'overflow-x': 'auto' } }, [
              h('table', { class: cm.table, style: { 'text-align': 'left' } }, [
                h('caption', { class: cm.srOnly }, [
                  t('ide.chat.context.breakdown', undefined, {
                    defaultValue: 'Request composition',
                  }),
                ]),
                h('thead', {}, [
                  h('tr', {}, [
                    h('th', { class: cm.tableHead }, [
                      t('ide.chat.context.category', undefined, { defaultValue: 'Category' }),
                    ]),
                    h('th', { class: cm.tableHead }, [
                      t('ide.chat.context.tokens', undefined, { defaultValue: 'Est. tokens' }),
                    ]),
                    h('th', { class: cm.tableHead }, [
                      t('ide.chat.context.share', undefined, { defaultValue: 'Share' }),
                    ]),
                    h('th', { class: cm.tableHead }, [
                      t('ide.chat.context.bytes', undefined, { defaultValue: 'Bytes' }),
                    ]),
                  ]),
                ]),
                h(
                  'tbody',
                  {},
                  [...composition.categories]
                    .filter((category) => category.bytes > 0 || category.unknownItems > 0)
                    .sort((a, b) => (b.estimatedTokens ?? 0) - (a.estimatedTokens ?? 0))
                    .map((category) =>
                      h('tr', { key: category.id, class: cm.tableRow }, [
                        h('th', { scope: 'row', class: cm.tableCell }, [
                          contextCategoryLabel(t, category.id),
                        ]),
                        h('td', { class: cm.tableCell }, [
                          `${category.estimatedTokens?.toLocaleString() ?? '—'}${category.unknownItems > 0 ? ' + ?' : ''}`,
                        ]),
                        h('td', { class: cm.tableCell }, [
                          category.percent == null ? '—' : `${category.percent}%`,
                        ]),
                        h('td', { class: cm.tableCell }, [category.bytes.toLocaleString()]),
                      ]),
                    ),
                ),
              ]),
            ]),
          ])
        : null

      return [
        h(
          'div',
          {
            style: { 'margin-left': 'auto' },
            onMouseover: (event: MouseEvent) => {
              if (crossedBoundary(event.currentTarget as HTMLElement, event)) preview.value = true
            },
            onMouseout: (event: MouseEvent) => {
              if (crossedBoundary(event.currentTarget as HTMLElement, event)) preview.value = false
            },
            onFocusin: (event: FocusEvent) => {
              const el = event.target as HTMLElement
              try {
                preview.value = typeof el.matches === 'function' && el.matches(':focus-visible')
              } catch (_error) {
                // :focus-visible unsupported here — don't show on focus; hover still applies.
              }
            },
            onFocusout: () => {
              preview.value = false
            },
          },
          [
            h(
              Tooltip,
              {
                placement: 'top-end',
                style: {
                  width: '320px',
                  'max-width': 'calc(100vw - 32px)',
                  'white-space': 'normal',
                },
                content: h(
                  'div',
                  {
                    class: cm.flex({ direction: 'col', gap: 'md' }),
                    style: { padding: '8px 0' },
                    onMouseover: (event: MouseEvent) => {
                      if (crossedBoundary(event.currentTarget as HTMLElement, event))
                        preview.value = true
                    },
                    onMouseout: (event: MouseEvent) => {
                      if (crossedBoundary(event.currentTarget as HTMLElement, event))
                        preview.value = false
                    },
                  },
                  [
                    contextSummary,
                    h('div', { class: cm.borderT, style: { 'padding-top': '12px' } }, [
                      h(ContextSessionUsage, {
                        data: session.data.value,
                        loading: session.loading.value,
                        failed: session.failed.value,
                      }),
                    ]),
                    h('span', { class: cm.cn(cm.textMuted, cm.textSize('xs')) }, [
                      t('ide.chat.context.openDetails', undefined, {
                        defaultValue: 'Click for breakdown, history and settings',
                      }),
                    ]),
                  ],
                ),
              },
              () =>
                h(
                  'button',
                  {
                    type: 'button',
                    class: cm.cn(cm.button({ variant: 'ghost', size: 'xs' }), cm.touchTarget),
                    style: triggerStyle(preview.value),
                    'data-mol-id': 'chat-context-usage',
                    'aria-label': `${title}: ${label}`,
                    'aria-haspopup': 'dialog',
                    'aria-expanded': open.value,
                    onClick: () => {
                      preview.value = false
                      open.value = true
                    },
                    onKeydown: (event: KeyboardEvent) => {
                      // Escape is a keyboard event from the focused element, so it
                      // belongs on this trigger (the only focusable thing the preview
                      // wrapper holds), not on the wrapper div around it.
                      if (event.key === 'Escape') preview.value = false
                    },
                  },
                  [
                    h(
                      'span',
                      {
                        class: color,
                        'aria-hidden': 'true',
                        'data-ctx-pct': '',
                        style: pctStyle(preview.value),
                      },
                      [`${percent}%`],
                    ),
                    h(
                      'svg',
                      {
                        class: color,
                        width: '18',
                        height: '18',
                        viewBox: '0 0 18 18',
                        'aria-hidden': 'true',
                      },
                      [
                        h('circle', {
                          cx: '9',
                          cy: '9',
                          r: '8',
                          fill: 'none',
                          stroke: 'currentColor',
                          'stroke-width': '2',
                          opacity: '.15',
                        }),
                        h('circle', {
                          cx: '9',
                          cy: '9',
                          r: '8',
                          fill: 'none',
                          stroke: 'currentColor',
                          'stroke-width': '2',
                          'stroke-dasharray': `${16 * Math.PI}`,
                          'stroke-dashoffset': `${16 * Math.PI * (1 - Math.min(ratio, 1))}`,
                          transform: 'rotate(-90 9 9)',
                          'stroke-linecap': 'round',
                        }),
                      ],
                    ),
                  ],
                ),
            ),
          ],
        ),
        h(
          Modal,
          {
            open: open.value,
            onClose: () => {
              open.value = false
            },
            title,
            size: 'lg',
          },
          () =>
            h('div', { class: cm.flex({ direction: 'col', gap: 'lg' }) }, [
              h('section', { class: cm.card({ variant: 'outline' }), style: cm.sp({ p: 4 }) }, [
                contextSummary,
                h(
                  'div',
                  { class: cm.borderT, style: { 'margin-top': '16px', 'padding-top': '16px' } },
                  [
                    h(ContextSessionUsage, {
                      data: session.data.value,
                      loading: session.loading.value,
                      failed: session.failed.value,
                    }),
                  ],
                ),
              ]),
              h('div', { class: cm.flex({ gap: 'sm', wrap: 'wrap' }) }, [
                props.projectId
                  ? h(
                      'button',
                      {
                        type: 'button',
                        'data-mol-id': 'chat-context-refresh',
                        class: cm.cn(
                          cm.button({ variant: 'outline', color: 'secondary', size: 'sm' }),
                          cm.touchTargetCompact,
                        ),
                        disabled: session.loading.value,
                        onClick: () => session.refresh(),
                      },
                      [t('ide.chat.context.refresh', undefined, { defaultValue: 'Refresh usage' })],
                    )
                  : null,
                props.onOpenSettings
                  ? h(
                      'button',
                      {
                        type: 'button',
                        'data-mol-id': 'chat-context-settings',
                        class: cm.cn(
                          cm.button({ variant: 'outline', color: 'secondary', size: 'sm' }),
                          cm.touchTargetCompact,
                        ),
                        onClick: () => {
                          open.value = false
                          props.onOpenSettings?.()
                        },
                      },
                      [
                        t('ide.chat.context.settings', undefined, {
                          defaultValue: 'Chat settings',
                        }),
                      ],
                    )
                  : null,
              ]),
              target != null
                ? h('p', { class: cm.cn(cm.textMuted, cm.textSize('sm')) }, [
                    t('ide.chat.context.targetHelp', undefined, {
                      defaultValue:
                        'Compaction is scheduled around this target; progress can continue while the summary is prepared.',
                    }),
                  ])
                : null,
              h('p', { class: cm.cn(cm.textMuted, cm.textSize('sm')) }, [
                t(
                  'ide.chat.context.windowSize',
                  { tokens: formatTokenCount(usage.contextWindow) },
                  { defaultValue: 'Model context window: {{tokens}} tokens.' },
                ),
              ]),
              compositionSection,
              historyFigure,
              compactions,
            ]),
        ),
      ]
    }
  },
})

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
export const ContextUsageIndicator = defineComponent({
  name: 'ContextUsageIndicator',
  props: {
    /** The conversation's current usage sample. */
    usage: { type: Object as PropType<ContextUsage>, required: true },
    /** The earlier samples of the conversation, for the history chart. */
    history: { type: Array as PropType<ContextUsage[]>, required: false, default: () => [] },
    /** The completed compactions of the conversation. */
    compactions: {
      type: Array as PropType<ContextCompaction[]>,
      required: false,
      default: () => [],
    },
    projectId: {
      type: String as PropType<string | undefined>,
      required: false,
      default: undefined,
    },
    conversationId: {
      type: [String, null] as PropType<string | null | undefined>,
      required: false,
      default: undefined,
    },
    onOpenSettings: {
      type: Function as PropType<(() => void) | undefined>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    return (): VNodeChild => {
      // Navigation must discard totals and in-flight requests from the old session.
      return h(ContextUsageView, {
        key: `${props.projectId ?? ''}:${props.conversationId ?? ''}`,
        usage: props.usage,
        history: props.history,
        compactions: props.compactions,
        projectId: props.projectId,
        conversationId: props.conversationId,
        onOpenSettings: props.onOpenSettings,
      })
    }
  },
})
