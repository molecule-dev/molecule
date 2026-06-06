/**
 * Floating / inline help button.
 *
 * Exports `<HelpButton>` — circular FAB-style button or inline button
 * for launching help, support chat, or docs.
 *
 * @example
 * ```tsx
 * import { HelpButton } from '@molecule/app-help-button-react'
 *
 * // Floating bottom-right FAB that opens a support panel
 * <HelpButton
 *   position="bottom-right"
 *   size="md"
 *   hasNotification={false}
 *   onClick={() => setSupportOpen(true)}
 * />
 *
 * // Inline variant that links to docs
 * <HelpButton position="inline" size="sm" href="https://docs.example.com" />
 * ```
 *
 * @module
 */

export * from './HelpButton.js'
