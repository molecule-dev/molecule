<!--
  Renders an SVG glyph looked up by name from the bonded `@molecule/app-icons`
  set — the IDE's consistent, high-quality icon source (no unicode glyphs, no
  ad-hoc inline `<path>`s).

  Svelte counterpart of `@molecule/app-ide-react`'s `Icon`: the same props
  (React names), the same DOM for the same input. The raw-markup branch writes
  the icon set's own SVG string onto the `<svg>` element's `innerHTML` (React's
  `dangerouslySetInnerHTML`) through the `svgMarkup` action, which — unlike
  `{@html}` — parses it in the SVG namespace without leftover anchor comments;
  the bond is the trust boundary. React's
  `...rest` spread is the `$props()` rest: every extra SVG/HTML attribute
  (`data-mol-id`, `aria-*`, `title`, `style`) is spread onto the root `<svg>`.
-->
<script module lang="ts">
  import type * as types from '../types.js'

  /** Re-exported from the plain-TS contract module (src/props.ts). */
  export type IconProps = types.IconProps

  /**
   * React prop names whose DOM attribute name differs and Svelte's spread
   * does not map (`htmlFor`, `className` — local copy of the UI kit's
   * `reactAttrs`, which this package does not depend on).
   */
  const REST_RENAMES: Record<string, string> = {
    htmlFor: 'for',
  }

  /**
   * Renames the React-only prop names inside a rest-prop bag so it can be
   * spread onto a DOM element with React's attribute semantics.
   *
   * @param rest - The rest props (already excluding destructured props).
   * @returns The props safe to spread onto a DOM element.
   */
  function reactAttrs(rest: Record<string, unknown>): Record<string, unknown> {
    let renamed = false
    for (const key of Object.keys(rest)) {
      if (REST_RENAMES[key]) {
        renamed = true
        break
      }
    }
    if (!renamed) return rest
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rest)) {
      out[REST_RENAMES[key] ?? key] = value
    }
    return out
  }

  /**
   * Strips `on*` event handlers out of a rest-prop bag, so they can be
   * attached through {@link spreadEvents} instead of the attribute spread
   * (Svelte's spread applies prop-derived event keys as attributes, not
   * listeners).
   *
   * @param rest - The rest props.
   * @returns The props without event handlers.
   */
  function withoutEvents(rest: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    let dropped = false
    for (const [key, value] of Object.entries(rest)) {
      if (key.startsWith('on') && typeof value === 'function') {
        dropped = true
        continue
      }
      out[key] = value
    }
    return dropped ? out : rest
  }

  /**
   * Attaches every `on*` function in a rest-prop bag as a DOM event listener
   * on the element (Svelte 5 actions), keeping them current across prop
   * updates and detaching them on destroy.
   *
   * @param node - The element.
   * @param props - The rest props.
   * @returns The action's update/destroy hooks.
   */
  const spreadEvents = (
    node: Element,
    props: Record<string, unknown>,
  ): {
    /** Re-attaches the listeners for a new rest-prop bag. */
    update: (next: Record<string, unknown>) => void
    /** Detaches every listener. */
    destroy: () => void
  } => {
    let current = props
    const attached: [string, EventListener][] = []
    const detach = (): void => {
      for (const [type, listener] of attached) node.removeEventListener(type, listener)
      attached.length = 0
    }
    const attach = (): void => {
      for (const [key, value] of Object.entries(current)) {
        if (key.startsWith('on') && typeof value === 'function') {
          const type = key.slice(2).toLowerCase()
          const listener = value as EventListener
          node.addEventListener(type, listener)
          attached.push([type, listener])
        }
      }
    }
    attach()
    return {
      /**
       * Re-attaches the listeners for a new rest-prop bag.
       * @param next - The next rest props.
       */
      update(next: Record<string, unknown>): void {
        detach()
        current = next
        attach()
      },
      destroy: detach,
    }
  }
</script>

<script lang="ts">
  import { getIcon } from '@molecule/app-icons'

  import { svgMarkup } from '../parts/svg-markup.js'

  let { name, size = 16, className, ...rest }: IconProps = $props()

  // The glyph is a pure function of the props (React's render): a `name`
  // change re-resolves it and the markup below re-renders.
  let icon = $derived(getIcon(name))
  const isStroked = $derived(!!icon.stroke)
</script>

{#if icon.svg}
  <svg
    width={size}
    height={size}
    viewBox={icon.viewBox || '0 0 20 20'}
    fill={icon.fill || 'none'}
    class={className}
    {...reactAttrs(withoutEvents(rest))}
    use:spreadEvents={rest}
    use:svgMarkup={icon.svg}
  ></svg>
{:else}
  <svg
    width={size}
    height={size}
    viewBox={icon.viewBox || '0 0 20 20'}
    fill={isStroked ? 'none' : icon.fill || 'currentColor'}
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
