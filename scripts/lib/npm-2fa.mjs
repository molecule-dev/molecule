/**
 * Local TOTP self-service for npm's 2FA prompts.
 *
 * npm's trust endpoint requires an `npm-otp` header on EVERY call and the
 * codes are single-use, so a sweep over N new packages costs N codes — that
 * is why `npm run trust:new` used to prompt over and over. With the
 * authenticator's SECRET stored locally, this module generates valid codes
 * on demand and the interactive prompts disappear entirely.
 *
 * The seed lives at SEED_PATH with mode 0600. Storing it reduces 2FA to
 * "something this machine has" — a deliberate one-time trade made at
 * enrollment (the prompt itself offers it), never behind the user's back.
 *
 * @module
 */

import { createHmac } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/** Overridable so tests can point the seed at a scratch dir. */
export const SEED_PATH =
  process.env.MOL_NPM_TOTP_SEED ?? join(homedir(), '.config', 'molecule', 'npm-2fa-seed')

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/**
 * RFC 4648 base32 decode.
 *
 * @param {string} input - Base32 text (padding, spaces and dashes tolerated).
 * @returns {Buffer | null} Decoded bytes, or null when the text is not base32.
 */
export function base32Decode(input) {
  const clean = input.replace(/[\s-]/g, '').replace(/=+$/, '').toUpperCase()
  if (!clean.length || !/^[A-Z2-7]+$/.test(clean)) return null
  let bits = 0
  let value = 0
  const out = []
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch)
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

/**
 * RFC 4648 base32 encode (no padding).
 *
 * @param {Buffer} buf - Raw bytes.
 * @returns {string} Base32 text.
 */
export function base32Encode(buf) {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

/**
 * RFC 6238 TOTP (SHA-1, 30 s period — authenticator-app defaults, which is
 * what npm's 2FA uses).
 *
 * @param {Buffer} secret - Raw seed bytes.
 * @param {{ now?: number, period?: number, digits?: number }} [opts]
 * @returns {string} The zero-padded code.
 */
export function totp(secret, { now = Date.now(), period = 30, digits = 6 } = {}) {
  const counter = Math.floor(now / 1000 / period)
  const msg = Buffer.alloc(8)
  msg.writeBigUInt64BE(BigInt(counter))
  const mac = createHmac('sha1', secret).update(msg).digest()
  const off = mac[mac.length - 1] & 0xf
  const bin =
    ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3]
  return String(bin % 10 ** digits).padStart(digits, '0')
}

/**
 * Seconds until the current TOTP window rolls over.
 *
 * @param {number} [now] - Epoch millis.
 * @param {number} [period] - Window length in seconds.
 * @returns {number} Seconds remaining (>= 1).
 */
export function secondsLeftInWindow(now = Date.now(), period = 30) {
  return Math.max(1, period - Math.floor((now / 1000) % period))
}

/**
 * Accepts a bare base32 secret or an otpauth:// URI (the text an
 * authenticator app shows when you reveal or re-enroll a setup code).
 *
 * @param {string} text - User input.
 * @returns {Buffer | null} The raw seed bytes, or null when unparseable.
 */
export function parseSecret(text) {
  const t = text.trim()
  if (t.toLowerCase().startsWith('otpauth://')) {
    try {
      const secret = new URL(t).searchParams.get('secret')
      const buf = secret ? base32Decode(secret) : null
      return buf && buf.length >= 10 ? buf : null
    } catch {
      return null
    }
  }
  const buf = base32Decode(t)
  return buf && buf.length >= 10 ? buf : null
}

/**
 * Reads the stored seed.
 *
 * @returns {Buffer | null} Seed bytes, or null when none is stored.
 */
export function loadSeed() {
  if (!existsSync(SEED_PATH)) return null
  let text
  try {
    text = readFileSync(SEED_PATH, 'utf8')
  } catch {
    return null
  }
  const buf = base32Decode(text)
  return buf && buf.length >= 10 ? buf : null
}

/**
 * Writes the seed with mode 0600.
 *
 * @param {Buffer} buf - Raw seed bytes.
 */
export function storeSeed(buf) {
  mkdirSync(dirname(SEED_PATH), { recursive: true })
  writeFileSync(SEED_PATH, `${base32Encode(buf)}\n`, { mode: 0o600 })
}

// Standalone enrollment: `node scripts/lib/npm-2fa.mjs <secret|otpauth-uri>`
// stores the seed and prints the current code, so the one-time setup does not
// have to wait for a trust:new run to prompt.
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const parsed = parseSecret(process.argv[2] ?? '')
  if (!parsed) {
    console.error('usage: node scripts/lib/npm-2fa.mjs <base32-secret | otpauth:// URI>')
    process.exit(1)
  }
  storeSeed(parsed)
  console.log(`seed stored at ${SEED_PATH} (mode 0600); current code: ${totp(parsed)}`)
}
