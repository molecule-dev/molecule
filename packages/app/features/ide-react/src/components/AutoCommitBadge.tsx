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
 * Visually it IS the manual `/commit` button, but green: both render the design
 * system's `cm.button({ variant: 'solid', size: 'xs' })` — identical height,
 * radius, padding and type scale — and differ only in the semantic colour
 * (`success` here, `primary` there). Nothing about the box model is written by
 * hand, so the two can never drift apart again, and neither can drift from the
 * tests bar's button one strip above. No hardcoded green, no pulse animation.
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import type { AutoCommitState } from './chat-autocommit-utilities.js'
import {
  formatAutoCommitBadge,
  isAutoCommitCountdownVisible,
  isAutoCommitEnabled,
} from './chat-autocommit-utilities.js'

/**
 * Renders the green auto-commit button while auto-commit is enabled: a "Commit"
 * button that morphs into the live countdown for the debounce's final seconds.
 * Clicking it commits now. Muted and inert while `disabled` (the agent is
 * working). Renders nothing when auto-commit is off.
 *
 * @param props - Component props.
 *   (a turn is streaming / an auto-fix is pending): committing mid-turn is
 *   unsafe, so the click is suppressed and the label stays "Commit".
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
  const cm = getClassMap()
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
      // The manual commit button's exact treatment, recolored to the SUCCESS
      // semantic. The CVA owns hover/active/focus-visible AND the disabled look
      // (`disabled:opacity-50 disabled:pointer-events-none`), so the real
      // `disabled` attribute above is the whole "muted + inert" story — no
      // hand-written hover handlers, no cursor/opacity overrides.
      className={cm.cn(
        cm.button({ variant: 'solid', color: 'success', size: 'xs' }),
        cm.touchTargetCompact,
      )}
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
      // ONLY what the ClassMap cannot express: where the button sits, and the
      // tabular figures that stop the countdown label jittering as it ticks.
      style={{
        // Inline (commit-bar slot) sits in normal flow; the default floats over
        // the input's top-right so it never blocks typing.
        ...(inline
          ? { position: 'relative' }
          : { position: 'absolute', top: -10, right: 8, zIndex: 50 }),
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {showCountdown ? countdownLabel : commitLabel}
    </button>
  )
}

AutoCommitBadge.displayName = 'AutoCommitBadge'
