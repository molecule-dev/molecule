/**
 * Auto-commit button — the commit bar's green commit action.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `AutoCommitBadge` (see
 * that file for the design notes): the same props (React names), the same DOM
 * for the same input, the same callbacks. A green "Commit" button that
 * commits immediately on click and morphs into the live "Auto-commit in Ns"
 * label for the debounce's final seconds; muted and inert while the agent
 * works; renders nothing when auto-commit is off. The component is a part
 * (React renders it inside ChatPanel without exporting it), so it lives in
 * `src/parts/`.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are the
 * placement and the tabular figures the ClassMap can't express, written the
 * way the DOM takes them here (kebab-case keys; the pixel values spell their
 * `px`, which Solid does not add for React). All user-facing text goes
 * through `t()`.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import type { AutoCommitState } from '@molecule/app-ide-panel-logic'
import {
  formatAutoCommitBadge,
  isAutoCommitCountdownVisible,
  isAutoCommitEnabled,
} from '@molecule/app-ide-panel-logic'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

/** Props for {@link AutoCommitBadge} — the React prop names, React's own contract. */
export interface AutoCommitBadgeProps {
  /** The countdown state (`intervalSeconds`, `remaining`). */
  state: AutoCommitState
  /** Commits immediately (the click's only effect, and only when not held). */
  onCommitNow: () => void
  /**
   * Held while the agent works (a turn is streaming / an auto-fix is pending):
   * committing mid-turn is unsafe, so the click is suppressed and the label
   * stays "Commit".
   */
  disabled?: boolean
  /**
   * In normal flow — e.g. occupying the commit bar's button slot — instead of
   * a floating button absolutely positioned over the input area.
   */
  inline?: boolean
  /** Combined action/info label, e.g. "Commit 2 files". */
  label?: string
}

/**
 * The commit bar's green auto-commit button: a "Commit" button that morphs
 * into the live countdown for the debounce's final seconds. Clicking it
 * commits now. Muted and inert while `disabled` (the agent is working).
 * Renders nothing when auto-commit is off.
 *
 * @param props - See {@link AutoCommitBadgeProps}.
 * @returns The rendered button, or `null` when auto-commit is disabled.
 */
export function AutoCommitBadge(props: AutoCommitBadgeProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()

  // A held countdown is paused, not imminent — never show the countdown label
  // while disabled, only the plain "Commit".
  const showCountdown = (): boolean => !props.disabled && isAutoCommitCountdownVisible(props.state)
  const commitLabel = (): string =>
    props.label ?? t('ide.chat.commit', undefined, { defaultValue: 'Commit' })
  const countdownLabel = (): string =>
    t(
      props.label ? 'ide.chat.autoCommit.countedBadge' : 'ide.chat.autoCommit.badge',
      { commit: commitLabel(), countdown: formatAutoCommitBadge(props.state) },
      {
        defaultValue: props.label ? '{{commit}} in {{countdown}}' : 'Auto-commit in {{countdown}}',
      },
    )
  const ariaLabel = (): string => {
    if (!showCountdown()) return commitLabel()
    return props.label ? countdownLabel() : `${countdownLabel()} — ${commitLabel()}`
  }
  // ONLY what the ClassMap cannot express: where the button sits, and the
  // tabular figures that stop the countdown label jittering as it ticks (the
  // px and the unitless z-index are spelled — Solid does not add them for
  // React).
  const style = (): Record<string, string> =>
    props.inline
      ? { position: 'relative', 'font-variant-numeric': 'tabular-nums' }
      : {
          position: 'absolute',
          top: '-10px',
          right: '8px',
          'z-index': '50',
          'font-variant-numeric': 'tabular-nums',
        }

  return (
    <>
      {isAutoCommitEnabled(props.state) ? (
        <button
          type="button"
          data-mol-id="chat-autocommit-badge"
          disabled={props.disabled}
          // The manual commit button's exact treatment, recolored to the
          // SUCCESS semantic. The CVA owns hover/active/focus-visible AND the
          // disabled look, so the real `disabled` attribute is the whole
          // "muted + inert" story.
          class={cm.cn(
            cm.button({ variant: 'solid', color: 'success', size: 'xs' }),
            cm.touchTargetCompact,
          )}
          onClick={(event: MouseEvent) => {
            // Stop the click from bubbling to the commit-bar header's toggle —
            // clicking the button should only commit, not expand/collapse the
            // uncommitted-files bar (P5-06).
            event.stopPropagation()
            if (props.disabled) return
            props.onCommitNow()
          }}
          aria-label={ariaLabel()}
          title={showCountdown() && !props.label ? commitLabel() : undefined}
          style={style()}
        >
          {showCountdown() ? countdownLabel() : commitLabel()}
        </button>
      ) : null}
    </>
  )
}
