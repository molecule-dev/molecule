<!--
  Renders the signed-in user's profile avatar beside their own chat messages
  (SOC1). When the host supplies a safe, renderable avatar it shows the real
  image; otherwise it falls back to the generic `user` glyph from the bonded
  icon set — so the column is always present and the layout never shifts.

  Svelte 5 counterpart of `@molecule/app-ide-react`'s `UserAvatar` (see that
  file for the design notes): the same props (React names), the same DOM for
  the same input, the same callbacks. The visual is one snippet, rendered bare
  without `onClick` and inside the accessible button with it — the root
  element changes with the branch, which Svelte switches without a wrapper
  element. Styling uses `getClassMap()` (`cm.*`); the only inline styles are
  the rounded-square crop and the one-off primary tint the ClassMap can't
  express, written with `px` the way the DOM takes them here (React adds `px`
  to a number). All user-facing text goes through `t()`.
-->
<script module lang="ts">
  import type * as types from '../types.js'

  /**
   * Props for {@link UserAvatar} — the React prop names, React's own contract.
   */
  export type UserAvatarProps = types.UserAvatarProps

  /** The tinted backdrop behind every avatar tile (the ClassMap can't express it). */
  const TILE_BACKGROUND =
    'color-mix(in srgb, var(--mol-color-primary, #6366f1) 18%, var(--mol-color-surface, #f4f4f4))'
</script>

<script lang="ts">
  import { resolveUserAvatar } from '@molecule/app-ide-panel-logic'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import Icon from './Icon.svelte'

  let { userAvatar, name, size = 24, onClick }: UserAvatarProps = $props()

  const cm = getClassMap()
  const { t } = useTranslation()

  // The hover/focus ring state (React's `useState(false)` + the four
  // handlers; focus and hover share one highlight exactly as React's do).
  let hover = $state(false)

  const src = $derived(resolveUserAvatar(userAvatar))
  // A whitespace-only (or empty) name is no name: it initials to nothing, and
  // the label below drops to '' so the fallback tile renders decorative
  // (aria-hidden, no image role) instead of announcing a blank.
  const trimmedName = $derived(name?.trim() ?? '')
  // The avatar identifies the message's sender: the author's raw name when we
  // have one (a teammate's message — untrimmed, only its initial is), else the
  // solo "You" (already-translated) for the viewer's own messages — used for
  // both the image alt and the fallback tile's accessible name.
  const label = $derived(
    trimmedName ? name! : name == null ? t('ide.chat.you', undefined, { defaultValue: 'You' }) : '',
  )
  // Named author with no renderable avatar → an initial-letter tile ("T" for
  // Test), never the generic glyph and NEVER someone else's picture.
  const initial = $derived(trimmedName.charAt(0).toUpperCase())
  // The tile crop/tint the ClassMap can't express, at the case's own size.
  const tileStyle = $derived(
    `width: ${size}px; height: ${size}px; border-radius: 6px; background: ${TILE_BACKGROUND}`,
  )
  const glyphSize = $derived(Math.round(size * 0.6))
  // The 1px border is always present (transparent at rest) so hovering never
  // shifts layout; the ClassMap's `touchTargetCompact` carries the hit floor.
  // `background` goes last: Svelte applies this string through cssText, and
  // jsdom's style parser drops `background: transparent` when a longhand
  // declaration follows it. The normalizer sorts declarations anyway.
  const buttonStyle = $derived(
    `padding: 0px; margin: 0px; border-radius: 6px; display: inline-flex; flex-shrink: 0; cursor: pointer; line-height: 0; box-sizing: border-box; transition: box-shadow 100ms; background: transparent; border: ${
      hover ? '1px solid var(--mol-color-primary, #6366f1)' : '1px solid transparent'
    }`,
  )
</script>

{#snippet avatarVisual()}
  {#if src !== null}
    <img
      {src}
      alt={label}
      data-mol-id="chat-user-avatar"
      style="{tileStyle}; object-fit: cover; flex-shrink: 0"
    />
  {:else}
    <span
      data-mol-id="chat-user-avatar"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      style="{tileStyle}; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--mol-color-primary, #6366f1)"
    >
      {#if initial !== ''}
        <span
          aria-hidden="true"
          style="font-size: {Math.round(size * 0.45)}px; font-weight: 600; line-height: 1"
        >
          {initial}
        </span>
      {:else}
        <Icon name="user" size={glyphSize} aria-hidden="true" />
      {/if}
    </span>
  {/if}
{/snippet}

{#if onClick}
  <button
    type="button"
    onclick={onClick}
    onmouseenter={() => (hover = true)}
    onmouseleave={() => (hover = false)}
    onfocus={() => (hover = true)}
    onblur={() => (hover = false)}
    data-mol-id="chat-user-avatar-button"
    aria-label={t('ide.chat.viewProfile', undefined, { defaultValue: 'View profile' })}
    class={cm.touchTargetCompact}
    style={buttonStyle}
  >
    {@render avatarVisual()}
  </button>
{:else}
  {@render avatarVisual()}
{/if}
