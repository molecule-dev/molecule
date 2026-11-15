/**
 * Angular three-dot typing indicator for chat UIs — the counterpart of
 * `@molecule/app-typing-indicator-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * Exports `<TypingIndicator>` — CSS-only three-dot pulse animation.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { TypingIndicator } from '@molecule/app-typing-indicator-angular'
 *
 * @Component({
 *   selector: 'chat-view',
 *   standalone: true,
 *   imports: [TypingIndicator],
 *   template: `<mol-typing-indicator [visible]="isTyping" ariaLabel="Alice is typing…" />`,
 * })
 * export class ChatView {
 *   isTyping = true
 * }
 * ```
 *
 * @remarks
 * Dots use `currentColor`, so the indicator inherits the surrounding text
 * color — wrap it in a muted-text container to dim it. The default
 * `ariaLabel` is hardcoded English 'Typing…' (React parity) and there is no
 * companion locale bond: pass a translated `ariaLabel` in non-English apps.
 * Each instance injects its own `<style>` tag for the keyframes (fine for a
 * chat view; avoid hundreds at once). Props (documented on the exported
 * `TypingIndicatorProps` interface): visible (default true), dotSize (px,
 * default 6), durationMs (default 1200), ariaLabel, className.
 *
 * @module
 */

export * from './types.js'
export * from './typing-indicator.component.js'
