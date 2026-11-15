<!--
  AvatarWithPresence: the Svelte counterpart of
  `@molecule/app-presence-indicator-react`'s `AvatarWithPresence` — wraps any
  avatar/image and overlays a presence dot at a corner. Same props (React
  names), same DOM for the same input; the decorated child is the default
  snippet (`children`).
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import PresenceDot from './PresenceDot.svelte'
  import type { AvatarWithPresenceProps } from './types.js'

  let {
    children,
    status,
    corner = 'bottom-right',
    dotSize,
    className,
  }: AvatarWithPresenceProps = $props()

  const cm = $derived(getClassMap())
</script>

<!-- The children and the dot are adjacent with no template whitespace between
     them: React renders the two child nodes with nothing in between, so any
     literal whitespace here would show up as an extra text node. -->
<span class={cm.cn(cm.position('relative'), className)} style="display: inline-block"
  >{#if children}{@render children()}{/if}{#if status}<PresenceDot
      {status}
      position="overlay"
      {corner}
      size={dotSize}
    />{/if}</span
>
