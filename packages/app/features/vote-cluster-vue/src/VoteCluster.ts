/**
 * Vue vote cluster — stacked up/down arrows with a score readout between them.
 *
 * Vue counterpart of `@molecule/app-vote-cluster-react`'s `VoteCluster` — the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @module
 */

import { computed, defineComponent, h, type PropType, ref, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { VoteClusterDirection, VoteClusterProps, VoteValue } from './types.js'

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
 * The arrow glyphs' shared SVG attributes (React's `width`, `height`,
 * `viewBox`, `aria-hidden`, `focusable`).
 *
 * @param size - Pixel size of the arrow.
 * @returns The SVG attributes.
 */
const arrowAttrs = (size: number): Record<string, string | number> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  'aria-hidden': 'true',
  focusable: 'false',
})

/**
 * The rendered up-arrow SVG.
 *
 * @param size - Pixel size of the arrow.
 * @returns The up-arrow VNode.
 */
const upArrow = (size: number): VNode =>
  h('svg', arrowAttrs(size), [h('path', { d: 'M12 5l7 9H5l7-9z', fill: 'currentColor' })])

/**
 * The rendered down-arrow SVG, mirroring {@link upArrow}.
 *
 * @param size - Pixel size of the arrow.
 * @returns The down-arrow VNode.
 */
const downArrow = (size: number): VNode =>
  h('svg', arrowAttrs(size), [h('path', { d: 'M12 19l-7-9h14l-7 9z', fill: 'currentColor' })])

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
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'color 150ms ease, transform 150ms ease',
  lineHeight: '0',
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
  fontVariantNumeric: 'tabular-nums',
  minWidth: '2ch',
  textAlign: 'center',
})

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
 * @returns The vote cluster component.
 */
export const VoteCluster = defineComponent({
  name: 'VoteCluster',
  props: {
    score: { type: Number, required: true },
    myVote: Number as PropType<VoteValue>,
    defaultVote: { type: Number as PropType<VoteValue>, default: 0 },
    onVote: {
      type: Function as PropType<VoteClusterProps['onVote']>,
      required: true,
    },
    disabled: Boolean,
    direction: {
      type: String as PropType<VoteClusterDirection>,
      default: 'vertical',
    },
    ariaLabel: String,
    dataMolId: String,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    // React's useState: the initial value is read once; a later `defaultVote`
    // prop change does not move the selection.
    const internal = ref<VoteValue>(props.defaultVote)
    const controlled = computed(() => props.myVote !== undefined)
    const active = computed<VoteValue>(() =>
      props.myVote !== undefined ? props.myVote : internal.value,
    )

    /**
     * Emits the toggled vote (React's `emit`), updating the internal vote in
     * uncontrolled mode only.
     *
     * @param dir - Which arrow was clicked (`1` = up, `-1` = down).
     */
    const emit = (dir: 1 | -1): void => {
      if (props.disabled) return
      const next = nextVote(active.value, dir)
      if (!controlled.value) internal.value = next
      props.onVote(next)
    }

    return (): VNode => {
      const upPressed = active.value === 1
      const downPressed = active.value === -1

      const groupLabel =
        props.ariaLabel ??
        t(
          'vote-cluster.group',
          { score: props.score },
          { defaultValue: 'Vote cluster, current score {{score}}' },
        )
      const upLabel = upPressed
        ? t('vote-cluster.removeUpvote', {}, { defaultValue: 'Remove upvote' })
        : t('vote-cluster.upvote', {}, { defaultValue: 'Upvote' })
      const downLabel = downPressed
        ? t('vote-cluster.removeDownvote', {}, { defaultValue: 'Remove downvote' })
        : t('vote-cluster.downvote', {}, { defaultValue: 'Downvote' })
      const scoreLabel = t(
        'vote-cluster.score',
        { score: props.score },
        { defaultValue: 'Score: {{score}}' },
      )

      const wrapperClass = cm.cn(
        props.direction === 'vertical'
          ? cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' })
          : cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
        props.className,
      )

      const disabled = props.disabled === true

      return h(
        'div',
        {
          class: wrapperClass,
          role: 'group',
          'aria-label': groupLabel,
          'data-mol-id': props.dataMolId,
        },
        [
          h(
            'button',
            {
              type: 'button',
              onClick: () => emit(1),
              disabled,
              'aria-label': upLabel,
              'aria-pressed': upPressed ? 'true' : 'false',
              'data-vote': 'up',
              'data-mol-id': 'vote-cluster-up',
              class: cm.touchTarget,
              style: arrowStyle(disabled, upPressed, 'var(--mol-color-primary)'),
            },
            [upArrow(20)],
          ),
          h(
            'span',
            {
              class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')),
              'aria-label': scoreLabel,
              'aria-live': 'polite',
              'data-vote': 'score',
              style: scoreStyle(upPressed, downPressed),
            },
            String(props.score),
          ),
          h(
            'button',
            {
              type: 'button',
              onClick: () => emit(-1),
              disabled,
              'aria-label': downLabel,
              'aria-pressed': downPressed ? 'true' : 'false',
              'data-vote': 'down',
              'data-mol-id': 'vote-cluster-down',
              class: cm.touchTarget,
              style: arrowStyle(disabled, downPressed, 'var(--mol-color-info)'),
            },
            [downArrow(20)],
          ),
        ],
      )
    }
  },
})
