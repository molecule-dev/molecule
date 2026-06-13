/**
 * Auto-commit countdown badge.
 *
 * A very compact, animated pill that shows the seconds remaining until the next
 * auto-commit (see `/autocommit`). It is purely informational — absolutely
 * positioned over the top-right of the input area so it never blocks typing —
 * and clicking it cancels auto-commit (equivalent to `/autocommit 0`). Renders
 * nothing while the countdown is disabled or paused.
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import type { AutoCommitState } from './chat-autocommit-utilities.js'
import { formatAutoCommitBadge, isAutoCommitArmed } from './chat-autocommit-utilities.js'

/** Keyframes for the badge's gentle pulse — animation isn't expressible via ClassMap. */
const PULSE_KEYFRAMES = `@keyframes molAutoCommitPulse {
  0%, 100% { opacity: 0.85; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.06); }
}`

/**
 * Renders the auto-commit countdown badge when the countdown is armed.
 *
 * @param root0 - Component props.
 * @param root0.state - The current auto-commit countdown state.
 * @param root0.onCancel - Called when the badge is clicked to cancel auto-commit.
 * @returns The rendered badge, or `null` when disabled/paused.
 */
export function AutoCommitBadge({
  state,
  onCancel,
}: {
  state: AutoCommitState
  onCancel: () => void
}): JSX.Element | null {
  const cm = getClassMap()
  if (!isAutoCommitArmed(state)) return null
  const countdown = formatAutoCommitBadge(state)
  const label = t(
    'ide.chat.autoCommit.badge',
    { countdown },
    { defaultValue: `Auto-commit in ${countdown}` },
  )
  const cancelLabel = t('ide.chat.autoCommit.cancel', undefined, {
    defaultValue: 'Cancel auto-commit',
  })
  return (
    <button
      type="button"
      data-mol-id="chat-autocommit-badge"
      onClick={onCancel}
      aria-label={`${label} — ${cancelLabel}`}
      title={cancelLabel}
      className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}
      style={{
        position: 'absolute',
        top: -10,
        right: 8,
        zIndex: 50,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '1px 7px',
        borderRadius: 999,
        border: '1px solid rgba(34,197,94,0.45)',
        background: 'rgba(34,197,94,0.14)',
        color: 'var(--mol-color-success, rgb(22,163,74))',
        cursor: 'pointer',
        lineHeight: 1.6,
        fontVariantNumeric: 'tabular-nums',
        animation: 'molAutoCommitPulse 1s ease-in-out infinite',
      }}
    >
      <style>{PULSE_KEYFRAMES}</style>
      <svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <circle cx="8" cy="8" r="4" />
      </svg>
      <span>{countdown}</span>
    </button>
  )
}

AutoCommitBadge.displayName = 'AutoCommitBadge'
