import type { CSSProperties } from 'react'
import { useCallback, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
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
 * Inline arrow glyphs. We use SVG paths rather than icon-font glyphs so the
 * cluster works in environments without an icon font (and so the active
 * state can drive `currentColor`).
 *
 * @param root0 - Component props.
 * @param root0.size - Pixel size of the arrow.
 * @returns The rendered up-arrow SVG.
 */
function UpArrow({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable={false}>
      <path d="M12 5l7 9H5l7-9z" fill="currentColor" />
    </svg>
  )
}

/**
 * @param root0 - Component props.
 * @param root0.size - Pixel size of the arrow.
 * @returns The rendered down-arrow SVG.
 */
function DownArrow({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable={false}>
      <path d="M12 19l-7-9h14l-7 9z" fill="currentColor" />
    </svg>
  )
}

/**
 * Reddit/HN-style stacked up-arrow + score + down-arrow cluster.
 *
 * Renders two arrow buttons with a score readout between them. Click
 * semantics follow link-aggregator convention (toggling the same arrow
 * clears the vote; clicking the opposite arrow swaps it). The score is
 * **not** mutated by the cluster — parents own that calculation and pass
 * the new score back via `score` after handling `onVote`.
 *
 * Styling is delegated entirely to `getClassMap()`. The active arrow is
 * painted via a CSS custom property (`--mol-color-*`) — no Tailwind /
 * raw class strings escape this component.
 *
 * @param props - Component props.
 * @returns The rendered cluster element.
 */
export function VoteCluster({
  score,
  myVote,
  defaultVote = 0,
  onVote,
  disabled,
  direction = 'vertical',
  ariaLabel,
  dataMolId,
  className,
}: VoteClusterProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  // Controlled if `myVote` is supplied, otherwise uncontrolled.
  const controlled = myVote !== undefined
  const [internal, setInternal] = useState<VoteValue>(defaultVote)
  const active: VoteValue = controlled ? (myVote as VoteValue) : internal

  const emit = useCallback(
    (dir: 1 | -1) => {
      if (disabled) return
      const next = nextVote(active, dir)
      if (!controlled) setInternal(next)
      onVote(next)
    },
    [active, controlled, disabled, onVote],
  )

  const upPressed = active === 1
  const downPressed = active === -1

  const groupLabel =
    ariaLabel ??
    t('vote-cluster.group', { score }, { defaultValue: 'Vote cluster, current score {{score}}' })
  const upLabel = upPressed
    ? t('vote-cluster.removeUpvote', {}, { defaultValue: 'Remove upvote' })
    : t('vote-cluster.upvote', {}, { defaultValue: 'Upvote' })
  const downLabel = downPressed
    ? t('vote-cluster.removeDownvote', {}, { defaultValue: 'Remove downvote' })
    : t('vote-cluster.downvote', {}, { defaultValue: 'Downvote' })
  const scoreLabel = t('vote-cluster.score', { score }, { defaultValue: 'Score: {{score}}' })

  // Inline styles cover only what ClassMap can't express: the bare
  // button reset + per-state `color` driven by `--mol-color-*` tokens
  // and the smooth color transition on vote change.
  const buttonBase: CSSProperties = {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 150ms ease, transform 150ms ease',
    lineHeight: 0,
  }

  const upStyle: CSSProperties = {
    ...buttonBase,
    color: upPressed ? 'var(--mol-color-primary)' : 'var(--mol-color-on-surface-variant)',
    transform: upPressed ? 'scale(1.1)' : 'scale(1)',
  }
  const downStyle: CSSProperties = {
    ...buttonBase,
    color: downPressed ? 'var(--mol-color-info)' : 'var(--mol-color-on-surface-variant)',
    transform: downPressed ? 'scale(1.1)' : 'scale(1)',
  }

  const scoreStyle: CSSProperties = {
    transition: 'color 150ms ease',
    color: upPressed
      ? 'var(--mol-color-primary)'
      : downPressed
        ? 'var(--mol-color-info)'
        : 'inherit',
    fontVariantNumeric: 'tabular-nums',
    minWidth: '2ch',
    textAlign: 'center',
  }

  const wrapperClass = cm.cn(
    direction === 'vertical'
      ? cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' })
      : cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
    className,
  )

  return (
    <div className={wrapperClass} role="group" aria-label={groupLabel} data-mol-id={dataMolId}>
      <button
        type="button"
        onClick={() => emit(1)}
        disabled={disabled}
        aria-label={upLabel}
        aria-pressed={upPressed}
        data-vote="up"
        style={upStyle}
      >
        <UpArrow size={20} />
      </button>
      <span
        className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
        aria-label={scoreLabel}
        aria-live="polite"
        data-vote="score"
        style={scoreStyle}
      >
        {score}
      </span>
      <button
        type="button"
        onClick={() => emit(-1)}
        disabled={disabled}
        aria-label={downLabel}
        aria-pressed={downPressed}
        data-vote="down"
        style={downStyle}
      >
        <DownArrow size={20} />
      </button>
    </div>
  )
}
