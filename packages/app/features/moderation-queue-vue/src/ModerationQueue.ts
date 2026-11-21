/**
 * Vue moderation queue UI.
 *
 * Vue counterpart of `@molecule/app-moderation-queue-react`'s `ModerationQueue`
 * — the same props (React names), the same ClassMap tokens, and the same DOM
 * for the same input.
 *
 * @module
 */

import {
  defineComponent,
  h,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  withDirectives,
} from 'vue'

import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import { type ControlledCheckboxState, vModerationChecked } from './checked.js'
import type {
  ModerationBulkAction,
  ModerationItem,
  ModerationItemKind,
  ModerationItemSeverity,
} from './types.js'

/** The leading glyph of each content kind. */
const KIND_GLYPH: Record<ModerationItemKind, string> = {
  post: '\u{1F4DD}',
  comment: '\u{1F4AC}',
  image: '\u{1F5BC}',
  message: '✉',
  profile: '\u{1F464}',
}

/** The severity → `ColorVariant` mapping. */
const SEVERITY_COLOR: Record<ModerationItemSeverity, ColorVariant> = {
  low: 'info',
  medium: 'warning',
  high: 'error',
}

/**
 * Translates a severity to its `ColorVariant`. Exported for tests and
 * downstream consumers (chips, badges, summary tiles).
 *
 * @param severity - Severity bucket (`'low'`, `'medium'`, `'high'`) or undefined.
 * @returns Mapped `ColorVariant`, defaulting to `'info'` when severity is omitted.
 */
export function severityColor(severity: ModerationItemSeverity | undefined): ColorVariant {
  return severity ? SEVERITY_COLOR[severity] : 'info'
}

/**
 * The translation function shape `useTranslation()` returns. The label helpers
 * below take it as a parameter so every key this package requests is a
 * LITERAL: the i18n parity gate can only see literal keys and refuses
 * runtime-built ones.
 */
type TranslateFn = ReturnType<typeof useTranslation>['t']

/**
 * Kind label — one literal `t()` call per `ModerationItemKind` value.
 *
 * @param kind - Item kind.
 * @param t - Translate function from `useTranslation()`.
 * @returns The translated kind label.
 */
function kindLabel(kind: ModerationItemKind, t: TranslateFn): string {
  switch (kind) {
    case 'post':
      return t('moderationQueue.kind.post', {}, { defaultValue: 'Post' })
    case 'comment':
      return t('moderationQueue.kind.comment', {}, { defaultValue: 'Comment' })
    case 'image':
      return t('moderationQueue.kind.image', {}, { defaultValue: 'Image' })
    case 'message':
      return t('moderationQueue.kind.message', {}, { defaultValue: 'Message' })
    case 'profile':
      return t('moderationQueue.kind.profile', {}, { defaultValue: 'Profile' })
  }
}

/**
 * Severity label — one literal `t()` call per `ModerationItemSeverity` value.
 *
 * @param severity - Severity bucket.
 * @param t - Translate function from `useTranslation()`.
 * @returns The translated severity label.
 */
function severityLabel(severity: ModerationItemSeverity, t: TranslateFn): string {
  switch (severity) {
    case 'low':
      return t('moderationQueue.severity.low', {}, { defaultValue: 'Low' })
    case 'medium':
      return t('moderationQueue.severity.medium', {}, { defaultValue: 'Medium' })
    case 'high':
      return t('moderationQueue.severity.high', {}, { defaultValue: 'High' })
  }
}

/**
 * Moderation queue — a list of flagged items with kind icon, content preview,
 * reason chip, severity color, per-row action buttons (approve / reject /
 * escalate / mute), and a bulk-select toolbar (select-all checkbox +
 * apply-to-selected action buttons).
 *
 * All user-visible text comes from i18n keys in
 * `@molecule/app-locales-moderation-queue`. Styling is driven exclusively
 * through `getClassMap()`.
 *
 * @param props - Component props (see {@link ModerationQueueProps} in
 *   `./types.js`).
 * @returns The moderation queue component.
 */
export const ModerationQueue = defineComponent({
  name: 'ModerationQueue',
  props: {
    items: { type: Array as PropType<ModerationItem[]>, required: true },
    onApprove: { type: Function as PropType<(id: string) => void>, required: true },
    onReject: { type: Function as PropType<(id: string) => void>, required: true },
    onEscalate: { type: Function as PropType<(id: string) => void>, default: undefined },
    onMute: { type: Function as PropType<(id: string) => void>, default: undefined },
    onBulkAction: {
      type: Function as PropType<(action: ModerationBulkAction, ids: string[]) => void>,
      default: undefined,
    },
    loading: { type: Boolean, default: false },
    // Node-valued: `null` accepts any runtime type (a VNode or text), the way
    // Vue declares a slot-ish prop.
    emptyState: null,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const selected = ref<Set<string>>(new Set())

    /**
     * The current items' ids.
     * @returns The ids, in render order.
     */
    const allIds = (): string[] => props.items.map((item) => item.id)

    /**
     * Whether every item is selected (React's `allIds.length > 0 && every`).
     * @returns True when every id is selected.
     */
    const allSelected = (): boolean => {
      const ids = allIds()
      return ids.length > 0 && ids.every((id) => selected.value.has(id))
    }

    /**
     * Whether some, but not all, items are selected (React's `someSelected`).
     * @returns True for a partial selection.
     */
    const someSelected = (): boolean => {
      const ids = allIds()
      return !allSelected() && ids.some((id) => selected.value.has(id))
    }

    /**
     * How many of the current items are selected.
     * @returns The selection count.
     */
    const selectionCount = (): number => {
      const ids = allIds()
      return ids.filter((id) => selected.value.has(id)).length
    }

    /**
     * Toggles one item's selection (React's `toggleOne`).
     * @param id - The item id.
     */
    const toggleOne = (id: string): void => {
      const next = new Set(selected.value)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      selected.value = next
    }

    /**
     * Selects every item, or clears the selection when all are selected
     * (React's `toggleAll`).
     */
    const toggleAll = (): void => {
      const ids = allIds()
      const every = ids.length > 0 && ids.every((id) => selected.value.has(id))
      selected.value = every ? new Set() : new Set(ids)
    }

    /**
     * Applies a bulk action to the selected ids and clears the selection
     * (React's `applyBulk`).
     * @param action - The bulk action.
     */
    const applyBulk = (action: ModerationBulkAction): void => {
      const ids = allIds()
      const picked = Array.from(selected.value).filter((id) => ids.includes(id))
      if (picked.length === 0) return
      props.onBulkAction?.(action, picked)
      selected.value = new Set()
    }

    /**
     * One moderation queue row (React's internal `ModerationQueueRow`).
     * @param item - The flagged item.
     * @returns The rendered row.
     */
    const row = (item: ModerationItem): VNode => {
      const sevColor = severityColor(item.severity)
      // ClassMap exposes textPrimary/textSuccess/textWarning/textError as
      // semantic text-color tokens. There is no token for secondary/info,
      // so we fall back to textPrimary, exactly as React does.
      const sevToken: Record<ColorVariant, string> = {
        primary: cm.textPrimary,
        secondary: cm.textPrimary,
        success: cm.textSuccess,
        warning: cm.textWarning,
        error: cm.textError,
        info: cm.textPrimary,
      }
      const checkbox: ControlledCheckboxState = { checked: selected.value.has(item.id) }

      const meta: VNodeChild[] = [
        h('span', { class: cm.fontWeight('semibold') }, kindLabel(item.kind, t)),
      ]
      if (item.severity) {
        meta.push(
          h(
            'span',
            {
              'data-mol-id': 'moderation-queue-row-severity',
              class: cm.cn(cm.fontWeight('semibold'), sevToken[sevColor]),
            },
            severityLabel(item.severity, t),
          ),
        )
      }
      if (item.reportedBy) {
        meta.push(
          h('span', { 'data-mol-id': 'moderation-queue-row-reported-by' }, [
            `${t('moderationQueue.reportedBy', {}, { defaultValue: 'Reported by' })} `,
            h('span', { class: cm.fontWeight('semibold') }, [item.reportedBy]),
          ]),
        )
      }
      meta.push(
        h('span', { 'data-mol-id': 'moderation-queue-row-reported-at' }, [
          item.reportedAt,
        ] as VNodeChild[]),
      )

      const actions: VNodeChild[] = [
        h(
          Button,
          {
            size: 'sm',
            variant: 'ghost',
            color: 'success',
            onClick: () => props.onApprove(item.id),
            'data-mol-id': 'moderation-queue-row-approve',
            'aria-label': t('moderationQueue.aria.approve', {}, { defaultValue: 'Approve' }),
          },
          () => t('moderationQueue.action.approve', {}, { defaultValue: 'Approve' }),
        ),
        h(
          Button,
          {
            size: 'sm',
            variant: 'ghost',
            color: 'error',
            onClick: () => props.onReject(item.id),
            'data-mol-id': 'moderation-queue-row-reject',
            'aria-label': t('moderationQueue.aria.reject', {}, { defaultValue: 'Reject' }),
          },
          () => t('moderationQueue.action.reject', {}, { defaultValue: 'Reject' }),
        ),
      ]
      if (props.onEscalate) {
        const onEscalate = props.onEscalate
        actions.push(
          h(
            Button,
            {
              size: 'sm',
              variant: 'ghost',
              color: 'warning',
              onClick: () => onEscalate(item.id),
              'data-mol-id': 'moderation-queue-row-escalate',
              'aria-label': t('moderationQueue.aria.escalate', {}, { defaultValue: 'Escalate' }),
            },
            () => t('moderationQueue.action.escalate', {}, { defaultValue: 'Escalate' }),
          ),
        )
      }
      if (props.onMute) {
        const onMute = props.onMute
        actions.push(
          h(
            Button,
            {
              size: 'sm',
              variant: 'ghost',
              color: 'secondary',
              onClick: () => onMute(item.id),
              'data-mol-id': 'moderation-queue-row-mute',
              'aria-label': t('moderationQueue.aria.mute', {}, { defaultValue: 'Mute' }),
            },
            () => t('moderationQueue.action.mute', {}, { defaultValue: 'Mute' }),
          ),
        )
      }

      return h(
        'li',
        {
          key: item.id,
          'data-mol-id': 'moderation-queue-row',
          'data-mol-row-id': item.id,
          'data-mol-kind': item.kind,
          'data-mol-severity': item.severity ?? 'unspecified',
          class: cm.cn(cm.flex({ align: 'start', gap: 'md' }), cm.sp('p', 3)),
        },
        [
          withDirectives(
            h('input', {
              type: 'checkbox',
              onChange: () => toggleOne(item.id),
              'data-mol-id': 'moderation-queue-row-select',
              'aria-label': t(
                'moderationQueue.aria.selectRow',
                {},
                { defaultValue: 'Select item' },
              ),
            }),
            [[vModerationChecked, checkbox]],
          ),
          h(
            'span',
            {
              'aria-hidden': 'true',
              'data-mol-id': 'moderation-queue-row-kind-icon',
              class: cm.cn(cm.textSize('lg')),
            },
            KIND_GLYPH[item.kind],
          ),
          h('div', { class: cm.cn(cm.flex1, cm.stack(1)) }, [
            h(
              'div',
              {
                class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs')),
                'data-mol-id': 'moderation-queue-row-meta',
              },
              meta,
            ),
            h(
              'div',
              {
                'data-mol-id': 'moderation-queue-row-preview',
                class: cm.cn(cm.textSize('sm')),
              },
              [item.preview],
            ),
            h(
              'div',
              {
                'data-mol-id': 'moderation-queue-row-reason',
                class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs')),
              },
              [
                h(
                  'span',
                  { class: cm.fontWeight('semibold') },
                  `${t('moderationQueue.reason', {}, { defaultValue: 'Reason' })}:`,
                ),
                h('span', null, [item.reason]),
              ],
            ),
          ]),
          h(
            'div',
            {
              class: cm.flex({ align: 'center', gap: 'sm' }),
              'data-mol-id': 'moderation-queue-row-actions',
            },
            actions,
          ),
        ],
      )
    }

    return (): VNode => {
      if (props.loading) {
        return h(
          'div',
          {
            role: 'status',
            'aria-live': 'polite',
            'data-mol-id': 'moderation-queue-loading',
            class: cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.sp('p', 4),
              props.className,
            ),
          },
          [
            h(
              'span',
              null,
              t('moderationQueue.loading', {}, { defaultValue: 'Loading moderation queue…' }),
            ),
          ],
        )
      }

      if (props.items.length === 0) {
        return h(
          'div',
          {
            role: 'status',
            'data-mol-id': 'moderation-queue-empty',
            class: cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.sp('p', 6),
              props.className,
            ),
          },
          [
            props.emptyState !== undefined && props.emptyState !== null
              ? props.emptyState
              : h(
                  'span',
                  { class: cm.cn(cm.textSize('sm')) },
                  t('moderationQueue.empty', {}, { defaultValue: 'No items awaiting moderation.' }),
                ),
          ],
        )
      }

      const count = selectionCount()
      const selectAllInput = withDirectives(
        h('input', {
          type: 'checkbox',
          onChange: toggleAll,
          'data-mol-id': 'moderation-queue-select-all',
          'aria-label': t('moderationQueue.aria.selectAll', {}, { defaultValue: 'Select all' }),
        }),
        [[vModerationChecked, { checked: allSelected(), indeterminate: someSelected() }]],
      )

      const toolbar: VNodeChild[] = [
        h(
          'label',
          {
            class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('sm')),
            'data-mol-id': 'moderation-queue-select-all-label',
          },
          [
            selectAllInput,
            h(
              'span',
              null,
              count > 0
                ? t(
                    'moderationQueue.selectedCount',
                    { count },
                    { defaultValue: '{{count}} selected' },
                  )
                : t('moderationQueue.selectAll', {}, { defaultValue: 'Select all' }),
            ),
          ],
        ),
      ]

      if (props.onBulkAction) {
        const bulk: VNodeChild[] = [
          h(
            Button,
            {
              variant: 'ghost',
              size: 'sm',
              color: 'success',
              disabled: count === 0,
              onClick: () => applyBulk('approve'),
              'data-mol-id': 'moderation-queue-bulk-approve',
            },
            () => t('moderationQueue.bulk.approve', {}, { defaultValue: 'Approve' }),
          ),
          h(
            Button,
            {
              variant: 'ghost',
              size: 'sm',
              color: 'error',
              disabled: count === 0,
              onClick: () => applyBulk('reject'),
              'data-mol-id': 'moderation-queue-bulk-reject',
            },
            () => t('moderationQueue.bulk.reject', {}, { defaultValue: 'Reject' }),
          ),
        ]
        if (props.onEscalate) {
          bulk.push(
            h(
              Button,
              {
                variant: 'ghost',
                size: 'sm',
                color: 'warning',
                disabled: count === 0,
                onClick: () => applyBulk('escalate'),
                'data-mol-id': 'moderation-queue-bulk-escalate',
              },
              () => t('moderationQueue.bulk.escalate', {}, { defaultValue: 'Escalate' }),
            ),
          )
        }
        if (props.onMute) {
          bulk.push(
            h(
              Button,
              {
                variant: 'ghost',
                size: 'sm',
                color: 'secondary',
                disabled: count === 0,
                onClick: () => applyBulk('mute'),
                'data-mol-id': 'moderation-queue-bulk-mute',
              },
              () => t('moderationQueue.bulk.mute', {}, { defaultValue: 'Mute' }),
            ),
          )
        }
        toolbar.push(
          h(
            'div',
            {
              class: cm.flex({ align: 'center', gap: 'sm' }),
              'data-mol-id': 'moderation-queue-bulk-actions',
            },
            bulk,
          ),
        )
      }

      return h(
        'div',
        {
          role: 'region',
          'aria-label': t('moderationQueue.aria.region', {}, { defaultValue: 'Moderation queue' }),
          'data-mol-id': 'moderation-queue',
          class: cm.cn(cm.stack(2), props.className),
        },
        [
          h(
            'div',
            {
              role: 'toolbar',
              'aria-label': t(
                'moderationQueue.aria.bulkToolbar',
                {},
                { defaultValue: 'Bulk moderation actions' },
              ),
              'data-mol-id': 'moderation-queue-bulk-toolbar',
              class: cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
              ),
            },
            toolbar,
          ),
          h(
            'ul',
            {
              class: cm.cn(cm.stack(2)),
              'data-mol-id': 'moderation-queue-list',
              style: { listStyle: 'none', margin: '0px', padding: '0px' },
            },
            props.items.map(row),
          ),
        ],
      )
    }
  },
})
