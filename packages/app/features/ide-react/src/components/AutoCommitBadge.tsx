/**
 * Auto-commit status badge.
 *
 * A very compact pill, absolutely positioned over the top-right of the input
 * area so it never blocks typing, that reflects the `/autocommit` countdown
 * (see `chat-autocommit-utilities`). It has three states:
 *
 *  - **armed** (counting down): an animated, success-tinted pill showing the
 *    seconds remaining until the next auto-commit;
 *  - **enabled but paused** (after a commit, or freshly restored from the
 *    persisted project setting on load — awaiting the next file change): a
 *    persistent, muted "Auto-commit on" pill, so the user always knows the
 *    cadence is active even between commits;
 *  - **disabled**: nothing.
 *
 * It is purely informational, and clicking it cancels auto-commit (equivalent
 * to `/autocommit 0`).
 *
 * Colors are derived from the theme's success token (no hardcoded green), and
 * the armed pulse is disabled under `prefers-reduced-motion` (an inline
 * `animation` cannot be media-queried, so the keyframes + the reduced-motion
 * override are injected via a `<style>` and gated on a `data-mol-pulse`
 * attribute selector — class names are reserved for ClassMap bonds).
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import type { AutoCommitState } from './chat-autocommit-utilities.js'
import {
  formatAutoCommitBadge,
  isAutoCommitArmed,
  isAutoCommitEnabled,
} from './chat-autocommit-utilities.js'

/**
 * Keyframes for the armed badge's gentle pulse plus a `prefers-reduced-motion`
 * guard that turns it off. Targeted by the badge's own `data-mol-id` +
 * `data-mol-pulse="true"` (an attribute selector, NOT a CSS class — class names
 * belong only to ClassMap bonds) so the animation can be media-queried, which an
 * inline `animation` style cannot.
 */
const PULSE_STYLE = `@keyframes molAutoCommitPulse {
  0%, 100% { opacity: 0.85; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.06); }
}
[data-mol-id="chat-autocommit-badge"][data-mol-pulse="true"] {
  animation: molAutoCommitPulse 1s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  [data-mol-id="chat-autocommit-badge"][data-mol-pulse="true"] { animation: none; }
}`

/** The theme's success color (with a sensible fallback) at a given opacity. */
function successTint(percent: number): string {
  return `color-mix(in srgb, var(--mol-color-success, #16a34a) ${percent}%, transparent)`
}

/** A muted, neutral tint derived from the theme's text color, for the paused pill. */
function mutedTint(percent: number): string {
  return `color-mix(in srgb, var(--mol-color-text, #333333) ${percent}%, transparent)`
}

/**
 * Renders the auto-commit status badge whenever auto-commit is enabled — the
 * live countdown while armed, or a persistent muted "on" indicator while paused
 * between commits.
 *
 * @param root0 - Component props.
 * @param root0.state - The current auto-commit countdown state.
 * @param root0.onCancel - Called when the badge is clicked to cancel auto-commit.
 * @returns The rendered badge, or `null` when auto-commit is disabled.
 */
export function AutoCommitBadge({
  state,
  onCancel,
}: {
  state: AutoCommitState
  onCancel: () => void
}): JSX.Element | null {
  const cm = getClassMap()
  // Disabled → render nothing. Otherwise the pill is always present: a live
  // countdown while armed, or a muted "Auto-commit on" indicator while paused.
  if (!isAutoCommitEnabled(state)) return null
  const armed = isAutoCommitArmed(state)
  const countdown = formatAutoCommitBadge(state)
  const onLabel = t('ide.chat.autoCommit.on', undefined, { defaultValue: 'Auto-commit on' })
  const armedLabel = t(
    'ide.chat.autoCommit.badge',
    { countdown },
    { defaultValue: 'Auto-commit in {{countdown}}' },
  )
  const cancelLabel = t('ide.chat.autoCommit.cancel', undefined, {
    defaultValue: 'Cancel auto-commit',
  })
  const label = armed ? armedLabel : onLabel
  return (
    <button
      type="button"
      data-mol-id="chat-autocommit-badge"
      data-mol-pulse={armed ? 'true' : 'false'}
      onClick={onCancel}
      aria-label={`${label} — ${cancelLabel}`}
      title={cancelLabel}
      className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), !armed && cm.textMuted)}
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
        border: `1px solid ${armed ? successTint(45) : mutedTint(22)}`,
        background: armed ? successTint(14) : mutedTint(6),
        // Armed: success-colored text. Paused: leave color to cm.textMuted (do
        // not set it inline, or it would override the ClassMap muted color).
        ...(armed ? { color: 'var(--mol-color-success, #16a34a)' } : {}),
        cursor: 'pointer',
        lineHeight: 1.6,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <style>{PULSE_STYLE}</style>
      {/* A success-colored dot ties the paused "on" pill to the active feature
          even while the surrounding text is muted. */}
      <svg
        width="9"
        height="9"
        viewBox="0 0 16 16"
        fill={armed ? 'currentColor' : 'var(--mol-color-success, #16a34a)'}
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="4" />
      </svg>
      <span>{armed ? countdown : onLabel}</span>
    </button>
  )
}

AutoCommitBadge.displayName = 'AutoCommitBadge'
