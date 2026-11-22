/**
 * Auto-commit button — the commit bar's green commit action.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `AutoCommitBadge` (see that
 * file for the design notes): the same props (React names), the same DOM for
 * the same input, the same callbacks. A green "Commit" button that commits
 * immediately on click and morphs into the live "Auto-commit in Ns" label for
 * the debounce's final seconds; muted and inert while the agent works;
 * renders nothing when auto-commit is off. The component is a part (React
 * renders it inside ChatPanel without exporting it), so it lives in
 * `src/parts/`.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are the
 * placement and the tabular figures the ClassMap can't express. All
 * user-facing text goes through `t()`.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import type { AutoCommitState } from '@molecule/app-ide-panel-logic'
import {
  formatAutoCommitBadge,
  isAutoCommitCountdownVisible,
  isAutoCommitEnabled,
} from '@molecule/app-ide-panel-logic'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

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
export const AutoCommitBadge = defineComponent({
  name: 'AutoCommitBadge',
  props: {
    /** The countdown state (`intervalSeconds`, `remaining`). */
    state: { type: Object as PropType<AutoCommitState>, required: true },
    /** Commits immediately (the click's only effect, and only when not held). */
    onCommitNow: { type: Function as PropType<() => void>, required: true },
    /**
     * Held while the agent works: committing mid-turn is unsafe, so the click
     * is suppressed and the label stays "Commit".
     */
    disabled: { type: Boolean, required: false, default: false },
    /**
     * In normal flow (the commit bar's button slot) instead of floating over
     * the input area.
     */
    inline: { type: Boolean, required: false, default: false },
    /** Combined action/info label, e.g. "Commit 2 files". */
    label: { type: String as PropType<string | undefined>, required: false, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNodeChild => {
      if (!isAutoCommitEnabled(props.state)) return null
      // A held countdown is paused, not imminent — never show the countdown
      // label while disabled, only the plain "Commit".
      const showCountdown = !props.disabled && isAutoCommitCountdownVisible(props.state)
      const commitLabel = props.label ?? t('ide.chat.commit', undefined, { defaultValue: 'Commit' })
      const countdownLabel = t(
        props.label ? 'ide.chat.autoCommit.countedBadge' : 'ide.chat.autoCommit.badge',
        { commit: commitLabel, countdown: formatAutoCommitBadge(props.state) },
        {
          defaultValue: props.label
            ? '{{commit}} in {{countdown}}'
            : 'Auto-commit in {{countdown}}',
        },
      )
      return h(
        'button',
        {
          type: 'button',
          'data-mol-id': 'chat-autocommit-badge',
          disabled: props.disabled,
          // The manual commit button's exact treatment, recolored to the
          // SUCCESS semantic. The CVA owns hover/active/focus-visible AND the
          // disabled look, so the real `disabled` attribute is the whole
          // "muted + inert" story.
          class: cm.cn(
            cm.button({ variant: 'solid', color: 'success', size: 'xs' }),
            cm.touchTargetCompact,
          ),
          onClick: (event: MouseEvent) => {
            // Stop the click from bubbling to the commit-bar header's toggle —
            // clicking the button should only commit, not expand/collapse the
            // uncommitted-files bar (P5-06).
            event.stopPropagation()
            if (props.disabled) return
            props.onCommitNow()
          },
          'aria-label': showCountdown
            ? props.label
              ? countdownLabel
              : `${countdownLabel} — ${commitLabel}`
            : commitLabel,
          title: showCountdown && !props.label ? commitLabel : undefined,
          // ONLY what the ClassMap cannot express: where the button sits, and
          // the tabular figures that stop the countdown label jittering as it
          // ticks (the px is spelled — Vue does not add it for React).
          style: props.inline
            ? { position: 'relative', fontVariantNumeric: 'tabular-nums' }
            : {
                position: 'absolute',
                top: '-10px',
                right: '8px',
                zIndex: '50',
                fontVariantNumeric: 'tabular-nums',
              },
        },
        [showCountdown ? countdownLabel : commitLabel],
      )
    }
  },
})
