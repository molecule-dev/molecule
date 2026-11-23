<!--
  Avatar: an image with initials/icon fallback; image errors swap to the
  fallback automatically.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { reactInitials } from '../initials.js'
  import { reactStyle } from '../style.js'
  import type { AvatarProps } from '../types.js'
  import IconGlyph from './IconGlyph.svelte'

  let {
    ref = $bindable(null),
    src,
    alt,
    name,
    size = 'md',
    rounded = true,
    fallback,
    className,
    style,
    testId,
    ...rest
  }: AvatarProps = $props()

  let imageError = $state(false)

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  const showFallback = $derived(!src || imageError)
  const avatarSize = $derived(typeof size === 'number' ? undefined : size)
  const containerClasses = $derived(
    cm.cn(cm.avatar({ size: avatarSize }), !rounded && cm.avatarSquare, className),
  )
  const customSize = $derived(typeof size === 'number' ? { width: size, height: size } : undefined)
  // Every other declared prop (id, title, aria-*, data-*, automationId as
  // data-mol-id, the DOM event handlers) reaches the root.
  const attributes = $derived(reactAttrs(withoutEvents(rest)))
</script>

<div
  bind:this={ref}
  class={containerClasses}
  use:reactStyle={{ ...style, ...customSize }}
  data-testid={testId}
  {...attributes}
  use:spreadEvents={rest}
>
  {#if !showFallback}
    <img
      {src}
      alt={alt || name || t('ui.avatar.alt', undefined, { defaultValue: 'Avatar' })}
      class={cm.avatarImage}
      onerror={() => {
        imageError = true
      }}
    />
  {:else}
    <div class={cm.avatarFallback}>
      {#if fallback}
        {@render fallback?.()}
      {:else if name}
        <span class={cm.avatarInitials}>{reactInitials(name)}</span>
      {:else}
        <IconGlyph name="user" className={cm.avatarFallbackIcon} />
      {/if}
    </div>
  {/if}
</div>
