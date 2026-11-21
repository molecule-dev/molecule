<!--
  MessagePreview: the Svelte counterpart of
  `@molecule/app-message-preview-react`'s `MessagePreview` — conversation /
  thread row with initials avatar + presence dot, name + preview + timestamp +
  unread pip, and the active-selection treatment. Same props (React names),
  same DOM for the same input. Node-valued props are snippets (a plain string
  or number renders as text).
-->
<script lang="ts">
  import { Link } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { MessagePreviewProps } from './types.js'

  let {
    name,
    preview,
    timestamp,
    unread = 0,
    presence,
    active = false,
    channelIcon,
    initials,
    to,
    onClick,
    unreadAriaLabel,
    className,
  }: MessagePreviewProps = $props()

  const cm = $derived(getClassMap())

  /**
   * Derives up to two uppercase initials from a string name (React's
   * `deriveInitials`).
   *
   * @param value - The name node.
   * @returns The initials, or the empty string when the name is not a string.
   */
  function deriveInitials(value: MessagePreviewProps['name']): string {
    if (typeof value !== 'string') return ''
    return value
      .split(' ')
      .map((part) => part[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  const initialsLabel = $derived(initials ?? deriveInitials(name))
  const clickable = $derived(typeof onClick === 'function')
  const presenceFill = $derived(
    presence === 'online'
      ? cm.messagePreviewPresenceOnline
      : presence === 'away'
        ? cm.messagePreviewPresenceAway
        : cm.messagePreviewPresenceOffline,
  )
  const wrapperClass = $derived(
    cm.cn(
      cm.flex({ gap: 3, align: 'center' }),
      cm.sp('px', 4),
      cm.sp('py', 3),
      cm.messagePreviewRow,
      active ? cm.messagePreviewRowActive : cm.messagePreviewRowHover,
      className,
    ),
  )

  // When the row is interactive, Enter / Space activate it (React's
  // `handleKeyDown`): preventDefault, then the click handler with no event.

  /**
   * Keydown handler for the interactive row (React's `handleKeyDown`).
   *
   * @param event - The keydown.
   */
  function handleKeyDown(event: KeyboardEvent): void {
    if (!onClick) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }
</script>

{#snippet field(value: MessagePreviewProps['name'])}
  {#if typeof value === 'function'}{@render value()}{:else}{value ?? ''}{/if}
{/snippet}

{#snippet body()}
  <div class={cm.messagePreviewAvatarWrap}>
    <div
      class={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.w(9),
        cm.h(9),
        cm.roundedFull,
        cm.fontWeight('bold'),
        cm.textSize('xs'),
        cm.messagePreviewAvatar,
      )}
    >
      {initialsLabel}
    </div>
    {#if presence}
      <span
        aria-hidden="true"
        class={cm.cn(cm.messagePreviewPresenceDot, cm.w(2), cm.h(2), cm.roundedFull, presenceFill)}
      ></span>
    {/if}
  </div>
  <div class={cm.cn(cm.flex({ direction: 'col', gap: 1 }), cm.flex1, cm.minW(0))}>
    <div class={cm.cn(cm.flex({ justify: 'between', align: 'center', gap: 2 }))}>
      <span
        class={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight(unread > 0 ? 'bold' : 'semibold'),
          cm.messagePreviewName,
        )}>{@render field(name)}</span
      >
      <span class={cm.cn(cm.textSize('xs'), cm.messagePreviewTimestamp)}
        >{@render field(timestamp)}</span
      >
    </div>
    <div class={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
      {#if channelIcon}
        <span
          class={cm.cn(cm.iconGlyphFont, cm.messagePreviewChannelIcon)}
          style="font-size: 14px"
          aria-hidden="true">{channelIcon}</span
        >
      {/if}
      <p class={cm.cn(cm.textSize('xs'), cm.messagePreviewText)}>{@render field(preview)}</p>
      {#if unread > 0}
        <span
          aria-label={unreadAriaLabel ?? `${unread} unread`}
          class={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            cm.roundedFull,
            cm.messagePreviewUnreadPip,
          )}>{unread}</span
        >
      {/if}
    </div>
  </div>
{/snippet}

{#if to}
  <Link {to} onclick={onClick} class={wrapperClass}>{@render body()}</Link>
{:else}
  <!-- The svelte checker cannot resolve the dynamic `role`, so it reads the
       interactive row's `tabindex` as a noninteractive one (a11y_no_noninteractive_tabindex);
       with `role="button"` the element is interactive and the attribute is the
       WAI-ARIA button pattern. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    role={clickable ? 'button' : undefined}
    tabindex={clickable ? 0 : undefined}
    onclick={onClick}
    onkeydown={handleKeyDown}
    class={wrapperClass}
  >
    {@render body()}
  </div>
{/if}
