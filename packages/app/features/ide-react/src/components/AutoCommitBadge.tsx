/**
 * Auto-commit countdown badge.
 *
 * Renders ONLY while auto-commit is armed (actively counting down) — it occupies
 * the commit bar's button slot and shows the seconds remaining until the next
 * auto-commit (see `chat-autocommit-utilities`). When auto-commit is disabled, or
 * enabled-but-paused (between commits / freshly restored on load, awaiting the
 * next file change), the badge renders nothing: there is no static "on" pill.
 *
 * Visually it is the blue `/commit` button, but green: the same compact
 * translucent-bordered, 6px rounded-rectangle button with the same fontSize /
 * padding / transition, recolored from the theme's success token (no hardcoded
 * green, no pulse animation). It is clickable, and clicking it cancels
 * auto-commit (equivalent to `/autocommit 0`).
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'

import type { AutoCommitState } from './chat-autocommit-utilities.js'
import { formatAutoCommitBadge, isAutoCommitArmed } from './chat-autocommit-utilities.js'

/** The theme's success color, with a sensible fallback. */
const SUCCESS_COLOR = 'var(--mol-color-success, #16a34a)'

/** A lighter success color for the hover state (mirrors the blue button's brighter hover). */
const SUCCESS_COLOR_BRIGHT = 'color-mix(in srgb, var(--mol-color-success, #16a34a) 70%, #ffffff)'

/** The theme's success color (with the same fallback) at a given opacity, via color-mix. */
function successTint(percent: number): string {
  return `color-mix(in srgb, var(--mol-color-success, #16a34a) ${percent}%, transparent)`
}

/**
 * Renders the live auto-commit countdown badge while armed, styled as a green
 * twin of the blue `/commit` button. Renders nothing when auto-commit is disabled
 * or paused.
 *
 * @param root0 - Component props.
 * @param root0.state - The current auto-commit countdown state.
 * @param root0.onCancel - Called when the badge is clicked to cancel auto-commit.
 * @param root0.inline - When true, render as an inline (relative) button that sits
 *   in normal flow — e.g. occupying the commit bar's button slot — instead of a
 *   floating button absolutely positioned over the input area.
 * @returns The rendered countdown badge, or `null` when not actively counting down.
 */
export function AutoCommitBadge({
  state,
  onCancel,
  inline = false,
}: {
  state: AutoCommitState
  onCancel: () => void
  inline?: boolean
}): JSX.Element | null {
  // Render ONLY while armed (counting down). Disabled or paused → nothing: the
  // static "Auto-commit on" pill is gone, so the badge is the live countdown only.
  if (!isAutoCommitArmed(state)) return null
  const countdown = formatAutoCommitBadge(state)
  const armedLabel = t(
    'ide.chat.autoCommit.badge',
    { countdown },
    { defaultValue: 'Auto-commit in {{countdown}}' },
  )
  const cancelLabel = t('ide.chat.autoCommit.cancel', undefined, {
    defaultValue: 'Cancel auto-commit',
  })
  return (
    <button
      type="button"
      data-mol-id="chat-autocommit-badge"
      onClick={(e) => {
        // Stop the click from bubbling to the commit-bar header's toggle
        // (setCommitBarExpanded) — clicking the countdown should only cancel
        // auto-commit, not expand/collapse the uncommitted-files bar (P5-06).
        // Mirrors the manual commit button, which already stops propagation.
        e.stopPropagation()
        onCancel()
      }}
      aria-label={`${armedLabel} — ${cancelLabel}`}
      title={cancelLabel}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = successTint(30)
        e.currentTarget.style.borderColor = successTint(65)
        e.currentTarget.style.color = SUCCESS_COLOR_BRIGHT
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = successTint(20)
        e.currentTarget.style.borderColor = successTint(40)
        e.currentTarget.style.color = SUCCESS_COLOR
      }}
      style={{
        // Inline (commit-bar slot) sits in normal flow; the default floats over
        // the input's top-right so it never blocks typing.
        ...(inline
          ? { position: 'relative' }
          : { position: 'absolute', top: -10, right: 8, zIndex: 50 }),
        // The blue /commit button, but green (theme success token, not literal green).
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        padding: '4px 10px',
        borderRadius: 6,
        border: `1px solid ${successTint(40)}`,
        background: successTint(20),
        color: SUCCESS_COLOR,
        cursor: 'pointer',
        fontVariantNumeric: 'tabular-nums',
        transition: 'background 100ms, border-color 100ms, color 100ms',
      }}
    >
      {countdown}
    </button>
  )
}

AutoCommitBadge.displayName = 'AutoCommitBadge'
