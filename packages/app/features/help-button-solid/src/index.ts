/**
 * Solid floating / inline help button — a circular button for launching help,
 * support chat, or docs. Fixed bottom-corner positioning by default;
 * `position="inline"` renders a normal in-flow button.
 *
 * Solid counterpart of `@molecule/app-help-button-react`: the same props, and
 * the same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 * import { HelpButton } from '@molecule/app-help-button-solid'
 *
 * function Support() {
 *   const [open, setOpen] = createSignal(false)
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
 * - `useTranslation()` supplies the default aria-label (`helpButton.label`)
 *   and THROWS outside `@molecule/app-solid`'s i18n service; `getClassMap()`
 *   needs a bonded ClassMap. Pass `label` to skip i18n for the aria-label.
 * - `href` and `onClick` are mutually exclusive — `href` wins and renders an
 *   `<a>`; there is no `target="_blank"` handling, add your own anchor if you
 *   need one.
 *
 * @module
 */

export * from './HelpButton.jsx'
export * from './types.js'
