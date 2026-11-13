<!--
  Button. While `loading` is true the native button is disabled and marked
  busy; the left/right icon slots and children are React-shaped snippets.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { ButtonProps } from '../types.js'
  import Spinner from './Spinner.svelte'

  let {
    children,
    variant = 'solid',
    color = 'primary',
    size = 'md',
    loading = false,
    loadingText,
    fullWidth = false,
    leftIcon,
    rightIcon,
    className,
    style,
    testId,
    disabled,
    type = 'button',
    onClick,
    ...rest
  }: ButtonProps = $props()

  const cm = $derived(getClassMap())
  const classes = $derived(cm.cn(cm.button({ variant, color, size, fullWidth }), className))
</script>

<button
  {type}
  class={classes}
  use:reactStyle={style}
  data-testid={testId}
  disabled={disabled || loading}
  onclick={onClick}
  aria-busy={loading ? 'true' : 'false'}
  {...reactAttrs(withoutEvents(rest))}
  use:spreadEvents={rest}
>
  {#if loading}<Spinner size="sm" className={cm.buttonIconLeft} />{/if}
  {#if !loading && leftIcon}<span class={cm.buttonIconLeft}>{@render leftIcon()}</span>{/if}
  {#if loading && loadingText}{loadingText}{:else}{@render children?.()}{/if}
  {#if !loading && rightIcon}<span class={cm.buttonIconRight}>{@render rightIcon()}</span>{/if}
</button>
