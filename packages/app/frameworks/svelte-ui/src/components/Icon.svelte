<!--
  Renders an SVG glyph looked up by `name` from the bonded icon set.
  Handles pre-rendered SVG markup (`icon.svg`) and structured paths, forwards
  every extra HTML/SVG attribute to the root <svg>, and is decorative by
  default: with no aria-label / aria-labelledby / role it renders
  aria-hidden + focusable="false" so screen readers skip it.
-->
<script lang="ts">
  import { getIcon, type IconData } from '@molecule/app-icons'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import type { IconProps } from '../types.js'
  let { name, size = 20, className, ...rest }: IconProps = $props()

  let icon: IconData | undefined = $derived.by(() => {
    try {
      return getIcon(name)
    } catch (error) {
      console.warn(`Icon: no bonded glyph for "${name}" — rendering a placeholder.`, error)
      return undefined
    }
  })
  const decorative = $derived(
    rest['aria-label'] == null && rest['aria-labelledby'] == null && rest.role == null,
  )
  const isStroked = $derived(!!icon?.stroke)
</script>

{#if icon === undefined}
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    class={className}
    aria-hidden={decorative ? 'true' : undefined}
    focusable={decorative ? 'false' : undefined}
    {...reactAttrs(withoutEvents(rest))}
    use:spreadEvents={rest}
  >
    <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.15"></circle>
  </svg>
{:else if icon.svg}
  <svg
    width={size}
    height={size}
    viewBox={icon.viewBox || '0 0 20 20'}
    fill={icon.fill || 'none'}
    class={className}
    aria-hidden={decorative ? 'true' : undefined}
    focusable={decorative ? 'false' : undefined}
    {...reactAttrs(withoutEvents(rest))}
    use:spreadEvents={rest}
  >
    <!-- Raw embed is required: the icon bond is the trust boundary for its own SVG markup, exactly as React's dangerouslySetInnerHTML path relies on it. -->
    {@html icon.svg}
  </svg>
{:else}
  <svg
    width={size}
    height={size}
    viewBox={icon.viewBox || '0 0 20 20'}
    fill={isStroked ? 'none' : icon.fill || 'currentColor'}
    aria-hidden={decorative ? 'true' : undefined}
    focusable={decorative ? 'false' : undefined}
    stroke={icon.stroke}
    stroke-width={icon.strokeWidth}
    stroke-linecap={icon.strokeLinecap}
    stroke-linejoin={icon.strokeLinejoin}
    class={className}
    {...reactAttrs(withoutEvents(rest))}
    use:spreadEvents={rest}
  >
    {#each icon.paths as p, i (i)}
      <path d={p.d} fill={p.fill} fill-rule={p.fillRule} clip-rule={p.clipRule} opacity={p.opacity}
      ></path>
    {/each}
  </svg>
{/if}
