#!/usr/bin/env node
/**
 * Configure npm trusted publishing (OIDC) for every `@molecule` package.
 *
 * Trusted publishing replaces a long-lived NPM_TOKEN with a short-lived OIDC
 * token minted per CI run, so nothing publishable sits at rest in a secret store.
 * It must be configured PER PACKAGE — npm has no scope- or org-level setting —
 * which at 900+ packages means a loop.
 *
 * It POSTs the config directly rather than running `npm trust github`, which is
 * broken in npm 11.12.1 — see scripts/lib/npm-trust.mjs for the details.
 *
 * AUTH: needs a token in ~/.npmrc from `npm login`. A granular token with
 * "bypass 2FA" is REFUSED for trust config — it counts as an account change.
 * Trust config is 2FA-protected, so pass a current code:
 *
 *   npm login
 *   node scripts/trust-publish-setup.mjs --write --otp=123456
 *
 * Idempotent: an already-trusted package is reported as such, and a package not
 * yet on the registry is counted separately — those need a first publish, see
 * bootstrap-new-packages.mjs.
 *
 *   node scripts/trust-publish-setup.mjs                      # dry run
 *   node scripts/trust-publish-setup.mjs --write --otp=123456
 */
import console from 'node:console'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  readNpmToken,
  TRUST_PERMISSIONS,
  TRUST_REPO,
  TRUST_WORKFLOW,
  trustPackage,
} from './lib/npm-trust.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const WRITE = args.includes('--write')
const OTP = (args.find((a) => a.startsWith('--otp=')) || '').split('=')[1]

/**
 * Every publishable `@molecule` package name, at any directory depth.
 *
 * @returns Sorted package names.
 */
function discover() {
  const names = []
  const walk = (dir) => {
    const manifest = join(dir, 'package.json')
    if (existsSync(manifest)) {
      try {
        const pkg = JSON.parse(readFileSync(manifest, 'utf8'))
        if (pkg.name?.startsWith('@molecule/') && !pkg.private) {
          names.push(pkg.name)
          return
        }
      } catch (_error) {
        // Unreadable manifest — keep descending.
      }
    }
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue
      const child = join(dir, entry)
      try {
        if (statSync(child).isDirectory()) walk(child)
      } catch (_error) {
        // Vanished mid-walk.
      }
    }
  }
  walk(join(ROOT, 'packages'))
  return names.sort()
}

const all = discover()

// RESUME STATE. One OTP is good for roughly ONE TOTP step, which in practice
// covers ~300 packages at this concurrency — so 910 takes several runs, and
// without this every re-run would spend the fresh code re-trusting packages that
// are already done. Observed 2026-08-05: a run trusted 317 and then took a wall
// of 401s as the code rolled over. Skipping locally costs zero requests, so the
// whole of each new OTP window goes to packages that still need it.
const STATE_PATH = join(ROOT, '.trust-state.json')
const doneAlready = new Set(
  existsSync(STATE_PATH) ? JSON.parse(readFileSync(STATE_PATH, 'utf8')) : [],
)
const packages = all.filter((name) => !doneAlready.has(name))

console.log(`${all.length} package(s) total -> ${TRUST_REPO} / ${TRUST_WORKFLOW}`)
if (doneAlready.size > 0) {
  console.log(`${doneAlready.size} already trusted in a previous run — skipping.`)
}
console.log(`${packages.length} remaining this run.`)

if (!WRITE) {
  console.log(`\npermissions: ${JSON.stringify(TRUST_PERMISSIONS)}`)
  console.log('Dry run. See the AUTH notes in this file, then re-run with --write --otp=CODE.')
  process.exit(0)
}
if (packages.length === 0) {
  console.log('\nNothing left to trust.')
  process.exit(0)
}

const token = readNpmToken()
if (!token) {
  console.error('No auth token in ~/.npmrc — run `npm login` first.')
  process.exit(1)
}

let ok = 0
let already = 0
let notPublished = 0
const failed = []
const succeeded = []
let stop = false
let otpExpired = false

/** Persists everything trusted so far, so a re-run skips it without a request. */
const saveState = () =>
  writeFileSync(STATE_PATH, JSON.stringify([...doneAlready, ...succeeded].sort(), null, 2))

// Concurrent: an OTP is valid for one short TOTP step, so sequential calls would
// waste most of the window. Trust config is an account change, not a publish, so
// the publish rate limiter does not apply — but OTP VERIFICATION has its own
// limiter (429 "OTP verification failed"), which is why an expired code must stop
// the run instantly rather than being retried across hundreds of packages.
{
  let cursor = 0
  const worker = async () => {
    while (cursor < packages.length && !stop) {
      const name = packages[cursor++]
      try {
        const r = await trustPackage(name, { token, otp: OTP })
        if (r.outcome === 'trusted') {
          ok++
          succeeded.push(name)
        } else if (r.outcome === 'already') {
          already++
          succeeded.push(name)
        } else if (r.outcome === 'not-published') {
          notPublished++
        } else if (r.status === 401 || r.status === 429 || /OTP/i.test(r.text)) {
          // STOP ON THE FIRST ONE. This is the OTP expiring, which is systemic —
          // every remaining package will fail the same way, and continuing walks
          // straight into npm's OTP-verification rate limit.
          if (!stop) {
            stop = true
            otpExpired = true
          }
        } else {
          failed.push({ name, error: `${r.status} ${r.text}` })
          if (failed.length >= 3) {
            stop = true
          }
        }
      } catch (error) {
        failed.push({ name, error: String(error.message).slice(0, 150) })
      }
      const total = ok + already + notPublished + failed.length
      if (total % 50 === 0) {
        console.log(`  ${total}/${packages.length} (trusted:${ok} failed:${failed.length})`)
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
}

saveState()

const trustedTotal = doneAlready.size + succeeded.length
const remaining = all.length - trustedTotal
console.log(
  `\nThis run: trusted:${ok} already:${already} not-yet-published:${notPublished} failed:${failed.length}`,
)
console.log(`Overall:  ${trustedTotal}/${all.length} trusted | ${remaining} remaining`)

if (otpExpired) {
  console.log(
    `\nThe OTP expired — one code covers a single ~30s TOTP step, which is about\n` +
      `300 packages at this concurrency. Progress is saved, so just run it again\n` +
      `with a FRESH code and it will pick up at package ${trustedTotal + 1}:\n\n` +
      `  node scripts/trust-publish-setup.mjs --write --otp=<new code>\n\n` +
      `Wait for your authenticator to roll to a new code first — reusing the one\n` +
      `that just failed trips npm's OTP-verification limiter (429).`,
  )
}
if (notPublished > 0) {
  console.log(`${notPublished} not on the registry yet — use bootstrap-new-packages.mjs for those.`)
}
if (failed.length > 0) {
  writeFileSync(join(ROOT, '.trust-failures.json'), JSON.stringify(failed, null, 2))
  failed.slice(0, 5).forEach((f) => console.log(`  ${f.name}: ${f.error}`))
  console.log('full list: molecule/.trust-failures.json')
  process.exit(1)
}
