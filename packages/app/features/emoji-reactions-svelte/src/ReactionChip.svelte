<!--
  ReactionChip: one toggle chip of EmojiReactions — the chip alone, rendered by
  `EmojiReactions` and not exported. Owns its own hover/focus state so it can
  reveal a custom tooltip (when `renderTooltip` is supplied) without a shared
  parent listener, exactly like the React package's internal `ReactionChip`.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { EmojiReaction } from './types.js'

  let {
    reaction,
    onToggle,
    renderTooltip,
  }: {
    reaction: EmojiReaction
    onToggle?: (emoji: string) => void
    renderTooltip?: Snippet<[EmojiReaction]>
  } = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  let tipOpen = $state(false)

  const hasTip = $derived(renderTooltip != null)
  const tipId = $derived(hasTip ? `emoji-reaction-tip-${reaction.emoji}` : undefined)
  const defaultTitle = $derived(
    t('reactions.count', { count: reaction.count }, { defaultValue: '{{count}} reactions' }),
  )
  const tipStyle = $derived(
    `bottom: calc(100% + 4px); left: 0px; pointer-events: none; opacity: ${
      tipOpen ? 1 : 0
    }; visibility: ${tipOpen ? 'visible' : 'hidden'}`,
  )
</script>

<span class={cm.position('relative')} style="display: inline-block">
  <button
    type="button"
    data-mol-id="emoji-reaction"
    onclick={() => onToggle?.(reaction.emoji)}
    onmouseenter={() => (tipOpen = true)}
    onmouseleave={() => (tipOpen = false)}
    onfocus={() => (tipOpen = true)}
    onblur={() => (tipOpen = false)}
    aria-pressed={reaction.reactedByMe}
    aria-describedby={tipId}
    title={hasTip ? undefined : defaultTitle}
    class={cm.cn(
      cm.flex({ align: 'center', gap: 'xs' }),
      cm.sp('px', 2),
      cm.sp('py', 1),
      cm.textSize('xs'),
      cm.roundedFull,
    )}
    style={reaction.reactedByMe
      ? 'outline: 1px solid currentColor; outline-offset: -1px'
      : undefined}
  >
    <span aria-hidden="true">{reaction.emoji}</span>
    <span>{reaction.count}</span>
  </button>
  {#if hasTip && renderTooltip}
    <span
      role="tooltip"
      id={tipId}
      class={cm.cn(cm.tooltip(), cm.position('absolute'))}
      style={tipStyle}
    >
      {@render renderTooltip?.(reaction)}
    </span>
  {/if}
</span>
