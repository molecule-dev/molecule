<!--
  Auto-commit button — the commit bar's green commit action.

  Svelte counterpart of `@molecule/app-ide-react`'s `AutoCommitBadge` (see
  that file for the design notes): the same props (React names), the same DOM
  for the same input, the same callbacks. A green "Commit" button that commits
  immediately on click and morphs into the live "Auto-commit in Ns" label for
  the debounce's final seconds; muted and inert while the agent works; renders
  nothing when auto-commit is off. The component is a part (React renders it
  inside ChatPanel without exporting it), so it lives in `src/parts/`.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are the
  placement and the tabular figures the ClassMap can't express, written as the
  exact attribute text React's style object serializes to. All user-facing
  text goes through `t()`.
-->
<script module lang="ts">
  import type { AutoCommitState } from '@molecule/app-ide-panel-logic'
  import {
    formatAutoCommitBadge,
    isAutoCommitCountdownVisible,
    isAutoCommitEnabled,
  } from '@molecule/app-ide-panel-logic'
  import { useTranslation, type UseTranslationResult } from '@molecule/app-svelte'
  import { getClassMap, type UIClassMap } from '@molecule/app-ui'

  import type * as types from '../types.js'

  /** Re-exported from the plain-TS contract module (src/types.ts). */
  export type AutoCommitBadgeProps = types.AutoCommitBadgeProps

  /**
   * A held countdown is paused, not imminent — never show the countdown label
   * while disabled, only the plain "Commit".
   *
   * @param state - The countdown state.
   * @param disabled - Whether the button is held while the agent works.
   * @returns Whether the live countdown label shows.
   */
  function showCountdown(state: AutoCommitState, disabled: boolean): boolean {
    return !disabled && isAutoCommitCountdownVisible(state)
  }

  /**
   * The button's plain commit label — the host's combined label when given,
   * otherwise the translated "Commit".
   *
   * @param t - The translation function from `useTranslation()`.
   * @param label - The host's combined label, when given.
   * @returns The label text.
   */
  function commitLabel(t: UseTranslationResult['t'], label: string | undefined): string {
    return label ?? t('ide.chat.commit', undefined, { defaultValue: 'Commit' })
  }

  /**
   * The live countdown label ("Auto-commit in Ns", or the combined label
   * counting down: "Commit 2 files in 2s").
   *
   * @param t - The translation function from `useTranslation()`.
   * @param state - The countdown state.
   * @param label - The host's combined label, when given.
   * @returns The countdown text.
   */
  function countdownLabel(
    t: UseTranslationResult['t'],
    state: AutoCommitState,
    label: string | undefined,
  ): string {
    const commit = commitLabel(t, label)
    return t(
      label ? 'ide.chat.autoCommit.countedBadge' : 'ide.chat.autoCommit.badge',
      { commit, countdown: formatAutoCommitBadge(state) },
      { defaultValue: label ? '{{commit}} in {{countdown}}' : 'Auto-commit in {{countdown}}' },
    )
  }

  /**
   * The button's `aria-label`: the countdown text while it runs (with the
   * plain commit label spelled out after an em dash when no combined label
   * names the action), otherwise the plain commit label.
   *
   * @param t - The translation function from `useTranslation()`.
   * @param state - The countdown state.
   * @param disabled - Whether the button is held while the agent works.
   * @param label - The host's combined label, when given.
   * @returns The accessible name.
   */
  function ariaLabel(
    t: UseTranslationResult['t'],
    state: AutoCommitState,
    disabled: boolean,
    label: string | undefined,
  ): string {
    const commit = commitLabel(t, label)
    if (!showCountdown(state, disabled)) return commit
    const countdown = countdownLabel(t, state, label)
    return label ? countdown : `${countdown} — ${commit}`
  }

  /**
   * The `title` tooltip: the plain commit action while the countdown runs and
   * no combined label names it; absent otherwise.
   *
   * @param t - The translation function from `useTranslation()`.
   * @param state - The countdown state.
   * @param disabled - Whether the button is held while the agent works.
   * @param label - The host's combined label, when given.
   * @returns The tooltip text, or null for no tooltip.
   */
  function titleText(
    t: UseTranslationResult['t'],
    state: AutoCommitState,
    disabled: boolean,
    label: string | undefined,
  ): string | null {
    return showCountdown(state, disabled) && !label ? commitLabel(t, label) : null
  }

  /**
   * ONLY what the ClassMap cannot express: where the button sits, and the
   * tabular figures that stop the countdown label jittering as it ticks — the
   * exact attribute text React's style object serializes to.
   *
   * @param inline - Whether the button sits in normal flow (the commit bar's
   *   button slot) instead of floating over the input area.
   * @returns The `style` attribute text.
   */
  function styleText(inline: boolean): string {
    return inline
      ? 'position: relative; font-variant-numeric: tabular-nums'
      : 'position: absolute; top: -10px; right: 8px; z-index: 50; font-variant-numeric: tabular-nums'
  }

  /**
   * The manual commit button's exact treatment, recolored to the SUCCESS
   * semantic. The CVA owns hover/active/focus-visible AND the disabled look,
   * so the real `disabled` attribute is the whole "muted + inert" story.
   *
   * @param cm - The active ClassMap.
   * @returns The resolved class string.
   */
  function badgeClass(cm: UIClassMap): string {
    return cm.cn(
      cm.button({ variant: 'solid', color: 'success', size: 'xs' }),
      cm.touchTargetCompact,
    )
  }
</script>

<script lang="ts">
  const { t } = useTranslation()
  const cm = getClassMap()

  let {
    state,
    onCommitNow,
    disabled = false,
    inline = false,
    label,
  }: AutoCommitBadgeProps = $props()

  /**
   * The click: commits now — but never while held (the agent is working), and
   * never letting the click bubble to the commit-bar header's toggle (P5-06).
   *
   * @param event - The DOM click event.
   */
  function handleClick(event: MouseEvent): void {
    event.stopPropagation()
    if (disabled) return
    onCommitNow()
  }
</script>

{#if isAutoCommitEnabled(state)}
  <button
    type="button"
    data-mol-id="chat-autocommit-badge"
    {disabled}
    class={badgeClass(cm)}
    onclick={handleClick}
    aria-label={ariaLabel(t, state, disabled, label)}
    title={titleText(t, state, disabled, label) ?? undefined}
    style={styleText(inline)}
  >
    {showCountdown(state, disabled) ? countdownLabel(t, state, label) : commitLabel(t, label)}
  </button>
{/if}
