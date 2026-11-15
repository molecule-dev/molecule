<!--
  ActivityFeedItem: the Svelte counterpart of
  `@molecule/app-activity-feed-react`'s `ActivityFeedItem` — one activity row:
  avatar (or icon) + actor / verb / target · timestamp, plus an optional body.
  Same props (React names), same DOM for the same input.

  The template is written so that a plain-text run is ONE text node: React
  serializes `" · 2m ago"` and `" commented on "` as single runs, and a run
  split across several text nodes loses kerning and shifts by a pixel. So each
  text run is a single interpolation, and only a snippet value splits it into
  `" · "` / node — exactly React's shape.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'
  import { Avatar } from '@molecule/app-ui-svelte'

  import type { ActivityFeedItemProps } from './types.js'

  let { item, className }: ActivityFeedItemProps = $props()

  const cm = $derived(getClassMap())

  /**
   * A single space text node. Svelte strips whitespace-only text at a block's
   * edges, so the spaces React renders around a node-valued verb are emitted as
   * this constant instead.
   */
  const SPACE = ' '

  /**
   * React's timestamp separator: a leading space, the middle dot, a space. Static
   * text would lose its leading space at the block's edge, so it is a value.
   */
  const DOT = ' · '

  /**
   * Whether a row field carries a snippet rather than plain text.
   *
   * @param value - The row field.
   * @returns True when the field renders as a snippet.
   */
  function isSnippet(value: unknown): value is Snippet {
    return typeof value === 'function'
  }

  /**
   * The text a field renders (React renders strings and numbers as text).
   *
   * @param value - The row field.
   * @returns The text, or `''` for an absent or snippet field.
   */
  function textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }
</script>

<article class={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), className)}>
  <div class={cm.shrink0}>
    {#if item.icon != null}{#if isSnippet(item.icon)}{@render item.icon()}{:else}{textOf(
          item.icon,
        )}{/if}{:else if item.avatarSrc}<Avatar src={item.avatarSrc} size="sm" />{/if}
  </div>
  <div class={cm.cn(cm.flex1, cm.stack(1))}>
    <div class={cm.cn(cm.textSize('sm'))}>
      <span class={cm.fontWeight('semibold')}
        >{#if isSnippet(item.actor)}{@render item.actor()}{:else}{textOf(item.actor)}{/if}</span
      >{#if isSnippet(item.verb)}{SPACE}{@render item.verb()}{SPACE}{:else}{` ${textOf(item.verb)} `}{/if}{#if item.target}<span
          class={cm.fontWeight('medium')}
          >{#if isSnippet(item.target)}{@render item.target()}{:else}{textOf(
              item.target,
            )}{/if}</span
        >{/if}<span class={cm.cn(cm.sp('ml', 2), cm.textSize('xs'))}
        >{#if isSnippet(item.timestamp)}{DOT}{@render item.timestamp()}{:else}{` · ${textOf(
            item.timestamp,
          )}`}{/if}</span
      >
    </div>
    {#if item.body}<div class={cm.textSize('sm')}>
        {#if isSnippet(item.body)}{@render item.body()}{:else}{textOf(item.body)}{/if}
      </div>{/if}
  </div>
</article>
