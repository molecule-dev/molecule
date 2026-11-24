<!--
  Internal: renders one icon from the bonded set exactly like the React
  package's `renderIcon` helper — decorative (aria-hidden, focusable="false"),
  sized by the caller's className, with the icon set's own viewBox/fill/stroke
  attributes and bare <path> children, or the set's prebuilt `icon.svg` markup
  drawn as the svg's inner content. Not exported from the package.
-->
<script lang="ts">
  import { getIcon } from '@molecule/app-icons'

  import type { IconGlyphProps } from '../types.js'

  let { name, className }: IconGlyphProps = $props()

  const icon = $derived(getIcon(name))
</script>

<!--
  One <svg> per shape rather than an {#if} inside one svg: a block inside the
  element would leave its comment anchors in `svg.innerHTML`, so the prebuilt
  glyph's markup would not be the svg's exact inner content. The raw embed is
  required: the icon bond is the trust boundary for its own SVG strings,
  exactly as React's dangerouslySetInnerHTML path relies on it.
-->
{#if icon.svg}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    class={className}
    viewBox={icon.viewBox || '0 0 20 20'}
    fill={icon.fill || 'currentColor'}
    stroke={icon.stroke}
    stroke-width={icon.strokeWidth}
    stroke-linecap={icon.strokeLinecap}
    stroke-linejoin={icon.strokeLinejoin}
  >
    {@html icon.svg}
  </svg>
{:else}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    class={className}
    viewBox={icon.viewBox || '0 0 20 20'}
    fill={icon.fill || 'currentColor'}
    stroke={icon.stroke}
    stroke-width={icon.strokeWidth}
    stroke-linecap={icon.strokeLinecap}
    stroke-linejoin={icon.strokeLinejoin}
  >
    {#each icon.paths as p, i (i)}
      <path d={p.d} fill-rule={p.fillRule} clip-rule={p.clipRule}></path>
    {/each}
  </svg>
{/if}
