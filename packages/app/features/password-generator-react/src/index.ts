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
 *
 * @module
 */

export * from './generator.js'
export * from './PasswordGenerator.js'
export * from './types.js'
