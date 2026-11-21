/**
 * Solid vote cluster — stacked up/down arrows with a score readout between them.
 *
 * Solid counterpart of `@molecule/app-vote-cluster-react`'s `VoteCluster` — the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @module
 */

import { type Component, createSignal } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { VoteClusterProps, VoteValue } from './types.js'

/**
 * Computes the next vote value for a click on the up or down arrow.
 *
 * Toggle rules:
 * - Up clicked while currently up → `0` (clear).
 * - Up clicked otherwise → `1`.
 * - Down clicked while currently down → `0` (clear).
 * - Down clicked otherwise → `-1`.
 *
 * @param current - The viewer's current vote.
 * @param direction - Which arrow was clicked (`1` = up, `-1` = down).
 * @returns The next vote value to emit.
 */
function nextVote(current: VoteValue, direction: 1 | -1): VoteValue {
  if (current === direction) return 0
  return direction
}

/**
 * Marks an arrow SVG unfocusable, as React's `focusable={false}` attribute does.
 *
 * @param el - The rendered SVG element.
 */
function notFocusable(el: SVGSVGElement): void {
  el.setAttribute('focusable', 'false')
}

/**
 * The bare button reset React spreads into both arrow buttons.
 *
 * @param disabled - Whether the cluster is disabled.
 * @returns The style declarations React sets on a button.
 */
const buttonBase = (disabled: boolean): Record<string, string> => ({
  background: 'none',
  border: 'none',
  padding: '0px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? '0.5' : '1',
  display: 'inline-flex',
  'align-items': 'center',
  'justify-content': 'center',
  transition: 'color 150ms ease, transform 150ms ease',
  'line-height': '0',
})

/**
 * An arrow button's inline style: the reset plus its pressed colour and scale.
 *
 * @param disabled - Whether the cluster is disabled.
 * @param pressed - Whether this arrow is the active vote.
 * @param activeColor - The CSS colour the pressed arrow draws in.
 * @returns The style declarations for the button.
 */
const arrowStyle = (
  disabled: boolean,
  pressed: boolean,
  activeColor: string,
): Record<string, string> => ({
  ...buttonBase(disabled),
  color: pressed ? activeColor : 'var(--mol-color-on-surface-variant)',
  transform: pressed ? 'scale(1.1)' : 'scale(1)',
})

/**
 * The score readout's inline style.
 *
 * @param upPressed - Whether the up arrow is active.
 * @param downPressed - Whether the down arrow is active.
 * @returns The style declarations for the score span.
 */
const scoreStyle = (upPressed: boolean, downPressed: boolean): Record<string, string> => ({
  transition: 'color 150ms ease',
  color: upPressed ? 'var(--mol-color-primary)' : downPressed ? 'var(--mol-color-info)' : 'inherit',
  'font-variant-numeric': 'tabular-nums',
  'min-width': '2ch',
  'text-align': 'center',
})

/**
 * The rendered up-arrow SVG.
 *
 * @param props - The arrow's props.
 * @param props.size - Pixel size of the arrow.
 * @returns The up-arrow element.
 */
const UpArrow: Component<{ size: number }> = (props) => (
  <svg
    width={props.size}
    height={props.size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    ref={notFocusable}
  >
    <path d="M12 5l7 9H5l7-9z" fill="currentColor" />
  </svg>
)

/**
 * The rendered down-arrow SVG, mirroring {@link UpArrow}.
 *
 * @param props - The arrow's props.
 * @param props.size - Pixel size of the arrow.
 * @returns The down-arrow element.
 */
const DownArrow: Component<{ size: number }> = (props) => (
  <svg
    width={props.size}
    height={props.size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    ref={notFocusable}
  >
    <path d="M12 19l-7-9h14l-7 9z" fill="currentColor" />
  </svg>
)

/**
 * Reddit/HN-style stacked up-arrow + score + down-arrow cluster.
 *
 * Renders two arrow buttons with a score readout between them. Click
 * semantics follow link-aggregator convention (toggling the same arrow
 * clears the vote; clicking the opposite arrow swaps it). The score is
 * **not** mutated by the cluster — parents own that calculation and pass
 * the new score back via `score` after handling `onVote`.
 *
 * Styling is delegated entirely to `getClassMap()`; the active arrow is
 * painted via a CSS custom property (`--mol-color-*`).
 *
 * @param props - Component props (see {@link VoteClusterProps}).
 * @returns The rendered vote cluster.
 */
export const VoteCluster: Component<VoteClusterProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  // React's useState: the initial value is read once; a later `defaultVote`
  // prop change does not move the selection.
  const [internal, setInternal] = createSignal<VoteValue>(props.defaultVote ?? 0)

  const controlled = (): boolean => props.myVote !== undefined
  const active = (): VoteValue => (props.myVote !== undefined ? props.myVote : internal())
  const upPressed = (): boolean => active() === 1
  const downPressed = (): boolean => active() === -1

  /**
   * Emits the toggled vote (React's `emit`), updating the internal vote in
   * uncontrolled mode only.
   *
   * @param dir - Which arrow was clicked (`1` = up, `-1` = down).
   */
  const emit = (dir: 1 | -1): void => {
    if (props.disabled) return
    const next = nextVote(active(), dir)
    if (!controlled()) setInternal(next)
    props.onVote(next)
  }

  const groupLabel = (): string =>
    props.ariaLabel ??
    t(
      'vote-cluster.group',
      { score: props.score },
      { defaultValue: 'Vote cluster, current score {{score}}' },
    )
  const upLabel = (): string =>
    upPressed()
      ? t('vote-cluster.removeUpvote', {}, { defaultValue: 'Remove upvote' })
      : t('vote-cluster.upvote', {}, { defaultValue: 'Upvote' })
  const downLabel = (): string =>
    downPressed()
      ? t('vote-cluster.removeDownvote', {}, { defaultValue: 'Remove downvote' })
      : t('vote-cluster.downvote', {}, { defaultValue: 'Downvote' })
  const scoreLabel = (): string =>
    t('vote-cluster.score', { score: props.score }, { defaultValue: 'Score: {{score}}' })

  const wrapperClass = (): string =>
    cm.cn(
      props.direction === 'horizontal'
        ? cm.flex({ align: 'center', justify: 'center', gap: 'xs' })
        : cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' }),
      props.className,
    )

  const isDisabled = (): boolean => props.disabled === true

  return (
    <div
      class={wrapperClass()}
      role="group"
      aria-label={groupLabel()}
      data-mol-id={props.dataMolId}
    >
      <button
        type="button"
        onClick={() => emit(1)}
        disabled={disabledAttr(isDisabled())}
        aria-label={upLabel()}
        aria-pressed={upPressed() ? 'true' : 'false'}
        data-vote="up"
        data-mol-id="vote-cluster-up"
        class={cm.touchTarget}
        style={arrowStyle(isDisabled(), upPressed(), 'var(--mol-color-primary)')}
      >
        <UpArrow size={20} />
      </button>
      <span
        class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
        aria-label={scoreLabel()}
        aria-live="polite"
        data-vote="score"
        style={scoreStyle(upPressed(), downPressed())}
      >
        {props.score}
      </span>
      <button
        type="button"
        onClick={() => emit(-1)}
        disabled={disabledAttr(isDisabled())}
        aria-label={downLabel()}
        aria-pressed={downPressed() ? 'true' : 'false'}
        data-vote="down"
        data-mol-id="vote-cluster-down"
        class={cm.touchTarget}
        style={arrowStyle(isDisabled(), downPressed(), 'var(--mol-color-info)')}
      >
        <DownArrow size={20} />
      </button>
    </div>
  )
}

/**
 * Renders React's `disabled` attribute: present when the cluster is disabled
 * and absent otherwise.
 *
 * @param disabled - Whether the cluster is disabled.
 * @returns The attribute value (`''` renders the bare attribute) or undefined.
 */
function disabledAttr(disabled: boolean): boolean | undefined {
  return disabled ? true : undefined
}
