<!--
  EmojiReactions: the Svelte counterpart of
  `@molecule/app-emoji-reactions-react`'s `EmojiReactions` — one toggle chip
  per existing reaction plus an optional "+" quick-pick popover. Same props
  (React names), same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import ReactionChip from './ReactionChip.svelte'
  import type { EmojiReactionsProps } from './types.js'

  /** Quick picks offered when the caller does not pass `quickPicks`. */
  const DEFAULT_PICKS = ['👍', '❤️', '🎉', '😄', '😢', '🙏']

  let { reactions, onToggle, quickPicks, onAdd, className, renderTooltip }: EmojiReactionsProps =
    $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  let pickerOpen = $state(false)

  const picks = $derived(quickPicks ?? DEFAULT_PICKS)
  const addLabel = $derived(t('reactions.add', {}, { defaultValue: 'Add reaction' }))
  const pickerStyle =
    'top: calc(100% + 4px); left: 0px; z-index: 50; background: var(--mol-color-surface, #fff); border: 1px solid var(--mol-color-border, rgba(128,128,128,0.35)); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.12)'
</script>

<div class={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }), className)}>
  {#each reactions as reaction (reaction.emoji)}
    <ReactionChip {reaction} {onToggle} {renderTooltip} />
  {/each}
  {#if onAdd}
    <span class={cm.position('relative')} style="display: inline-block">
      <button
        type="button"
        data-mol-id="emoji-reaction-add"
        onclick={() => (pickerOpen = !pickerOpen)}
        aria-label={addLabel}
        class={cm.cn(
          cm.sp('px', 2),
          cm.sp('py', 1),
          cm.textSize('xs'),
          cm.cursorPointer,
          cm.touchTargetCompact,
        )}
      >
        +
      </button>
      {#if pickerOpen}
        <span
          class={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('p', 1),
            cm.position('absolute'),
          )}
          style={pickerStyle}
        >
          {#each picks as emoji (emoji)}
            <button
              type="button"
              data-mol-id="emoji-reaction-pick"
              onclick={() => {
                onAdd?.(emoji)
                pickerOpen = false
              }}
              aria-label={emoji}
              class={cm.cn(
                cm.sp('px', 1),
                cm.sp('py', 1),
                cm.textSize('base'),
                cm.cursorPointer,
                cm.touchTargetCompact,
              )}
            >
              {emoji}
            </button>
          {/each}
        </span>
      {/if}
    </span>
  {/if}
</div>
