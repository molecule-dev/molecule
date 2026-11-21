<!--
  EmbeddableChatLauncher: the Svelte counterpart of
  `@molecule/app-embeddable-chat-widget`'s `EmbeddableChatLauncher` — a
  floating circular launcher in the corner of the host page; click expands
  the chat panel. Same props (React names), same DOM for the same input.
-->
<script lang="ts">
  import type { EmbeddableChatLauncherProps } from './types.js'
  import { useSafeTranslation } from './useSafeTranslation.js'

  let { visible, onOpen, position, theme, className }: EmbeddableChatLauncherProps = $props()

  const { t } = useSafeTranslation()

  /**
   * The button's inline style. Every style attribute in this package is a
   * bound expression (never a static template attribute) so the DOM parses
   * and normalizes each value exactly as React's inline-style object does.
   *
   * @returns The style declarations.
   */
  const buttonStyle = (): string =>
    [
      `position: fixed`,
      `width: 56px`,
      `height: 56px`,
      `border-radius: 9999px`,
      `border: none`,
      `cursor: pointer`,
      `z-index: 2147483646`,
      `box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18)`,
      `background: ${theme?.primaryColor ?? '#2563eb'}`,
      `color: ${theme?.primaryForegroundColor ?? '#ffffff'}`,
      // Center the icon inline (not via ClassMap) so it works on a bare page
      // where no Tailwind/ClassMap classes are loaded.
      `display: flex`,
      `align-items: center`,
      `justify-content: center`,
      position === 'bottom-left' ? `left: 24px` : `right: 24px`,
      `bottom: 24px`,
    ].join('; ')
</script>

{#if visible}
  <button
    type="button"
    onclick={(event) => onOpen(event)}
    aria-label={t('embeddableChatWidget.launcher.openLabel', {}, { defaultValue: 'Open chat' })}
    data-mol-id="embeddable-chat-launcher"
    class={className}
    style={buttonStyle()}
  >
    <!-- Inline SVG keeps the launcher self-contained — no font/icon dep. -->
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  </button>
{/if}
