/**
 * React copy-link field.
 *
 * Exports `<CopyLinkField>` — read-only input + copy-to-clipboard button with "Copied!" feedback.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { CopyLinkField } from '@molecule/app-copy-link-field-react'
 *
 * export function InvitePanel() {
 *   const inviteCode = 'abc123'
 *   const inviteUrl = `${window.location.origin}/invite/${inviteCode}`
 *   const [copies, setCopies] = useState(0)
 *   return (
 *     <div>
 *       <CopyLinkField value={inviteUrl} onCopy={() => setCopies((n) => n + 1)} feedbackMs={2000} />
 *       <output>{copies}</output>
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * - Copying uses `navigator.clipboard`, which exists only in secure contexts (HTTPS /
 *   localhost) — elsewhere the button silently does nothing and `onCopy` never fires. The
 *   input is read-only and selects its content on focus, so manual Ctrl/Cmd+C still works as
 *   the fallback.
 * - `onCopy` takes NO arguments and fires only after the clipboard write succeeds;
 *   `feedbackMs` is MILLISECONDS (default 1500) that the button reads "Copied!".
 * - It does not generate or shorten links — `value` is copied exactly as given, so build an
 *   absolute URL yourself.
 * - It calls `useTranslation()` from `@molecule/app-react`, so it MUST render inside
 *   `<I18nProvider>` / `<MoleculeProvider>` (it throws otherwise); `getClassMap()` throws unless
 *   `setClassMap(classMap)` from `@molecule/app-ui` ran at startup; the button is `Button` from
 *   `@molecule/app-ui-react` (a peer dependency).
 * - Labels use `copyLink.*` i18n keys (companion bond: `@molecule/app-locales-copy-link-field`).
 *   `label` (shown above the field and used as its aria-label) is yours — pass translated text.
 *
 * @module
 */

export * from './CopyLinkField.js'
