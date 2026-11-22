<!--
  Auto-tip card — a dismissable, non-interrupting info card surfaced on a
  fresh conversation and periodically thereafter. It is NOT a chat message —
  it never triggers the model and never blocks the input; the user dismisses
  it with the close button.

  Svelte counterpart of `@molecule/app-ide-react`'s `TipCard` (see that file
  for the design notes): the same props (React names), the same DOM for the
  same input, the same callbacks. The tip text is split on its `/` and `@`
  tokens, which render as inline monospace code; the accent recolours the
  card's tint and the leading icon together; the dismiss mark brightens on
  hover. The component is a part (React renders it inside ChatPanel without
  exporting it), so it lives in `src/parts/`. React keys the text segments
  `key={i}`, so the `{#each}` is keyed by index — a segment's position keeps
  its node, the way React's re-render updates in place.

  All styling is inline, written the way the DOM takes it here (the pixel
  values spell their `px`, which Svelte does not add for React).
-->
<script module lang="ts">
  import type { IconName } from '@molecule/app-icons'

  /** Props for {@link TipCard} — the React prop names, React's own contract. */
  export interface TipCardProps {
    /** The (already-localized) tip text. */
    text: string
    /** Dismisses the tip — the host removes it from the timeline. */
    onDismiss: () => void
    /**
     * Recolours the card tint + icon for a semantic tip (e.g. the gold viewer
     * tip that explains the team-only message treatment).
     */
    accent?: string
    /** Overrides the leading glyph (default `lightbulb`). */
    icon?: IconName
  }

  /** Matches a slash-command or `@file` token (`/plan`, `@filename`, or a bare `/` or `@`). */
  const TIP_TOKEN_RE = /([@/][\w-]*)/g

  /** The neutral icon accent when the tip carries no semantic one. */
  const NEUTRAL_ACCENT = 'var(--mol-color-primary, #6366f1)'

  /**
   * The leading icon's inline style: the chat cards' shared no-shrink icon,
   * dropped one pixel to sit on the `xs` text line.
   */
  const ICON_STYLE = 'flex-shrink: 0; margin-top: 1px'

  /**
   * Inline monospace code style for command/`@file` tokens in a tip (mvp
   * #10).
   */
  const TIP_CODE_STYLE =
    'font-family: var(--mol-font-mono, monospace); font-size: 0.92em; padding: 1px 5px; border-radius: 4px; background: rgba(128,128,128,0.16); border: 1px solid rgba(128,128,128,0.18); white-space: nowrap'

  /**
   * The dismiss mark's inline style: the IDE's shared icon-only ✕ dismiss
   * (18px box, 4px radius, 0.6 resting opacity) — mol-bespoke-button, on the
   * compact 36px floor these dense cards use.
   */
  const DISMISS_STYLE =
    'display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 4px; border: none; color: inherit; cursor: pointer; opacity: 0.6; transition: opacity 100ms, background 100ms; background: transparent'

  /**
   * Whether one split segment is a command / `@file` token (React's
   * `/^[@/]/` guard, `part &&` first so an empty segment is plain text).
   *
   * @param part - The segment.
   * @returns True when the segment renders as inline code.
   */
  function isToken(part: string): boolean {
    return part !== '' && /^[@/]/.test(part)
  }

  /**
   * Brightens the dismiss mark while the pointer is over it (React's
   * `onMouseEnter`).
   *
   * @param event - The native mouse event.
   */
  function onmouseenter(event: MouseEvent): void {
    ;(event.currentTarget as HTMLElement).style.opacity = '1'
    ;(event.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.2)'
  }

  /**
   * Restores the dismiss mark's resting opacity when the pointer leaves
   * (React's `onMouseLeave`).
   *
   * @param event - The native mouse event.
   */
  function onmouseleave(event: MouseEvent): void {
    ;(event.currentTarget as HTMLElement).style.opacity = '0.6'
    ;(event.currentTarget as HTMLElement).style.background = 'transparent'
  }
</script>

<script lang="ts">
  import { CHAT_CARD_ICON_SIZE, chatCardStyle } from '@molecule/app-ide-panel-logic'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import Icon from '../components/Icon.svelte'

  let { text, onDismiss, accent, icon }: TipCardProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())

  // React computes these once per render from the props; Svelte derives them
  // so the same values stay current across prop changes.
  const parts = $derived(text.split(TIP_TOKEN_RE))
  const iconColor = $derived(accent ?? NEUTRAL_ACCENT)

  /**
   * The card container's inline style: the chat cards' chrome (with the
   * radius written as `px` — the neutral helper returns a unitless number, a
   * React-ism a style text does not take) and the timeline's bottom rhythm.
   */
  const rootStyle = $derived.by(() => {
    const { padding, borderRadius, border, background } = chatCardStyle(accent)
    return [
      'display: flex',
      'align-items: flex-start',
      'gap: 8px',
      // One chat-timeline rhythm: bottom margin only, never a top margin
      // (matches ChatPanel's TIMELINE_ITEM_GAP so adjacent items never
      // collide — P4-05).
      'margin-bottom: 16px',
      `padding: ${padding}`,
      `border-radius: ${borderRadius}px`,
      `border: ${border}`,
      `background: ${background}`,
      'line-height: 1.5',
    ].join('; ')
  })
</script>

<div data-mol-id="chat-tip-card" class={cm.cn(cm.textSize('xs'), cm.textMuted)} style={rootStyle}>
  <Icon
    name={icon ?? 'lightbulb'}
    size={CHAT_CARD_ICON_SIZE}
    aria-hidden="true"
    style={`${ICON_STYLE}; color: ${iconColor}`}
  />
  <span style="flex: 1 1 0%">
    {#each parts as part, i (i)}
      {#if isToken(part)}
        <code style={TIP_CODE_STYLE}>{part}</code>
      {:else}
        <span>{part}</span>
      {/if}
    {/each}
  </span>
  <button
    type="button"
    data-mol-id="chat-tip-dismiss"
    onclick={onDismiss}
    aria-label={t('ide.chat.tip.dismiss', undefined, { defaultValue: 'Dismiss tip' })}
    title={t('ide.chat.tip.dismiss', undefined, { defaultValue: 'Dismiss tip' })}
    class={cm.cn(cm.touchTargetCompact, cm.shrink0)}
    style={DISMISS_STYLE}
    {onmouseenter}
    {onmouseleave}
  >
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
      ></path>
    </svg>
  </button>
</div>
