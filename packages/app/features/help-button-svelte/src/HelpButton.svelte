<!--
  HelpButton: the Svelte counterpart of `@molecule/app-help-button-react`'s
  `HelpButton` — floating (or inline) circular help button. Same props, same
  DOM for the same input, and the same callback behavior: `href` wins and
  renders an `<a>`, otherwise a `<button>` calls `onClick`.
-->
<script lang="ts">
  import { contentNodes, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { HelpButtonProps } from './types.js'

  /** Square sizes in pixels, keyed by the size prop. */
  const SIZE_MAP = { sm: 40, md: 52, lg: 64 } as const

  let {
    icon,
    label,
    onClick,
    href,
    size = 'md',
    position = 'bottom-right',
    hasNotification,
    className,
  }: HelpButtonProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let hovered = $state(false)

  const dim = $derived(SIZE_MAP[size])

  /** The root's inline style, exactly as React writes it. */
  const rootStyleText = $derived.by(() => {
    const parts = [`width: ${dim}px`, `height: ${dim}px`]
    if (position === 'bottom-right') {
      parts.push('position: fixed', 'right: 24px', 'bottom: 24px', 'z-index: 40')
    } else if (position === 'bottom-left') {
      parts.push('position: fixed', 'left: 24px', 'bottom: 24px', 'z-index: 40')
    }
    if (hovered) parts.push('transform: scale(1.05)')
    parts.push('transition: transform 150ms ease')
    return parts.join('; ')
  })

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so the label re-renders on a locale switch the way React's
  // render-time `t` call does.
  const ariaLabel = $derived(label ?? t('helpButton.label', {}, { defaultValue: 'Help' }))
  const contentClasses = $derived(
    cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.roundedFull, cm.position('relative')),
  )
  const glyphStyle = $derived(`font-size: ${dim * 0.45}px; font-weight: 700`)

  // React's `icon ?? <span>?</span>`: an icon snippet that renders nothing (an empty list) falls
  // back to the glyph, like an omitted one. A snippet's `{#each}` over no rows changes the DOM
  // without changing the prop, so presence is read from the rendered DOM (the glyph and the
  // notification dot are this component's own nodes, not the icon).
  let contentEl = $state<HTMLSpanElement | null>(null)
  let glyphEl = $state<HTMLSpanElement | null>(null)
  let dotEl = $state<HTMLSpanElement | null>(null)
  let iconRenders = $state(false)
  $effect(() => {
    const span = contentEl
    if (!span) return
    const sync = (): void => {
      const present = contentNodes(span).some(
        (node) =>
          node !== glyphEl &&
          node !== dotEl &&
          (node.nodeType === 1 || (node.textContent ?? '').trim() !== ''),
      )
      if (present !== iconRenders) iconRenders = present
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(span, { childList: true, characterData: true, subtree: true })
    return () => observer.disconnect()
  })
</script>

{#snippet content()}
  <span bind:this={contentEl} class={contentClasses} style="width: 100%; height: 100%">
    {#if icon}{@render icon?.()}{/if}
    {#if !iconRenders}<span bind:this={glyphEl} aria-hidden="true" style={glyphStyle}>?</span>{/if}
    {#if hasNotification}<span
        bind:this={dotEl}
        aria-hidden="true"
        style="position: absolute; top: 4px; right: 4px; width: 10px; height: 10px; border-radius: 50%; background: currentcolor"
      ></span>{/if}
  </span>
{/snippet}

{#if href}
  <a
    {href}
    class={className}
    style={rootStyleText}
    aria-label={ariaLabel}
    onmouseenter={() => {
      hovered = true
    }}
    onmouseleave={() => {
      hovered = false
    }}
  >
    {@render content()}
  </a>
{:else}
  <button
    type="button"
    class={className}
    style={rootStyleText}
    aria-label={ariaLabel}
    onclick={(event) => onClick?.(event)}
    onmouseenter={() => {
      hovered = true
    }}
    onmouseleave={() => {
      hovered = false
    }}
  >
    {@render content()}
  </button>
{/if}
