/**
 * Vue three-dot typing indicator for chat UIs.
 *
 * Exports `<TypingIndicator>` — the Vue counterpart of
 * `@molecule/app-typing-indicator-react`: CSS-only three-dot pulse animation,
 * the same props (React names) and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { TypingIndicator } from '@molecule/app-typing-indicator-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     const isTyping = true
 *     return () => h(TypingIndicator, { visible: isTyping, ariaLabel: 'Alice is typing…' })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * Dots use `currentColor`, so the indicator inherits the surrounding text
 * color — wrap it in a muted-text container to dim it. The default
 * `ariaLabel` is the translated `typingIndicator.aria.label` (English
 * `'Typing…'`, via `@molecule/app-locales-typing-indicator`); the `ariaLabel`
 * prop overrides it. Each instance injects its own `<style>` tag for the
 * keyframes (fine for a chat view; avoid hundreds at once). Props (documented
 * on the exported `TypingIndicatorProps` interface): visible (default true),
 * dotSize (px, default 6), durationMs (default 1200), ariaLabel, className.
 *
 * @module
 */

export * from './types.js'
export * from './TypingIndicator.js'
