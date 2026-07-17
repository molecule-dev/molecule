/**
 * Sticky Save/Cancel bar with "Saved" timestamp + loading state for settings
 * and form pages.
 *
 * Exports `<SettingsActionsBar>`. Props: `onSave` (required; sync or async),
 * `onCancel?` (Cancel hidden when omitted), `loading?` (disables Save and
 * shows "Saving…"), `disabled?`, `savedAt?` (epoch ms → "Saved 3m ago"),
 * `error?` (inline ReactNode), `sticky?` (default true), `leading?`
 * (slot before the status), `className?`.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { SettingsActionsBar } from '@molecule/app-settings-actions-bar-react'
 *
 * function ProfileActions({ save, reset }: {
 *   save: () => Promise<void>
 *   reset: () => void
 * }) {
 *   const [saving, setSaving] = useState(false)
 *   const [savedAt, setSavedAt] = useState<number | null>(null)
 *   return (
 *     <SettingsActionsBar
 *       onSave={async () => {
 *         setSaving(true)
 *         try {
 *           await save()
 *           setSavedAt(Date.now())
 *         } finally {
 *           setSaving(false)
 *         }
 *       }}
 *       onCancel={reset}
 *       loading={saving}
 *       savedAt={savedAt}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - The bar ships with an opaque theme surface (`cm.surface`) + top border
 *   (`cm.borderT`), so when `sticky` is on, page content no longer shows
 *   through it while scrolling. Pass `className` to layer on more styling.
 * - The "Saved …" time is English-shorthand ("3m ago"), computed once per
 *   render — it does not tick while mounted; re-render (or bump `savedAt`)
 *   to refresh it.
 * - `error` renders as plain unstyled text — style/color the node yourself.
 * - Throws unless inside `<I18nProvider>` with a bonded ClassMap.
 *   Translations: `@molecule/app-locales-settings-actions-bar`.
 *
 * @module
 */

export * from './SettingsActionsBar.js'
