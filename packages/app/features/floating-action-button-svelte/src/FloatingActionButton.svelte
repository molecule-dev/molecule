<!--
  FloatingActionButton: the Svelte counterpart of
  `@molecule/app-floating-action-button-react`'s `FloatingActionButton` —
  fixed-position circular button (or anchor when `href` is set) with an icon
  snippet, native-title tooltip, and four corner-anchoring positions. Same
  props, same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { FloatingActionButtonProps } from './types.js'

  /** Vertical square sizes in px, keyed by the size prop. */
  const SIZE_MAP = { sm: 10, md: 14, lg: 16 } as const

  /** The corner's horizontal and vertical offsets, as React writes them. */
  const CORNER = {
    'bottom-right': ['right', 'bottom'],
    'bottom-left': ['left', 'bottom'],
    'top-right': ['right', 'top'],
    'top-left': ['left', 'top'],
  } as const

  let {
    icon,
    label,
    onClick,
    href,
    position = 'bottom-right',
    size = 'md',
    showTooltip = true,
    className,
  }: FloatingActionButtonProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const dim = $derived(SIZE_MAP[size] * 4)

  /** The root's inline style, exactly as React writes it. */
  const rootStyleText = $derived.by(() => {
    const [x, y] = CORNER[position]
    return `position: fixed; ${x}: 24px; ${y}: 24px; width: ${dim}px; height: ${dim}px; z-index: 40`
  })

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so the label re-renders on a locale switch the way React's
  // render-time `t` call does.
  const ariaLabel = $derived(t(label, {}, { defaultValue: label }))
  const commonClass = $derived(
    cm.cn(
      cm.flex({ align: 'center', justify: 'center' }),
      cm.roundedFull,
      cm.gradientPrimary,
      cm.shadowLifted,
      className,
    ),
  )
</script>

{#if href}
  <a
    {href}
    aria-label={ariaLabel}
    title={showTooltip ? ariaLabel : undefined}
    class={commonClass}
    style={rootStyleText}
  >
    {#if icon}{@render icon()}{/if}
  </a>
{:else}
  <button
    type="button"
    aria-label={ariaLabel}
    title={showTooltip ? ariaLabel : undefined}
    class={commonClass}
    style={rootStyleText}
    onclick={(event) => onClick?.(event)}
  >
    {#if icon}{@render icon()}{/if}
  </button>
{/if}
