<!--
  CollapsibleSection: the Svelte counterpart of
  `@molecule/app-collapsible-section-react`'s `CollapsibleSection` — expandable
  section with a clickable heading. Same props, same DOM for the same input;
  `title`, `badge` and `actions` are snippets (or plain strings), the body is
  the `children` snippet, and the heading level picks the rendered tag.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { CollapsibleSectionProps } from './types.js'

  let {
    title,
    children,
    expanded,
    defaultExpanded = false,
    onExpandedChange,
    badge,
    actions,
    level = 3,
    className,
  }: CollapsibleSectionProps = $props()

  const cm = $derived(getClassMap())
  // React's `useState(defaultExpanded)`: the initial value only — a later
  // `defaultExpanded` write must not reset state the user changed.
  // svelte-ignore state_referenced_locally
  let internal = $state(defaultExpanded)
  /** React's `expanded ?? internal`. */
  const isOpen = $derived(expanded ?? internal)
  /** React's `h${level}`. */
  const heading = $derived(`h${level}`)

  /** Toggles expansion state, updating internal state when uncontrolled. */
  function toggle(): void {
    const next = !isOpen
    if (expanded === undefined) internal = next
    onExpandedChange?.(next)
  }
</script>

<section class={cm.cn(cm.stack(2), className)}>
  <svelte:element this={heading}
    ><span
      class={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        cm.w('full'),
        cm.sp('py', 2),
        cm.textSize('sm'),
        cm.fontWeight('semibold'),
      )}
      ><button
        type="button"
        onclick={toggle}
        aria-expanded={isOpen ? 'true' : 'false'}
        class={cm.flex({ align: 'center', gap: 'sm' })}
        ><span aria-hidden="true">{isOpen ? '▾' : '▸'}</span><span
          >{#if typeof title === 'function'}{@render title()}{:else if title !== undefined}{title}{/if}</span
        >{#if badge}{#if typeof badge === 'function'}{@render badge()}{:else}{badge}{/if}{/if}</button
      >{#if actions}<span
          >{#if typeof actions === 'function'}{@render actions()}{:else}{actions}{/if}</span
        >{/if}</span
    ></svelte:element
  >
  {#if isOpen}<div>
      {#if children}{@render children()}{/if}
    </div>{/if}
</section>
