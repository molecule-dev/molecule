/**
 * React password generator feature for molecule.dev.
 *
 * Exports `<PasswordGenerator>` — a configurable, cryptographically-secure
 * password generator UI (length slider, character-class toggles, copy +
 * regenerate buttons, optional `onPick` for wiring into forms /
 * password-manager save flows).
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { PasswordGenerator } from '@molecule/app-password-generator-react'
 *
 * export function NewLoginForm() {
 *   const [password, setPassword] = useState('')
 *   return (
 *     <form>
 *       <label>
 *         Password
 *         <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
 *       </label>
 *       <PasswordGenerator
 *         defaultLength={24} // clamped to 8..64
 *         defaultCharset={{ noSimilar: true }} // merged over the all-on defaults
 *         autoCopy
 *         onPick={(generated) => setPassword(generated)} // fires on "Use this password" only
 *       />
 *     </form>
 *   )
 * }
 * ```
 *
 * @remarks
 * `onPick` is the ONLY way the password leaves the component — it fires when the user clicks
 * "Use this password", not on every regenerate, and the component never writes into your
 * form field itself. It regenerates on mount and on every length / character-class change
 * (so with `autoCopy` the clipboard is written on mount too). Needs a wired ClassMap bond and
 * a React `I18nProvider` ancestor (`useTranslation()` throws without it). Use the exported
 * `generatePassword(length, charset)` for generation without UI.
 *
 * Companion locale bond: `@molecule/app-locales-password-generator`.
 * Copy/autoCopy use the async Clipboard API, which is unavailable on insecure
 * (non-HTTPS, non-localhost) origins — the write fails silently and no
 * "Copied!" confirmation appears; the user can still select the read-only
 * field or click "Use this password". Generation itself needs
 * `crypto.getRandomValues` (browsers + Node 20; it throws where WebCrypto is
 * missing, e.g. very old SSR runtimes).
 *
 * @module
 */

export * from './generator.js'
export * from './PasswordGenerator.js'
export * from './types.js'
