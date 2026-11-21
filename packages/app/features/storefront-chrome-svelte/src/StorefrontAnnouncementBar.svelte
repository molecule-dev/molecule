<!--
  StorefrontAnnouncementBar: the Svelte counterpart of
  `@molecule/app-storefront-chrome-react`'s `StorefrontAnnouncementBar` — a
  slim promo bar above the storefront top nav. Same props (React names), same
  DOM for the same input; the message is a snippet or plain text.
-->
<script lang="ts">
  import { Link } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { StorefrontAnnouncementBarProps } from './types.js'

  let { message, cta, className }: StorefrontAnnouncementBarProps = $props()

  const cm = $derived(getClassMap())

  /** React's `{' '}` before the CTA link — a runtime text node the compiler keeps. */
  const SPACE = ' '
</script>

<div
  class={cm.cn(
    cm.textCenter,
    cm.sp('px', 4),
    cm.textSize('sm'),
    cm.fontWeight('medium'),
    cm.storefrontChromeAnnouncementBar,
    className,
  )}
>
  {#if typeof message === 'function'}{@render message()}{:else}{message}{/if}{#if cta}{SPACE}<Link
      class={cm.cn(cm.storefrontChromeAnnouncementLink)}
      data-mol-id="announcement-link"
      to={cta.to}
      >{#if typeof cta.label === 'function'}{@render cta.label()}{:else}{cta.label}{/if}</Link
    >{/if}
</div>
