<!--
  SectionDivider: the Svelte counterpart of `@molecule/app-section-divider-react`'s
  `SectionDivider` — a horizontal divider with an optional centered label.
  Same props, same DOM for the same input; the label is the `children`
  snippet. `align` positions it: `'center'` (default) draws lines on both
  sides, `'start'` / `'end'` put the label at that edge with a single line
  filling the rest. The lines' declarations are written through the CSSOM
  (`style:` directives), exactly where React's inline style lands, so they
  inherit the local text color (`currentColor`) at 20% opacity in both
  themes.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { SectionDividerProps } from './types.js'

  let { children, align = 'center', className }: SectionDividerProps = $props()

  const cm = $derived(getClassMap())

  /** One flanking line's declarations: `currentColor` so it inherits the text color. */
  const lineColor = '1px solid currentColor'
  const lineOpacity = '0.2'
</script>

<div
  role="separator"
  aria-orientation="horizontal"
  class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)}
>
  {#if align === 'center' || align === 'end'}
    <span
      class={cm.flex1}
      aria-hidden="true"
      style:border-top={lineColor}
      style:opacity={lineOpacity}
    ></span>
  {/if}
  {#if children}
    <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{@render children?.()}</span>
  {/if}
  {#if align === 'center' || align === 'start'}
    <span
      class={cm.flex1}
      aria-hidden="true"
      style:border-top={lineColor}
      style:opacity={lineOpacity}
    ></span>
  {/if}
</div>
