<!--
  VoteCluster: the Svelte counterpart of `@molecule/app-vote-cluster-react`'s
  `VoteCluster` — stacked up/down arrows with a score readout between them.
  Same props, same DOM for the same input; the toggling, controlled and
  disabled semantics are React's.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { inlineStyle } from './inline-style.js'
  import type { VoteClusterProps, VoteValue } from './types.js'

  let {
    score,
    myVote,
    defaultVote = 0,
    onVote,
    disabled,
    direction = 'vertical',
    ariaLabel,
    dataMolId,
    className,
  }: VoteClusterProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // svelte-ignore state_referenced_locally
  // React's useState seeds the vote from the `defaultVote` PROP VALUE once (a
  // later prop write never moves the selection), so capturing the initial
  // value is the point, not an oversight.
  let internal = $state<VoteValue>(defaultVote)

  const active = $derived(myVote !== undefined ? myVote : internal)
  const upPressed = $derived(active === 1)
  const downPressed = $derived(active === -1)

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so these re-run on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const groupLabel = $derived(
    ariaLabel ??
      t('vote-cluster.group', { score }, { defaultValue: 'Vote cluster, current score {{score}}' }),
  )
  const upLabel = $derived(
    upPressed
      ? t('vote-cluster.removeUpvote', {}, { defaultValue: 'Remove upvote' })
      : t('vote-cluster.upvote', {}, { defaultValue: 'Upvote' }),
  )
  const downLabel = $derived(
    downPressed
      ? t('vote-cluster.removeDownvote', {}, { defaultValue: 'Remove downvote' })
      : t('vote-cluster.downvote', {}, { defaultValue: 'Downvote' }),
  )
  const scoreLabel = $derived(
    t('vote-cluster.score', { score }, { defaultValue: 'Score: {{score}}' }),
  )

  const wrapperClass = $derived(
    cm.cn(
      direction === 'vertical'
        ? cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' })
        : cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
      className,
    ),
  )

  /** The declarations React spreads into both arrow buttons (the bare reset). */
  const buttonBase = $derived<Record<string, string>>({
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

  const upStyle = $derived<Record<string, string>>({
    ...buttonBase,
    color: upPressed ? 'var(--mol-color-primary)' : 'var(--mol-color-on-surface-variant)',
    transform: upPressed ? 'scale(1.1)' : 'scale(1)',
  })

  const downStyle = $derived<Record<string, string>>({
    ...buttonBase,
    color: downPressed ? 'var(--mol-color-info)' : 'var(--mol-color-on-surface-variant)',
    transform: downPressed ? 'scale(1.1)' : 'scale(1)',
  })

  const scoreStyle = $derived<Record<string, string>>({
    transition: 'color 150ms ease',
    color: upPressed
      ? 'var(--mol-color-primary)'
      : downPressed
        ? 'var(--mol-color-info)'
        : 'inherit',
    'font-variant-numeric': 'tabular-nums',
    'min-width': '2ch',
    'text-align': 'center',
  })

  /**
   * Emits the toggled vote (React's `emit`), updating the internal vote in
   * uncontrolled mode only.
   *
   * @param dir - Which arrow was clicked (`1` = up, `-1` = down).
   */
  function emit(dir: 1 | -1): void {
    if (disabled) return
    const next = active === dir ? 0 : dir
    if (myVote === undefined) internal = next
    onVote(next)
  }
</script>

<div class={wrapperClass} role="group" aria-label={groupLabel} data-mol-id={dataMolId}>
  <button
    type="button"
    onclick={() => emit(1)}
    {disabled}
    aria-label={upLabel}
    aria-pressed={upPressed}
    data-vote="up"
    data-mol-id="vote-cluster-up"
    class={cm.touchTarget}
    use:inlineStyle={upStyle}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      ><path d="M12 5l7 9H5l7-9z" fill="currentColor"></path></svg
    >
  </button>
  <span
    class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
    aria-label={scoreLabel}
    aria-live="polite"
    data-vote="score"
    use:inlineStyle={scoreStyle}>{score}</span
  >
  <button
    type="button"
    onclick={() => emit(-1)}
    {disabled}
    aria-label={downLabel}
    aria-pressed={downPressed}
    data-vote="down"
    data-mol-id="vote-cluster-down"
    class={cm.touchTarget}
    use:inlineStyle={downStyle}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      ><path d="M12 19l-7-9h14l-7 9z" fill="currentColor"></path></svg
    >
  </button>
</div>
