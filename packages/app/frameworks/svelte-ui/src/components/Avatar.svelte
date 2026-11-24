<!--
  Avatar: an image with initials/icon fallback; image errors swap to the
  fallback automatically.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { contentPresence, renderedContentCount } from '../content-presence.js'
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
  // A fallback that renders nothing (React's `slot(fallback)`) falls back to
  // the initials or the icon, so the custom content is measured, with the
  // alternative counted as the component's own fallback.
  let customFallback = $state(false)
  const reportFallback = (renders: boolean): void => {
    customFallback = renders
  }
  const fallbackPresence = contentPresence(reportFallback, {
    renders: (element) => renderedContentCount(element) > (customFallback ? 0 : 1),
  })
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
    <div class={cm.avatarFallback} {@attach fallbackPresence}>
      {#if fallback}
        {@render fallback?.()}
      {/if}
      {#if !customFallback}
        {#if name}
          <span class={cm.avatarInitials}>{reactInitials(name)}</span>
        {:else}
          <IconGlyph name="user" className={cm.avatarFallbackIcon} />
        {/if}
      {/if}
    </div>
  {/if}
</div>
