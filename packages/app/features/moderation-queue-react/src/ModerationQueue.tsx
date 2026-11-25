import type { JSX, ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'
import { Box, CheckField, Text } from '@molecule/app-ui-react/elements'

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
      <Box
        as="div"
        role="status"
        aria-live="polite"
        data-mol-id="moderation-queue-loading"
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('p', 4), className)}
      >
        <Text as="span">
          {t('moderationQueue.loading', {}, { defaultValue: 'Loading moderation queue…' })}
        </Text>
      </Box>
    )
  }

  if (items.length === 0) {
    return (
      <Box
        as="div"
        role="status"
        data-mol-id="moderation-queue-empty"
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('p', 6), className)}
      >
        {emptyState ?? (
          <Text as="span" className={cm.cn(cm.textSize('sm'))}>
            {t('moderationQueue.empty', {}, { defaultValue: 'No items awaiting moderation.' })}
          </Text>
        )}
      </Box>
    )
  }

  return (
    <Box
      as="div"
      role="region"
      aria-label={t('moderationQueue.aria.region', {}, { defaultValue: 'Moderation queue' })}
      data-mol-id="moderation-queue"
      className={cm.cn(cm.stack(2 as const), className)}
    >
      <Box
        as="div"
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
        <Box
          as="label"
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('sm'))}
          data-mol-id="moderation-queue-select-all-label"
        >
          <CheckField
            as="input"
            type="checkbox"
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleAll}
            data-mol-id="moderation-queue-select-all"
            aria-label={t('moderationQueue.aria.selectAll', {}, { defaultValue: 'Select all' })}
          />
          <Text as="span">
            {selectionCount > 0
              ? t(
                  'moderationQueue.selectedCount',
                  { count: selectionCount },
                  { defaultValue: '{{count}} selected' },
                )
              : t('moderationQueue.selectAll', {}, { defaultValue: 'Select all' })}
          </Text>
        </Box>
        {onBulkAction && (
          <Box
            as="div"
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
          </Box>
        )}
      </Box>

      <Box
        as="ul"
        className={cm.cn(cm.stack(2 as const))}
        data-mol-id="moderation-queue-list"
        webStyle={{ listStyle: 'none', margin: 0, padding: 0 }}
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
      </Box>
    </Box>
  )
}

interface ModerationQueueRowProps {
  item: ModerationItem
  checked: boolean
  /** Activates the row's checkbox; the change event itself carries nothing the row needs. */
  onToggle: () => void
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
    <Box
      as="li"
      data-mol-id="moderation-queue-row"
      data-mol-row-id={item.id}
      data-mol-kind={item.kind}
      data-mol-severity={item.severity ?? 'unspecified'}
      className={cm.cn(cm.flex({ align: 'start', gap: 'md' }), cm.sp('p', 3))}
    >
      <CheckField
        as="input"
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        data-mol-id="moderation-queue-row-select"
        aria-label={t('moderationQueue.aria.selectRow', {}, { defaultValue: 'Select item' })}
      />

      <Text
        as="span"
        aria-hidden="true"
        data-mol-id="moderation-queue-row-kind-icon"
        className={cm.cn(cm.textSize('lg'))}
      >
        {KIND_GLYPH[item.kind]}
      </Text>

      <Box as="div" className={cm.cn(cm.flex1, cm.stack(1 as const))}>
        <Box
          as="div"
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}
          data-mol-id="moderation-queue-row-meta"
        >
          <Text as="span" className={cm.fontWeight('semibold')}>
            {kindLabel(item.kind, t)}
          </Text>
          {item.severity && (
            <Text
              as="span"
              data-mol-id="moderation-queue-row-severity"
              className={cm.cn(cm.fontWeight('semibold'), sevToken[sevColor])}
            >
              {severityLabel(item.severity, t)}
            </Text>
          )}
          {item.reportedBy && (
            <Box as="span" data-mol-id="moderation-queue-row-reported-by">
              {t('moderationQueue.reportedBy', {}, { defaultValue: 'Reported by' })}{' '}
              <Box as="span" className={cm.fontWeight('semibold')}>
                {item.reportedBy}
              </Box>
            </Box>
          )}
          <Box as="span" data-mol-id="moderation-queue-row-reported-at">
            {item.reportedAt}
          </Box>
        </Box>

        <Box
          as="div"
          data-mol-id="moderation-queue-row-preview"
          className={cm.cn(cm.textSize('sm'))}
        >
          {item.preview}
        </Box>

        <Box
          as="div"
          data-mol-id="moderation-queue-row-reason"
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}
        >
          <Text as="span" className={cm.fontWeight('semibold')}>
            {t('moderationQueue.reason', {}, { defaultValue: 'Reason' })}:
          </Text>
          <Box as="span">{item.reason}</Box>
        </Box>
      </Box>

      <Box
        as="div"
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
      </Box>
    </Box>
  )
}

/**
 * The translation function shape `useTranslation()` returns. The label helpers
 * below take it as a parameter so every key this package requests is a
 * LITERAL: the i18n parity gate (`scripts/check-i18n-parity.js`) can only see
 * literal keys and refuses runtime-built ones — a missing key would otherwise
 * silently render English for every non-English user.
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
