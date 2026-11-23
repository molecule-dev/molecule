<!--
  HelpButton: the Svelte counterpart of `@molecule/app-help-button-react`'s
  `HelpButton` — floating (or inline) circular help button. Same props, same
  DOM for the same input, and the same callback behavior: `href` wins and
  renders an `<a>`, otherwise a `<button>` calls `onClick`.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
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
</script>

{#snippet content()}
  <span class={contentClasses} style="width: 100%; height: 100%">
    {#if icon}{@render icon?.()}{:else}<span aria-hidden="true" style={glyphStyle}>?</span>{/if}
    {#if hasNotification}<span
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
