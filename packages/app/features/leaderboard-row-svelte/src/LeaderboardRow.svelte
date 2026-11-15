<!--
  LeaderboardRow: the Svelte counterpart of
  `@molecule/app-leaderboard-row-react`'s `LeaderboardRow` — rank + avatar +
  name + score with an optional rank-delta indicator, subtitle and
  current-user highlight. Same props (React names), same DOM for the same
  input; `name`, `score` and `subtitle` carry the React node props as
  snippets or plain strings.
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
  const displayName = $derived(typeof name === 'string' ? name : 'Player')
  const rankText = $derived(MEDAL[rank] ?? `#${rank}`)
  const deltaColor = $derived(rankDelta !== undefined && rankDelta > 0 ? '#22c55e' : '#ef4444')
</script>

<!-- React's row takes `onClick` with no keyboard handler or role (a
  documented gap of the React package — see its module JSDoc); the DOM must
  match, so the a11y warnings are carried knowingly. -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class={cm.cn(
    cm.flex({ align: 'center', gap: 'sm' }),
    cm.sp('px', 3),
    cm.sp('py', 2),
    onClick ? cm.cursorPointer : undefined,
    className,
  )}
  style={isMe ? 'background: rgba(96,165,250,0.1); border-radius: 8px' : undefined}
  onclick={onClick}
>
  <span class={cm.cn(cm.shrink0, cm.fontWeight('bold'), cm.textCenter)} style="min-width: 32px"
    >{rankText}</span
  >
  <Avatar src={avatarSrc} alt={displayName} name={displayName} size="sm" />
  <div class={cm.cn(cm.flex1, cm.stack(0))}>
    <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
      {#if typeof name === 'function'}{@render name()}{:else}{name}{/if}
    </span>
    <!-- React's `{subtitle && …}`: a falsy subtitle renders nothing. -->
    {#if subtitle}
      <span class={cm.textSize('xs')}>
        {#if typeof subtitle === 'function'}{@render subtitle()}{:else}{subtitle}{/if}
      </span>
    {/if}
  </div>
  <!-- React's `rankDelta !== undefined && rankDelta !== 0`: a zero delta renders nothing. -->
  {#if rankDelta !== undefined && rankDelta !== 0}
    <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))} style={`color: ${deltaColor}`}
      >{rankDelta > 0 ? '▲' : '▼'} {Math.abs(rankDelta)}</span
    >
  {/if}
  <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
    {#if typeof score === 'function'}{@render score()}{:else}{score}{/if}
  </span>
</div>
