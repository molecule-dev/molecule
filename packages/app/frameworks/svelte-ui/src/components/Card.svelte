<!--
  Card: the base surface; every other declared prop (id, title, aria-*, data-*,
  React's DOM event handlers) reaches the div as React's rest spread does, and
  interactive cards become buttons with roving tab semantics.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { CardProps } from '../types.js'

  const variantMap: Record<string, 'default' | 'elevated' | 'outline' | 'ghost'> = {
    elevated: 'elevated',
    outlined: 'outline',
    filled: 'default',
  }

  let {
    ref = $bindable(null),
    children,
    variant = 'elevated',
    interactive,
    padding = 'md',
    className,
    style,
    testId,
    onClick,
    onKeyDown,
    disabled,
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
  // React's rest spread: a caller's role or tabIndex replaces the interactive default.
  const attributes = $derived(reactAttrs(withoutEvents(rest)))

  // An interactive card is announced as a button and sits in the tab order, so
  // Enter and Space activate it the way they activate a native button: by
  // clicking it, which runs `onClick` with a real click event. Keys pressed in
  // a control inside the card belong to that control. The caller's `onKeyDown`
  // runs first; its preventDefault() cancels the activation, as it does on a
  // native button. A disabled card, like a disabled button, never calls
  // onClick: an interactive one is announced as disabled and leaves the tab order.
  const handleKeyDown = (event: KeyboardEvent & { currentTarget: HTMLElement }): void => {
    onKeyDown?.(event)
    if (event.defaultPrevented || !interactive || disabled) return
    if (event.target !== event.currentTarget) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    event.currentTarget.click()
  }

  // A card that is not interactive renders a plain <div> with React's onClick
  // and no role, so the listener is attached with the spreadEvents action
  // rather than an onclick directive: the reference markup is intentionally
  // not a widget, and the conformance suite compares every attribute.
  const clickHandlers = $derived({
    onclick: disabled ? undefined : onClick,
    onkeydown: onKeyDown,
  })
</script>

{#if interactive}
  <div
    bind:this={ref}
    class={cardClasses}
    use:reactStyle={style}
    data-testid={testId}
    role="button"
    tabindex={disabled ? -1 : 0}
    aria-disabled={disabled ? true : undefined}
    onclick={disabled ? undefined : onClick}
    onkeydown={handleKeyDown}
    {...attributes}
    use:spreadEvents={rest}
  >
    {@render children?.()}
  </div>
{:else}
  <div
    bind:this={ref}
    class={cardClasses}
    use:reactStyle={style}
    data-testid={testId}
    use:spreadEvents={clickHandlers}
    {...attributes}
    use:spreadEvents={rest}
  >
    {@render children?.()}
  </div>
{/if}
