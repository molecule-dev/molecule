<!--
  The model region's flag — Svelte counterpart of React's `RegionFlag`.

  Draws a region's rectangular flag from the bonded country-flag set at the
  given total height, falling back to the uppercase code as text when no flag
  set is bonded or the code has no flag. The bonded set's SVG ships with
  viewBox-only sizing, so the inner dimensions are injected here; the hairline
  border keeps light flag edges (e.g. the US stripes) from blending into a
  light surface.

  React's component is internal to its package (never exported), so this one is
  not part of the export surface either.
-->
<script module lang="ts">
  /** Props for {@link RegionFlag}. */
  export interface RegionFlagProps {
    /** The ISO/pseudo country code to look up. */
    code: string
    /** The flag's total height in pixels (border included). */
    height: number
  }
</script>

<script lang="ts">
  import { getCountryFlag } from '@molecule/app-country-flags'

  import Markup from '../../parts/Markup.svelte'

  let { code, height }: RegionFlagProps = $props()

  /**
   * The element's trusted markup, or `null` when the code has no bonded flag
   * (then the uppercase code renders as text). The bonded set's SVG is trusted
   * static artwork (a build-time dependency, never user input), so injecting it
   * verbatim is safe — React does the same through `dangerouslySetInnerHTML`.
   */
  const flagMarkup = $derived.by((): string | null => {
    const flag = getCountryFlag(code)
    if (!flag) return null
    const innerHeight = height - 2
    const innerWidth = Math.round(innerHeight * flag.aspectRatio)
    return flag.svg.replace(
      '<svg',
      `<svg width="${innerWidth}" height="${innerHeight}" style="display:block"`,
    )
  })
</script>

{#if flagMarkup === null}
  <span style="font-size: 10px; line-height: {height}px">{code.toUpperCase()}</span>
{:else}
  <span
    aria-hidden="true"
    style="display: inline-flex; border: 1px solid rgba(128,128,128,0.4); border-radius: 1px; overflow: hidden"
  >
    <Markup markup={flagMarkup} />
  </span>
{/if}
