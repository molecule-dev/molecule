/**
 * Lightweight password strength scoring.
 *
 * Estimates entropy from length + character class diversity, then
 * penalizes the result for matches against a small built-in list of
 * very common passwords (and their bigrams). Yields a zxcvbn-style
 * 0–4 score with a flat checklist of rule outcomes — no heavy zxcvbn
 * dependency required.
 *
 * @module
 */

/**
 * Common-password dictionary used by the scorer.
 *
 * Drawn from public top-100 lists of frequently leaked passwords.
 * Scoring matches case-insensitively against substrings of length ≥4
 * so derivatives like `password1!` are still penalized.
 */
export const COMMON_PASSWORDS: readonly string[] = [
  'password',
  'passw0rd',
  'p@ssword',
  'p@ssw0rd',
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty',
  'qwerty123',
  'qwertyuiop',
  'abc123',
  '111111',
  '123123',
  '1q2w3e4r',
  '1qaz2wsx',
  'admin',
  'administrator',
  'root',
  'welcome',
  'welcome1',
  'login',
  'letmein',
  'iloveyou',
  'monkey',
  'dragon',
  'sunshine',
  'master',
  'shadow',
  'football',
  'baseball',
  'jordan',
  'superman',
  'batman',
  'trustno1',
  'hello',
  'hello123',
  'helloworld',
  'starwars',
  'princess',
  'whatever',
  'access',
  'flower',
  'passion',
  'michael',
  'jennifer',
  'jessica',
  'charlie',
  'donald',
  'thomas',
  'andrew',
  'joshua',
  'matthew',
  'daniel',
  'asdfgh',
  'asdfghjkl',
  'zxcvbn',
  'zxcvbnm',
  'qazwsx',
  'qweasd',
  'mustang',
  'harley',
  'corvette',
  'porsche',
  'ferrari',
  'computer',
  'internet',
  'samsung',
  'google',
  'facebook',
  'apple',
  'pokemon',
  'minecraft',
  'fortnite',
  'snoopy',
  'taylor',
  'tigger',
  'buster',
  'soccer',
  'hockey',
  'killer',
  'george',
  'sexy',
  'andrea',
  'horny',
  'love',
  'chocolate',
  'cookie',
  'summer',
  'winter',
  'spring',
  'autumn',
  'banana',
  'orange',
  'cheese',
  'pepper',
  'maggie',
  'jordan23',
  'family',
  'freedom',
  'qwerty1',
  'liverpool',
  'arsenal',
  'chelsea',
] as const

/**
 * Numeric password strength score, zxcvbn-style.
 *
 * - `0` very weak, `1` weak, `2` fair, `3` good, `4` strong.
 */
export type PasswordScore = 0 | 1 | 2 | 3 | 4

/**
 * Per-rule checklist outcomes returned by {@link scorePassword}.
 */
export interface PasswordChecklist {
  /** Whether the password is at least 12 characters long. */
  length: boolean
  /** Whether the password contains an uppercase letter. */
  upper: boolean
  /** Whether the password contains a lowercase letter. */
  lower: boolean
  /** Whether the password contains a digit. */
  digit: boolean
  /** Whether the password contains a non-alphanumeric symbol. */
  symbol: boolean
  /** Whether the password is free of common-password substrings. */
  noCommon: boolean
}

/**
 * Result of scoring a password.
 */
export interface PasswordScoreResult {
  /** Discrete strength bucket from 0–4. */
  score: PasswordScore
  /** Estimated entropy in bits used to derive the score. */
  entropyBits: number
  /** Per-rule outcomes for the optional checklist UI. */
  checklist: PasswordChecklist
}

const LOWER_RE = /[a-z]/
const UPPER_RE = /[A-Z]/
const DIGIT_RE = /[0-9]/
const SYMBOL_RE = /[^a-zA-Z0-9]/

/**
 * Approximates the size of the character pool used in `password`.
 *
 * Each detected character class contributes its alphabet size; the
 * sum is the effective pool used for the entropy estimate.
 *
 * @param password - The password to inspect.
 * @returns The estimated character pool size.
 */
function estimatePoolSize(password: string): number {
  let pool = 0
  if (LOWER_RE.test(password)) pool += 26
  if (UPPER_RE.test(password)) pool += 26
  if (DIGIT_RE.test(password)) pool += 10
  if (SYMBOL_RE.test(password)) pool += 32
  return pool
}

/**
 * Returns true if `password` contains a substring of length ≥4 that
 * matches any common-password entry, case-insensitively.
 *
 * @param password - The password to inspect.
 * @returns Whether a common-password bigram match was found.
 */
function containsCommonPassword(password: string): boolean {
  if (!password) return false
  const lower = password.toLowerCase()
  for (const common of COMMON_PASSWORDS) {
    if (common.length < 4) continue
    if (lower.includes(common)) return true
    // Bigram-style: check 4-char windows of the common password against
    // the user's password so prefixes like "passw" are still flagged.
    for (let i = 0; i + 4 <= common.length; i += 1) {
      if (lower.includes(common.slice(i, i + 4))) return true
    }
  }
  return false
}

/**
 * Computes a password's strength score and per-rule checklist.
 *
 * The score is derived from `length × log2(poolSize)` (Shannon
 * approximation) and then penalized when the password contains any
 * common-password substring. Empty passwords return `0` with the
 * full checklist set to false.
 *
 * @param password - The password to score.
 * @returns The {@link PasswordScoreResult} for the supplied password.
 */
export function scorePassword(password: string): PasswordScoreResult {
  const checklist: PasswordChecklist = {
    length: password.length >= 12,
    upper: UPPER_RE.test(password),
    lower: LOWER_RE.test(password),
    digit: DIGIT_RE.test(password),
    symbol: SYMBOL_RE.test(password),
    noCommon: !containsCommonPassword(password),
  }

  if (password.length === 0) {
    return { score: 0, entropyBits: 0, checklist }
  }

  const pool = estimatePoolSize(password) || 1
  const entropyBits = password.length * Math.log2(pool)

  let score: PasswordScore = 0
  if (entropyBits >= 28) score = 1
  if (entropyBits >= 36) score = 2
  if (entropyBits >= 60) score = 3
  if (entropyBits >= 80) score = 4

  // Common-password penalty caps the score regardless of entropy.
  if (!checklist.noCommon) {
    score = Math.min(score, 1) as PasswordScore
    if (password.length <= 8) score = 0
  }

  // Very short passwords cannot escape the bottom bucket even with
  // diverse classes.
  if (password.length < 6) score = 0

  return { score, entropyBits, checklist }
}
