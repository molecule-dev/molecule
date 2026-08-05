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

const packages = discover()
console.log(`${packages.length} package(s) to trust -> ${TRUST_REPO} / ${TRUST_WORKFLOW}`)

if (!WRITE) {
  console.log(`\npermissions: ${JSON.stringify(TRUST_PERMISSIONS)}`)
  console.log('Dry run. See the AUTH notes in this file, then re-run with --write --otp=CODE.')
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
let stop = false

// Concurrent: npm's 2FA window is short and 900 sequential calls will not fit.
// Trust config is an account change, not a publish, so the publish rate limiter
// does not apply here.
{
  let cursor = 0
  const worker = async () => {
    while (cursor < packages.length && !stop) {
      const name = packages[cursor++]
      try {
        const r = await trustPackage(name, { token, otp: OTP })
        if (r.outcome === 'trusted') {
          ok++
        } else if (r.outcome === 'already') {
          already++
        } else if (r.outcome === 'not-published') {
          notPublished++
        } else {
          failed.push({ name, error: `${r.status} ${r.text}` })
          // Bail on a real failure streak rather than enumerating error codes: an
          // earlier version stopped only on specific ones and ground through
          // hundreds of identical failures when the code changed.
          if (failed.length >= 3) {
            stop = true
            console.error(
              `\nstopping after ${failed.length} failures (last: ${name} — ${r.status})`,
            )
          }
        }
      } catch (error) {
        failed.push({ name, error: String(error.message).slice(0, 150) })
      }
      const total = ok + already + notPublished + failed.length
      if (total % 50 === 0) {
        console.log(
          `  ${total}/${packages.length} (trusted:${ok} already:${already} unpublished:${notPublished} failed:${failed.length})`,
        )
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
}

console.log(
  `\nDONE. trusted:${ok} already:${already} not-yet-published:${notPublished} failed:${failed.length}`,
)
if (notPublished > 0) {
  console.log(`${notPublished} not on the registry yet — use bootstrap-new-packages.mjs for those.`)
}
if (failed.length > 0) {
  writeFileSync(join(ROOT, '.trust-failures.json'), JSON.stringify(failed, null, 2))
  failed.slice(0, 5).forEach((f) => console.log(`  ${f.name}: ${f.error}`))
  console.log('full list: molecule/.trust-failures.json')
  process.exit(1)
}
