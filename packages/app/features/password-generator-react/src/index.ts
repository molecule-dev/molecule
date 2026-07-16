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
 * import { PasswordGenerator } from '@molecule/app-password-generator-react'
 *
 * function NewLoginForm() {
 *   const [password, setPassword] = useState('')
 *   return (
 *     <>
 *       <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
 *       <PasswordGenerator
 *         defaultLength={24}
 *         autoCopy
 *         onPick={(generated) => setPassword(generated)}
 *       />
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
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
