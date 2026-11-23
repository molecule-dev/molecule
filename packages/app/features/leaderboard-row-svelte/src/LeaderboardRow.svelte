<!--
  LeaderboardRow: the Svelte counterpart of
  `@molecule/app-leaderboard-row-react`'s `LeaderboardRow` — rank + avatar +
  name + score with an optional rank-delta indicator, subtitle and
  current-user highlight. Same props (React names), same DOM for the same
  input; `name`, `score` and `subtitle` carry the React node props as
  snippets or plain strings. With `onClick` the row is a focusable button in
  the a11y tree and Enter / Space activate it, matching native button
  keyboard semantics.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { Avatar } from '@molecule/app-ui-svelte'

  import type { LeaderboardRowProps } from './types.js'

  let {
    rank,
    name,
    avatarSrc,
    score,
    rankDelta,
    subtitle,
    isMe,
    onClick,
    className,
  }: LeaderboardRowProps = $props()

  /** The medal emoji rendered in place of the rank for the top three. */
  const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

  const cm = $derived(getClassMap())
  const clickable = $derived(typeof onClick === 'function')
  const displayName = $derived(typeof name === 'string' ? name : 'Player')
  const rankText = $derived(MEDAL[rank] ?? `#${rank}`)
  const deltaTone = $derived(rankDelta !== undefined && rankDelta > 0 ? 'success' : 'error')

  // When the row is interactive, Enter / Space activate it (React's
  // `handleKeyDown`): preventDefault, then the click handler with no event.

  /**
   * Keydown handler for the interactive row (React's `handleKeyDown`).
   *
   * @param event - The keydown.
   */
  function handleKeyDown(event: KeyboardEvent): void {
    if (!onClick) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }
</script>

<!-- The row's `tabindex` is set only while `role="button"` is (React renders
  both together, only for a clickable row) — the WAI-ARIA button pattern.
  Svelte's a11y checker cannot see through the bound `role` expression and
  evaluates the element as a non-interactive div, so it warns about the
  tabindex it only carries as a button. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class={cm.cn(
    cm.flex({ align: 'center', gap: 'sm' }),
    cm.sp('px', 3),
    cm.sp('py', 2),
    clickable ? cm.cursorPointer : undefined,
    isMe ? cm.bgTone('info', { subtle: true }) : undefined,
    className,
  )}
  style={isMe ? 'border-radius: 8px' : undefined}
  role={clickable ? 'button' : undefined}
  tabindex={clickable ? 0 : undefined}
  onclick={onClick}
  onkeydown={handleKeyDown}
>
  <span class={cm.cn(cm.shrink0, cm.fontWeight('bold'), cm.textCenter)} style="min-width: 32px"
    >{rankText}</span
  >
  <Avatar src={avatarSrc} alt={displayName} name={displayName} size="sm" />
  <div class={cm.cn(cm.flex1, cm.stack(0))}>
    <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
      {#if typeof name === 'function'}{@render name?.()}{:else}{name}{/if}
    </span>
    <!-- React's `{subtitle && …}`: a falsy subtitle renders nothing. -->
    {#if subtitle}
      <span class={cm.textSize('xs')}>
        {#if typeof subtitle === 'function'}{@render subtitle?.()}{:else}{subtitle}{/if}
      </span>
    {/if}
  </div>
  <!-- React's `rankDelta !== undefined && rankDelta !== 0`: a zero delta renders nothing. -->
  {#if rankDelta !== undefined && rankDelta !== 0}
    <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.textTone(deltaTone))}
      >{rankDelta > 0 ? '▲' : '▼'} {Math.abs(rankDelta)}</span
    >
  {/if}
  <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
    {#if typeof score === 'function'}{@render score?.()}{:else}{score}{/if}
  </span>
</div>
