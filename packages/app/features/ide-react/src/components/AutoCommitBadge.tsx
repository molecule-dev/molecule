/**
 * Auto-commit button — the commit bar's green commit action.
 *
 * Renders whenever auto-commit is ENABLED, occupying the commit bar's button
 * slot (the blue manual `/commit` button remains for auto-commit-off projects
 * and for the committing/committed status states). Two looks, one button:
 *
 *  - **Idle / quiet phase** — a green "Commit" button. Clicking it commits
 *    immediately, exactly like the blue button.
 *  - **Final countdown** — once the debounce enters its last
 *    `AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS` seconds it morphs into the live
 *    "Auto-commit in Ns" label (still click-to-commit-now). The countdown is
 *    deliberately NOT shown for the whole debounce: a bare "12s" pill told
 *    users nothing — the button is always a labeled commit action, and the
 *    countdown only takes over right before the auto-commit fires.
 *
 * **Disabled while the agent is working.** Committing mid-turn is unsafe — it
 * would stage a half-written tree and races the chat stream's own writes to the
 * conversation. So while a turn is streaming (or an auto-fix follow-up is
 * pending) the button is shown muted and inert: the commit bar still tracks the
 * changing files live, but the commit itself waits until the turn finishes. In
 * that state it always reads "Commit" (a held countdown is paused, not
 * imminent), never the countdown label.
 *
 * Renders nothing when auto-commit is off (`/autocommit 0`).
 *
 * Visually it is the blue `/commit` button, but green: the same compact
 * translucent-bordered, 6px rounded-rectangle button with the same fontSize /
 * padding / transition, recolored from the theme's success token (no hardcoded
 * green, no pulse animation).
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'

import type { AutoCommitState } from './chat-autocommit-utilities.js'
import {
  formatAutoCommitBadge,
  isAutoCommitCountdownVisible,
  isAutoCommitEnabled,
} from './chat-autocommit-utilities.js'

/** The theme's success color, with a sensible fallback. */
const SUCCESS_COLOR = 'var(--mol-color-success, #16a34a)'

/** A lighter success color for the hover state (mirrors the blue button's brighter hover). */
const SUCCESS_COLOR_BRIGHT = 'color-mix(in srgb, var(--mol-color-success, #16a34a) 70%, #ffffff)'

/** The theme's success color (with the same fallback) at a given opacity, via color-mix. */
function successTint(percent: number): string {
  return `color-mix(in srgb, var(--mol-color-success, #16a34a) ${percent}%, transparent)`
}

/**
 * Renders the green auto-commit button while auto-commit is enabled: a "Commit"
 * button that morphs into the live countdown for the debounce's final seconds.
 * Clicking it commits now. Muted and inert while `disabled` (the agent is
 * working). Renders nothing when auto-commit is off.
 *
 * @param root0 - Component props.
 * @param root0.state - The current auto-commit countdown state.
 * @param root0.onCommitNow - Called when the button is clicked to commit immediately.
 * @param root0.disabled - When true, the button is muted and non-interactive
 *   (a turn is streaming / an auto-fix is pending): committing mid-turn is
 *   unsafe, so the click is suppressed and the label stays "Commit".
 * @param root0.inline - When true, render as an inline (relative) button that sits
 *   in normal flow — e.g. occupying the commit bar's button slot — instead of a
 *   floating button absolutely positioned over the input area.
 * @returns The rendered button, or `null` when auto-commit is disabled.
 */
export function AutoCommitBadge({
  state,
  onCommitNow,
  disabled = false,
  inline = false,
}: {
  state: AutoCommitState
  onCommitNow: () => void
  disabled?: boolean
  inline?: boolean
}): JSX.Element | null {
  if (!isAutoCommitEnabled(state)) return null
  // A held countdown is paused, not imminent — never show the countdown label
  // while disabled, only the plain "Commit".
  const showCountdown = !disabled && isAutoCommitCountdownVisible(state)
  const commitLabel = t('ide.chat.commit', undefined, { defaultValue: 'Commit' })
  const countdownLabel = t(
    'ide.chat.autoCommit.badge',
    { countdown: formatAutoCommitBadge(state) },
    { defaultValue: 'Auto-commit in {{countdown}}' },
  )
  return (
    <button
      type="button"
      data-mol-id="chat-autocommit-badge"
      disabled={disabled}
      onClick={(e) => {
        // Stop the click from bubbling to the commit-bar header's toggle
        // (setCommitBarExpanded) — clicking the button should only commit,
        // not expand/collapse the uncommitted-files bar (P5-06).
        // Mirrors the manual commit button, which already stops propagation.
        e.stopPropagation()
        if (disabled) return
        onCommitNow()
      }}
      aria-label={showCountdown ? `${countdownLabel} — ${commitLabel}` : commitLabel}
      title={showCountdown ? commitLabel : undefined}
      onMouseEnter={(e) => {
        if (disabled) return
        e.currentTarget.style.background = successTint(30)
        e.currentTarget.style.borderColor = successTint(65)
        e.currentTarget.style.color = SUCCESS_COLOR_BRIGHT
      }}
      onMouseLeave={(e) => {
        if (disabled) return
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
        // Muted + inert while the agent is working; committing mid-turn is unsafe.
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontVariantNumeric: 'tabular-nums',
        transition: 'background 100ms, border-color 100ms, color 100ms',
      }}
    >
      {showCountdown ? countdownLabel : commitLabel}
    </button>
  )
}

AutoCommitBadge.displayName = 'AutoCommitBadge'
