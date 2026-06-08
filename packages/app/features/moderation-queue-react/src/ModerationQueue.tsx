import type { ChangeEvent, JSX, ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

/**
 * Kind of content awaiting moderation. Drives the leading icon glyph
 * and the row's `data-mol-kind` attribute used by tests + AI agents.
 */
export type ModerationItemKind = 'post' | 'comment' | 'image' | 'message' | 'profile'

/**
 * Severity assigned to a flagged item, used to color the severity chip.
 * Maps to `ColorVariant`: low→info, medium→warning, high→error.
 */
export type ModerationItemSeverity = 'low' | 'medium' | 'high'

/**
 * One flagged item awaiting moderator review.
 */
export interface ModerationItem {
  /** Unique id used for selection + action callbacks. */
  id: string
  /** Content kind, drives icon + kind label. */
  kind: ModerationItemKind
  /** Pre-rendered preview slot (usually the offending content). */
  preview: ReactNode
  /** Reason the item was flagged. Free-form string or pre-rendered node. */
  reason: ReactNode
  /** Display name / id of the reporter, optional. */
  reportedBy?: ReactNode
  /** When the report was filed (string or pre-formatted node). */
  reportedAt: ReactNode
  /** Severity — colors the severity chip. */
  severity?: ModerationItemSeverity
}

/**
 * Bulk action a moderator can apply to selected ids.
 */
export type ModerationBulkAction = 'approve' | 'reject' | 'escalate' | 'mute'

/**
 * Props for the ModerationQueue component.
 */
export interface ModerationQueueProps {
  /** Flagged items to display. */
  items: ModerationItem[]
  /** Approve the item — content is allowed / kept. */
  onApprove: (id: string) => void
  /** Reject the item — content is removed / hidden. */
  onReject: (id: string) => void
  /** Escalate to a senior moderator / human review. Optional. */
  onEscalate?: (id: string) => void
  /** Mute the reporter / poster. Optional. */
  onMute?: (id: string) => void
  /** Apply an action to the currently-selected ids, if bulk select is in use. */
  onBulkAction?: (action: ModerationBulkAction, ids: string[]) => void
  /** Loading state — replaces the list with a spinner row. */
  loading?: boolean
  /** Empty-state slot rendered when `items` is empty and `loading` is false. */
  emptyState?: ReactNode
  /** Extra classes for the outer container. */
  className?: string
}

const KIND_GLYPH: Record<ModerationItemKind, string> = {
  post: '\u{1F4DD}',
  comment: '\u{1F4AC}',
  image: '\u{1F5BC}',
  message: '✉',
  profile: '\u{1F464}',
}

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
 * Moderation queue — a list of flagged items with kind icon, content
 * preview, reason chip, severity color, per-row action buttons
 * (approve / reject / escalate / mute), and a bulk-select toolbar
 * (select-all checkbox + apply-to-selected action buttons).
 *
 * All user-visible text comes from i18n keys in
 * `@molecule/app-locales-moderation-queue`. Styling is driven
 * exclusively through `getClassMap()`.
 *
 * @param props - Component props.
 * @returns A rendered moderation queue.
 */
export function ModerationQueue({
  items,
  onApprove,
  onReject,
  onEscalate,
  onMute,
  onBulkAction,
  loading,
  emptyState,
  className,
}: ModerationQueueProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  const allIds = useMemo(() => items.map((i) => i.id), [items])
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))
  const someSelected = !allSelected && allIds.some((id) => selected.has(id))

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (allIds.length > 0 && allIds.every((id) => prev.has(id))) return new Set()
      return new Set(allIds)
    })
  }, [allIds])

  const applyBulk = useCallback(
    (action: ModerationBulkAction) => {
      const ids = Array.from(selected).filter((id) => allIds.includes(id))
      if (ids.length === 0) return
      onBulkAction?.(action, ids)
      setSelected(new Set())
    },
    [allIds, onBulkAction, selected],
  )

  const selectionCount = allIds.filter((id) => selected.has(id)).length

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-mol-id="moderation-queue-loading"
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('p', 4), className)}
      >
        <span>
          {t('moderationQueue.loading', {}, { defaultValue: 'Loading moderation queue…' })}
        </span>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div
        role="status"
        data-mol-id="moderation-queue-empty"
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('p', 6), className)}
      >
        {emptyState ?? (
          <span className={cm.cn(cm.textSize('sm'))}>
            {t('moderationQueue.empty', {}, { defaultValue: 'No items awaiting moderation.' })}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      role="region"
      aria-label={t('moderationQueue.aria.region', {}, { defaultValue: 'Moderation queue' })}
      data-mol-id="moderation-queue"
      className={cm.cn(cm.stack(2 as const), className)}
    >
      <div
        role="toolbar"
        aria-label={t(
          'moderationQueue.aria.bulkToolbar',
          {},
          { defaultValue: 'Bulk moderation actions' },
        )}
        data-mol-id="moderation-queue-bulk-toolbar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('px', 3),
          cm.sp('py', 2),
        )}
      >
        <label
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('sm'))}
          data-mol-id="moderation-queue-select-all-label"
        >
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected
            }}
            onChange={toggleAll}
            data-mol-id="moderation-queue-select-all"
            aria-label={t('moderationQueue.aria.selectAll', {}, { defaultValue: 'Select all' })}
          />
          <span>
            {selectionCount > 0
              ? t(
                  'moderationQueue.selectedCount',
                  { count: selectionCount },
                  { defaultValue: `${selectionCount} selected` },
                )
              : t('moderationQueue.selectAll', {}, { defaultValue: 'Select all' })}
          </span>
        </label>
        {onBulkAction && (
          <div
            className={cm.flex({ align: 'center', gap: 'sm' })}
            data-mol-id="moderation-queue-bulk-actions"
          >
            <Button
              variant="ghost"
              size="sm"
              color="success"
              disabled={selectionCount === 0}
              onClick={() => applyBulk('approve')}
              data-mol-id="moderation-queue-bulk-approve"
            >
              {t('moderationQueue.bulk.approve', {}, { defaultValue: 'Approve' })}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              color="error"
              disabled={selectionCount === 0}
              onClick={() => applyBulk('reject')}
              data-mol-id="moderation-queue-bulk-reject"
            >
              {t('moderationQueue.bulk.reject', {}, { defaultValue: 'Reject' })}
            </Button>
            {onEscalate && (
              <Button
                variant="ghost"
                size="sm"
                color="warning"
                disabled={selectionCount === 0}
                onClick={() => applyBulk('escalate')}
                data-mol-id="moderation-queue-bulk-escalate"
              >
                {t('moderationQueue.bulk.escalate', {}, { defaultValue: 'Escalate' })}
              </Button>
            )}
            {onMute && (
              <Button
                variant="ghost"
                size="sm"
                color="secondary"
                disabled={selectionCount === 0}
                onClick={() => applyBulk('mute')}
                data-mol-id="moderation-queue-bulk-mute"
              >
                {t('moderationQueue.bulk.mute', {}, { defaultValue: 'Mute' })}
              </Button>
            )}
          </div>
        )}
      </div>

      <ul
        className={cm.cn(cm.stack(2 as const))}
        data-mol-id="moderation-queue-list"
        style={{ listStyle: 'none', margin: 0, padding: 0 }}
      >
        {items.map((item) => (
          <ModerationQueueRow
            key={item.id}
            item={item}
            checked={selected.has(item.id)}
            onToggle={() => toggleOne(item.id)}
            onApprove={onApprove}
            onReject={onReject}
            onEscalate={onEscalate}
            onMute={onMute}
          />
        ))}
      </ul>
    </div>
  )
}

interface ModerationQueueRowProps {
  item: ModerationItem
  checked: boolean
  onToggle: (event: ChangeEvent<HTMLInputElement>) => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onEscalate?: (id: string) => void
  onMute?: (id: string) => void
}

/**
 * Single moderation queue row. Internal — exported only to make
 * tests easier to write should consumers ever need a single row.
 *
 * @param props - Row props.
 * @returns A rendered row.
 */
function ModerationQueueRow({
  item,
  checked,
  onToggle,
  onApprove,
  onReject,
  onEscalate,
  onMute,
}: ModerationQueueRowProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const sevColor = severityColor(item.severity)
  // ClassMap exposes textPrimary/textSuccess/textWarning/textError as
  // semantic text-color tokens. There is no token for secondary/info,
  // so we fall back to textPrimary which is a safe brand-tinted default.
  const sevToken: Record<ColorVariant, string> = {
    primary: cm.textPrimary,
    secondary: cm.textPrimary,
    success: cm.textSuccess,
    warning: cm.textWarning,
    error: cm.textError,
    info: cm.textPrimary,
  }

  return (
    <li
      data-mol-id="moderation-queue-row"
      data-mol-row-id={item.id}
      data-mol-kind={item.kind}
      data-mol-severity={item.severity ?? 'unspecified'}
      className={cm.cn(cm.flex({ align: 'start', gap: 'md' }), cm.sp('p', 3))}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        data-mol-id="moderation-queue-row-select"
        aria-label={t('moderationQueue.aria.selectRow', {}, { defaultValue: 'Select item' })}
      />

      <span
        aria-hidden="true"
        data-mol-id="moderation-queue-row-kind-icon"
        className={cm.cn(cm.textSize('lg'))}
      >
        {KIND_GLYPH[item.kind]}
      </span>

      <div className={cm.cn(cm.flex1, cm.stack(1 as const))}>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}
          data-mol-id="moderation-queue-row-meta"
        >
          <span className={cm.fontWeight('semibold')}>
            {t(
              `moderationQueue.kind.${item.kind}`,
              {},
              { defaultValue: defaultKindLabel(item.kind) },
            )}
          </span>
          {item.severity && (
            <span
              data-mol-id="moderation-queue-row-severity"
              className={cm.cn(cm.fontWeight('semibold'), sevToken[sevColor])}
            >
              {t(
                `moderationQueue.severity.${item.severity}`,
                {},
                { defaultValue: defaultSeverityLabel(item.severity) },
              )}
            </span>
          )}
          {item.reportedBy && (
            <span data-mol-id="moderation-queue-row-reported-by">
              {t('moderationQueue.reportedBy', {}, { defaultValue: 'Reported by' })}{' '}
              <span className={cm.fontWeight('semibold')}>{item.reportedBy}</span>
            </span>
          )}
          <span data-mol-id="moderation-queue-row-reported-at">{item.reportedAt}</span>
        </div>

        <div data-mol-id="moderation-queue-row-preview" className={cm.cn(cm.textSize('sm'))}>
          {item.preview}
        </div>

        <div
          data-mol-id="moderation-queue-row-reason"
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}
        >
          <span className={cm.fontWeight('semibold')}>
            {t('moderationQueue.reason', {}, { defaultValue: 'Reason' })}:
          </span>
          <span>{item.reason}</span>
        </div>
      </div>

      <div
        className={cm.flex({ align: 'center', gap: 'sm' })}
        data-mol-id="moderation-queue-row-actions"
      >
        <Button
          size="sm"
          variant="ghost"
          color="success"
          onClick={() => onApprove(item.id)}
          data-mol-id="moderation-queue-row-approve"
          aria-label={t('moderationQueue.aria.approve', {}, { defaultValue: 'Approve' })}
        >
          {t('moderationQueue.action.approve', {}, { defaultValue: 'Approve' })}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          color="error"
          onClick={() => onReject(item.id)}
          data-mol-id="moderation-queue-row-reject"
          aria-label={t('moderationQueue.aria.reject', {}, { defaultValue: 'Reject' })}
        >
          {t('moderationQueue.action.reject', {}, { defaultValue: 'Reject' })}
        </Button>
        {onEscalate && (
          <Button
            size="sm"
            variant="ghost"
            color="warning"
            onClick={() => onEscalate(item.id)}
            data-mol-id="moderation-queue-row-escalate"
            aria-label={t('moderationQueue.aria.escalate', {}, { defaultValue: 'Escalate' })}
          >
            {t('moderationQueue.action.escalate', {}, { defaultValue: 'Escalate' })}
          </Button>
        )}
        {onMute && (
          <Button
            size="sm"
            variant="ghost"
            color="secondary"
            onClick={() => onMute(item.id)}
            data-mol-id="moderation-queue-row-mute"
            aria-label={t('moderationQueue.aria.mute', {}, { defaultValue: 'Mute' })}
          >
            {t('moderationQueue.action.mute', {}, { defaultValue: 'Mute' })}
          </Button>
        )}
      </div>
    </li>
  )
}

/**
 * English fallback for kind labels (used when no translation is present).
 *
 * @param kind - Item kind.
 * @returns English label.
 */
function defaultKindLabel(kind: ModerationItemKind): string {
  switch (kind) {
    case 'post':
      return 'Post'
    case 'comment':
      return 'Comment'
    case 'image':
      return 'Image'
    case 'message':
      return 'Message'
    case 'profile':
      return 'Profile'
  }
}

/**
 * English fallback for severity labels.
 *
 * @param severity - Severity bucket.
 * @returns English label.
 */
function defaultSeverityLabel(severity: ModerationItemSeverity): string {
  switch (severity) {
    case 'low':
      return 'Low'
    case 'medium':
      return 'Medium'
    case 'high':
      return 'High'
  }
}
