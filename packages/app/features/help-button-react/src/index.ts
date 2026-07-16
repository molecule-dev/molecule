/**
 * Floating / inline help button — a circular button for launching help,
 * support chat, or docs. Fixed bottom-corner positioning by default;
 * `position="inline"` renders a normal in-flow button.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 * import { HelpButton } from '@molecule/app-help-button-react'
 *
 * function Support() {
 *   const [open, setOpen] = useState(false)
 *   return (
 *     <>
 *       <HelpButton position="bottom-right" size="md" onClick={() => setOpen(true)} />
 *       <HelpButton position="inline" size="sm" href="https://docs.example.com" />
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * - The button ships with NO surface styling of its own (no background,
 *   border, or shadow) — pass `className` with your surface classes or it
 *   renders as a bare "?" floating over the page.
 * - `useTranslation()` supplies the default aria-label (`helpButton.label`
 *   via `@molecule/app-locales-help-button`) and THROWS outside
 *   `@molecule/app-react`'s `I18nProvider`; `getClassMap()` needs a bonded
 *   ClassMap. Pass `label` to skip i18n for the aria-label.
 * - `href` and `onClick` are mutually exclusive — `href` wins and renders an
 *   `<a>`; there is no `target="_blank"` handling, add your own anchor if you
 *   need one.
 *
 * @module
 */

export * from './HelpButton.js'
