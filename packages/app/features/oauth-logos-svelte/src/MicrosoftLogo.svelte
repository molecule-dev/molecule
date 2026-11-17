<!--
  MicrosoftLogo: the Microsoft 4-square brand mark. `mode='brand'`
  renders the four official squares; `mode='mono'` renders a flat 2×2
  grid in `currentColor`.
-->
<script lang="ts">
  import { untranslated } from './svg-attrs.js'
  import type { OAuthLogoProps } from './types.js'

  let {
    size = 20,
    className,
    mode = 'brand',
    ariaLabel = 'Microsoft',
    title,
  }: OAuthLogoProps = $props()

  const isMono = $derived(mode === 'mono')
</script>

<svg
  {...untranslated}
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  role={ariaLabel ? 'img' : undefined}
  aria-label={ariaLabel || undefined}
  aria-hidden={ariaLabel ? undefined : true}
  class={className}
>
  {#if title}<title>{title}</title>{/if}
  {#if isMono}
    <rect x="2" y="2" width="9" height="9" fill="currentColor" />
    <rect x="13" y="2" width="9" height="9" fill="currentColor" opacity="0.85" />
    <rect x="2" y="13" width="9" height="9" fill="currentColor" opacity="0.75" />
    <rect x="13" y="13" width="9" height="9" fill="currentColor" opacity="0.6" />
  {:else}
    <rect x="2" y="2" width="9" height="9" fill="#F25022" />
    <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
    <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
    <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
  {/if}
</svg>
