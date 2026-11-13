<!--
  Avatar: an image with initials/icon fallback; image errors swap to the
  fallback automatically.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { reactInitials } from '../initials.js'
  import { reactStyle } from '../style.js'
  import type { AvatarProps } from '../types.js'
  import IconGlyph from './IconGlyph.svelte'

  let {
    src,
    alt,
    name,
    size = 'md',
    rounded = true,
    fallback,
    className,
    style,
    testId,
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
</script>

<div class={containerClasses} use:reactStyle={{ ...style, ...customSize }} data-testid={testId}>
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
        {@render fallback()}
      {:else if name}
        <span class={cm.avatarInitials}>{reactInitials(name)}</span>
      {:else}
        <IconGlyph name="user" className={cm.avatarFallbackIcon} />
      {/if}
    </div>
  {/if}
</div>
