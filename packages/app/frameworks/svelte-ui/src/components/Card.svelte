<!--
  Card: the base surface; data-* and aria-* props pass through, interactive
  cards become buttons with roving tab semantics.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { spreadEvents } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { CardProps } from '../types.js'

  const variantMap: Record<string, 'default' | 'elevated' | 'outline' | 'ghost'> = {
    elevated: 'elevated',
    outlined: 'outline',
    filled: 'default',
  }

  let {
    children,
    variant = 'elevated',
    interactive,
    padding = 'md',
    className,
    style,
    testId,
    onClick,
    ...rest
  }: CardProps = $props()

  const cm = $derived(getClassMap())
  const paddingClass = $derived(padding === 'none' ? '' : cm.cardPadding(padding as 'md'))
  const cardVariant = $derived(variantMap[variant] || 'default')
  const cardClasses = $derived(
    cm.cn(
      cm.card({ variant: cardVariant }),
      paddingClass,
      interactive && cm.cardInteractive,
      className,
    ),
  )
  const passthrough = $derived.by(() => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(rest)) {
      if (k.startsWith('data-') || k.startsWith('aria-')) out[k] = v
    }
    return out
  })

  // A card that is not interactive renders a plain <div> with React's onClick
  // and no role, so the listener is attached with the spreadEvents action
  // rather than an onclick directive: the reference markup is intentionally
  // not a widget, and the conformance suite compares every attribute.
  const clickHandlers = $derived({ onclick: onClick })
</script>

{#if interactive}
  <div
    class={cardClasses}
    use:reactStyle={style}
    data-testid={testId}
    role="button"
    tabindex={0}
    use:spreadEvents={clickHandlers}
    {...passthrough}
  >
    {@render children?.()}
  </div>
{:else}
  <div
    class={cardClasses}
    use:reactStyle={style}
    data-testid={testId}
    use:spreadEvents={clickHandlers}
    {...passthrough}
  >
    {@render children?.()}
  </div>
{/if}
