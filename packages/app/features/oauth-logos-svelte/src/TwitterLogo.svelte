<!--
  TwitterLogo: the X (formerly Twitter) brand mark. Monochrome only per
  X brand guidelines; `mode` is ignored — always uses `currentColor`.

  Use either `TwitterLogo` or `XLogo` — they render the same SVG.
-->
<script lang="ts">
  import type { OAuthLogoProps } from './types.js'

  const PATH =
    'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'

  let { size = 20, className, ariaLabel = 'X (Twitter)', title }: OAuthLogoProps = $props()
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  role={ariaLabel ? 'img' : undefined}
  aria-label={ariaLabel || undefined}
  aria-hidden={ariaLabel ? undefined : true}
  class={className}
  fill="currentColor"
>
  {#if title}<title>{title}</title>{/if}
  <path d={PATH} />
</svg>
