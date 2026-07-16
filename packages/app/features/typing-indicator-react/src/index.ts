/**
 * Three-dot typing indicator for chat UIs.
 *
 * Exports `<TypingIndicator>` — CSS-only three-dot pulse animation.
 *
 * @example
 * ```tsx
 * import { TypingIndicator } from '@molecule/app-typing-indicator-react'
 *
 * const isTyping = true
 *
 * <TypingIndicator visible={isTyping} ariaLabel="Alice is typing…" />
 * ```
 *
 * @remarks
 * Dots use `currentColor`, so the indicator inherits the surrounding text
 * color — wrap it in a muted-text container to dim it. The default
 * `ariaLabel` is hardcoded English 'Typing…' and there is no companion
 * locale bond: pass a translated `ariaLabel` in non-English apps. Each
 * instance injects its own `<style>` tag for the keyframes (fine for a chat
 * view; avoid hundreds at once). Props (documented on the exported
 * `TypingIndicatorProps` interface): visible (default true), dotSize (px,
 * default 6), durationMs (default 1200), ariaLabel, className.
 *
 * @module
 */

export * from './TypingIndicator.js'
