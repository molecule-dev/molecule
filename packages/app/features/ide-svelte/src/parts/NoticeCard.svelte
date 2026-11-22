<!--
  The ONE shared tone-accented notice treatment.

  Svelte counterpart of `@molecule/app-ide-react`'s `NoticeCard` (see that file
  for the design notes): the same props (React names), the same DOM for the
  same input, the same callbacks. A matched-weight accent Icon, an optional
  composable body (or plain text), and a left-aligned row of design-system
  action buttons whose semantic colour comes from the action or, failing that,
  the tone. EVERY inline notice renders through this — the system tip/notice
  cards AND the resource-limit / upgrade banners (see `ResourceLimitBanner`) —
  so their icon + buttons can never drift apart. The host owns the button
  routes/copy; it passes them in as `action`.

  A single root element carries the card's `data-mol-id`, `data-tone` and
  chrome — never a wrapper. Layout and the shared card chrome (`chatCardStyle`)
  are the only inline styles; the action row is a real design-system button
  (`cm.button` + `touchTargetCompact`) so a CTA looks the same everywhere. All
  user-facing text is already localized by the caller.

  React's truthiness is preserved: a `content` array (even an empty one)
  selects the composable body and suppresses the action row; `actions` renders
  only when `content` is absent. The component is a part (React renders it
  inside ChatPanel without exporting it), so it lives in `src/parts/`.
-->
<script module lang="ts">
  import type * as types from '../types.js'

  /** Re-exported from the plain-TS contract module (src/types.ts). */
  export type NoticeCardProps = types.NoticeCardProps
</script>

<script lang="ts">
  import type { ChatEventCardAction } from '@molecule/app-ide-panel-logic'
  import {
    CHAT_CARD_ICON_SIZE,
    chatCardStyle,
    NOTICE_TONE,
    NOTICE_TONE_BUTTON_COLOR,
    TIMELINE_ITEM_GAP,
  } from '@molecule/app-ide-panel-logic'
  import { getClassMap } from '@molecule/app-ui'

  import Icon from '../components/Icon.svelte'
  import CardSegment from './CardSegment.svelte'
  import { styleText } from './inline-style.js'
  import { isAllowedLinkHref } from './markdown-content.js'

  let { tone, text, content, action, icon: iconOverride }: NoticeCardProps = $props()

  const cm = getClassMap()
  const accent = $derived(NOTICE_TONE[tone].accent)
  const glyph = $derived(iconOverride ?? NOTICE_TONE[tone].icon)
  const actions = $derived(!action ? [] : Array.isArray(action) ? action : [action])
  const multiline = $derived((text ?? '').includes('\n'))

  /** The card's container chrome: layout + the shared tint/border/padding. */
  const cardStyle = $derived.by((): string => {
    const chrome = chatCardStyle(accent)
    return [
      'display: flex',
      'align-items: flex-start',
      'gap: 10px',
      `margin-bottom: ${TIMELINE_ITEM_GAP}px`,
      `padding: ${chrome.padding}`,
      `border-radius: ${chrome.borderRadius}px`,
      `border: ${chrome.border}`,
      `background: ${chrome.background}`,
      'line-height: 1.5',
    ].join('; ')
  })

  /** The leading accent icon's style, with the accent in its CSSOM color form. */
  const iconStyle = $derived(`flex-shrink: 0; margin-top: 1px; color: ${cssColor(accent)}`)

  /** The body column's style. */
  const bodyStyle = 'flex: 1; min-width: 0px'

  /** A multi-line plain body keeps its newlines. */
  const preWrapStyle = 'white-space: pre-wrap'

  /** The action row's layout. */
  const actionRowStyle = 'display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px'

  /**
   * Whether an href leaves this host (opens in a new tab): an absolute http(s)
   * URL or a protocol-relative one.
   *
   * @param href - The action's href.
   * @returns True when the link targets another origin.
   */
  function isExternalHref(href: string): boolean {
    return /^https?:\/\//i.test(href) || href.startsWith('//')
  }

  /**
   * An accent as the CSSOM serializes it. The accent is forwarded to the Icon as
   * a style attribute (React sets it through the CSSOM, which turns a hex color
   * into `rgb(...)`), so a hex tone is written in that same form; a `var(…)`
   * accent has no computed value and passes through verbatim.
   *
   * @param color - The tone accent (a CSS color or a `var(...)` reference).
   * @returns The accent in its serialized form.
   */
  function cssColor(color: string): string {
    const match = /^#([0-9a-f]{6})$/i.exec(color)
    if (!match) return color
    const value = Number.parseInt(match[1], 16)
    return `rgb(${(value >> 16) & 0xff}, ${(value >> 8) & 0xff}, ${value & 0xff})`
  }

  /**
   * The design-system class of one action, coloured by the action's own
   * semantic or, failing that, the card's tone.
   *
   * @param entry - The action.
   * @returns The class list.
   */
  function actionClass(entry: ChatEventCardAction): string {
    return cm.cn(
      cm.button({ color: entry.color ?? NOTICE_TONE_BUTTON_COLOR[tone], size: 'sm' }),
      cm.touchTargetCompact,
    )
  }

  /**
   * One action's inline style (its label's typography).
   *
   * @param entry - The action.
   * @returns The CSS text.
   */
  function actionStyle(entry: ChatEventCardAction): string {
    return `text-decoration: none; font-family: ${
      entry.code ? 'var(--mol-font-mono, monospace)' : 'inherit'
    }`
  }
</script>

<div
  data-mol-id="chat-notice-card"
  data-tone={tone}
  class={cm.textSize('xs')}
  use:styleText={cardStyle}
>
  <Icon name={glyph} size={CHAT_CARD_ICON_SIZE} aria-hidden="true" style={iconStyle} />
  <div use:styleText={bodyStyle}>
    {#if content}
      {#each content as segment, index (index)}
        <CardSegment seg={segment} />
      {/each}
    {:else}
      <span use:styleText={multiline ? preWrapStyle : undefined}>{text}</span>
    {/if}
    {#if !content && actions.length > 0}
      <div use:styleText={actionRowStyle}>
        {#each actions as entry, index (index)}
          {#if !entry.href}
            <button
              type="button"
              onclick={entry.onClick}
              class={actionClass(entry)}
              use:styleText={actionStyle(entry)}>{entry.label}</button
            >
          {:else if !isAllowedLinkHref(entry.href)}
            <span class={actionClass(entry)} use:styleText={actionStyle(entry)}>{entry.label}</span>
          {:else}
            <a
              href={entry.href}
              target={isExternalHref(entry.href) ? '_blank' : undefined}
              rel={isExternalHref(entry.href) ? 'noopener noreferrer' : undefined}
              class={actionClass(entry)}
              use:styleText={actionStyle(entry)}>{entry.label}</a
            >
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</div>
