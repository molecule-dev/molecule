/**
 * Public types for `@molecule/app-password-generator-react`.
 *
 * @module
 */

/**
 * Character-class options that toggle which alphabets the generator
 * draws from. At least one of these must be `true` for the generator to
 * produce a password — when all four are off, the generator falls back
 * to lowercase + digits to avoid an empty alphabet.
 */
export interface PasswordCharsetOptions {
  /** Include uppercase letters A-Z. Defaults to `true`. */
  uppercase: boolean
  /** Include lowercase letters a-z. Defaults to `true`. */
  lowercase: boolean
  /** Include digits 0-9. Defaults to `true`. */
  digits: boolean
  /** Include common symbols (`!@#$%^&*()-_=+[]{};:,.<>/?`). Defaults to `true`. */
  symbols: boolean
  /** Skip visually-similar glyphs (`0`, `O`, `o`, `1`, `l`, `I`). Defaults to `false`. */
  noSimilar: boolean
  /** Skip ambiguous specials (space + `'"~\``). Defaults to `false`. */
  noAmbiguous: boolean
}

/** Props for `<PasswordGenerator>`. */
export interface PasswordGeneratorProps {
  /** Initial password length. Clamped to `[8, 64]`. Defaults to `20`. */
  defaultLength?: number
  /**
   * Optional initial charset overrides. Anything you don't supply
   * inherits the default (`uppercase`, `lowercase`, `digits`, `symbols`
   * all `true`; `noSimilar` and `noAmbiguous` `false`).
   */
  defaultCharset?: Partial<PasswordCharsetOptions>
  /**
   * Called when the user clicks "Use this password". Consumer wires
   * this to whatever form/secret store should receive the password.
   */
  onPick?: (password: string) => void
  /**
   * If `true`, every freshly-generated password is also written to the
   * clipboard automatically. Defaults to `false`.
   */
  autoCopy?: boolean
  /** Optional aria-label override on the read-only password output. */
  ariaLabel?: string
  /** Optional `data-mol-id` attribute on the root element. */
  dataMolId?: string
  /** Extra wrapper classes. */
  className?: string
}
