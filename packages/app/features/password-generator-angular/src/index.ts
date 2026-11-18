/**
 * Angular password generator feature for molecule.dev.
 *
 * Exports `<div mol-password-generator>` — a configurable,
 * cryptographically-secure password generator UI (length slider,
 * character-class toggles, copy + regenerate buttons, optional `onPick` for
 * wiring into forms / password-manager save flows).
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { PasswordGenerator } from '@molecule/app-password-generator-angular'
 *
 * @Component({
 *   selector: 'app-new-login-form',
 *   standalone: true,
 *   imports: [PasswordGenerator],
 *   template: `
 *     <input type="password" [value]="password()" />
 *     <div
 *       mol-password-generator
 *       [defaultLength]="24"
 *       [autoCopy]="true"
 *       [onPick]="setPassword"
 *     ></div>
 *   `,
 * })
 * export class NewLoginForm {
 *   readonly password = signal('')
 *   readonly setPassword = (generated: string): void => this.password.set(generated)
 * }
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-password-generator`.
 * Copy/autoCopy go through `@molecule/app-clipboard`'s
 * `copyTextWithFallback()`: the bonded clipboard provider (the Clipboard API
 * plus a selection-and-copy fallback) or the legacy copy command when no
 * provider is bonded. It never throws, and when no copy happened no
 * "Copied!" confirmation appears — the user can still select the read-only
 * field or click "Use this password". Generation itself needs
 * `crypto.getRandomValues` (browsers + Node 20; it throws where WebCrypto is
 * missing, e.g. very old SSR runtimes).
 *
 * @module
 */

export * from './generator.js'
export * from './password-generator.component.js'
export * from './types.js'
