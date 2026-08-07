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
 * Idempotent: an already-trusted package is reported as such.
 *
 * A PACKAGE THAT IS NOT ON THE REGISTRY CANNOT BE TRUSTED — the endpoint is
 * per-package and 404s for a name that does not exist. This file previously
 * claimed the opposite (that `createPackage` let OIDC create a package from
 * nothing, "proven" by 7 native bonds). That claim was false and was refuted by
 * the registry itself on 2026-08-07: of the 906 published `@molecule` packages,
 * the first-ever version of ALL 906 is attributed to `vialoh`, and ZERO to
 * `GitHub Actions`. OIDC has never created a package here. `createPackage` is
 * the permission a trusted publisher needs to publish a name it has not
 * published before — it is not a way to configure trust for a name npm has
 * never seen.
 *
 * So a brand-new package needs one bootstrap publish with a credential before
 * it can be trusted. `npm run check:publishable` reports which packages are in
 * that state so it surfaces at PR time instead of mid-release.
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
// Single-package mode: one request, and the registry's verbatim response. This is
// the safe way to test auth when a full run is failing, because it cannot feed
// npm's OTP-verification limiter the way a few hundred rejected calls do.
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').split('=')[1]
// How many requests are in flight. One OTP is valid for a single ~30s TOTP step,
// so this decides how much of the fleet fits per code: 6 covered ~317. Raising it
// is safe now that a rejection stops the run almost immediately — the limiter is
// fed by hundreds of REJECTED calls, not by accepted ones.
const CONCURRENCY =
  Number((args.find((a) => a.startsWith('--concurrency=')) || '').split('=')[1]) || 12

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
// --recheck ignores the saved state for SELECTION (results still merge into it),
// so every package is asked about again. Use it to confirm coverage: a package
// that is already configured answers "already", so anything reported as newly
// "trusted" was a genuine gap — and re-running fixes it in the same pass. This
// matters because state seeded by inference rather than by a response is a
// claim, not a fact.
const RECHECK = args.includes('--recheck')
const packages = RECHECK ? all : all.filter((name) => !doneAlready.has(name))

console.log(`${all.length} package(s) total -> ${TRUST_REPO} / ${TRUST_WORKFLOW}`)
if (RECHECK) {
  console.log('--recheck: ignoring saved state, asking about every package.')
  console.log('Expect nearly all to answer "already"; any reported as newly')
  console.log('trusted were gaps in the saved state and are now fixed.')
} else if (doneAlready.size > 0) {
  console.log(`${doneAlready.size} already trusted in a previous run — skipping.`)
}
console.log(`${packages.length} to check this run.`)

if (!WRITE) {
  console.log(`\npermissions: ${JSON.stringify(TRUST_PERMISSIONS)}`)
  console.log('Dry run. See the AUTH notes in this file, then re-run with --write --otp=CODE.')
  process.exit(0)
}
if (packages.length === 0 && !ONLY) {
  console.log('\nNothing left to trust.')
  process.exit(0)
}

const token = readNpmToken()
if (!token) {
  console.error('No auth token in ~/.npmrc — run `npm login` first.')
  process.exit(1)
}

if (ONLY) {
  const r = await trustPackage(ONLY, { token, otp: OTP })
  console.log(`\n${ONLY}\n  HTTP ${r.status}  ${r.outcome}\n  ${r.text}`)
  if (r.outcome === 'trusted' || r.outcome === 'already') {
    doneAlready.add(ONLY)
    writeFileSync(STATE_PATH, JSON.stringify([...doneAlready].sort(), null, 2))
    console.log('\nAuth works. Re-run without --only to continue the fleet.')
  }
  process.exit(r.outcome === 'trusted' || r.outcome === 'already' ? 0 : 1)
}

let ok = 0
let already = 0
let notPublished = 0
const failed = []
const succeeded = []
// Only the packages this run actually CREATED config for. Separate from
// `succeeded` (which also holds "already" answers) because under --recheck this
// list IS the finding: each entry was a package the saved state wrongly claimed.
const newlyTrusted = []
let stop = false
// The VERBATIM first auth-class rejection. An earlier version collapsed 401/429
// into a single "your OTP expired" message and discarded the response — which
// then confidently misdiagnosed a run that failed for a different reason. Never
// paraphrase this; print what the registry actually said.
let authFailure = null

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
          newlyTrusted.push(name)
        } else if (r.outcome === 'already') {
          already++
          succeeded.push(name)
        } else if (r.outcome === 'not-published') {
          notPublished++
        } else if (r.status === 401 || r.status === 429 || /OTP/i.test(r.text)) {
          // STOP ON THE FIRST ONE. Auth is systemic: every remaining package fails
          // the same way, and continuing walks into npm's OTP-verification limiter.
          if (!stop) {
            authFailure = { name, status: r.status, text: r.text }
            stop = true
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
      if (total > 0 && total % 50 === 0) {
        console.log(`  ${total}/${packages.length} (trusted:${ok} failed:${failed.length})`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
}

saveState()

// Count the UNION, not the sum. Adding the two lengths double-counts every
// package under --recheck, where each one is both already in the saved state and
// answered for again this run — which printed a cheerful "1820/910 trusted |
// -910 remaining".
const trustedTotal = new Set([...doneAlready, ...succeeded]).size
const remaining = all.length - trustedTotal
console.log(
  `\nThis run: trusted:${ok} already:${already} not-yet-published:${notPublished} failed:${failed.length}`,
)
console.log(`Overall:  ${trustedTotal}/${all.length} trusted | ${remaining} remaining`)

if (RECHECK && !authFailure && failed.length === 0) {
  if (ok === 0) {
    console.log(
      `\nVERIFIED: every one of the ${already} package(s) checked was already` +
        `\nconfigured. No gaps.`,
    )
  } else {
    console.log(
      `\nFOUND ${ok} GAP(S) — these were NOT actually trusted and have now been fixed:` +
        `\n  ${newlyTrusted.slice(0, 20).join('\n  ')}` +
        (ok > 20 ? `\n  …and ${ok - 20} more` : ''),
    )
  }
}

if (authFailure) {
  console.log(
    `\nStopped on an auth rejection. The registry's exact response, on ${authFailure.name}:\n\n` +
      `  HTTP ${authFailure.status}  ${authFailure.text}\n`,
  )
  if (ok > 0) {
    // Trusted a few hundred, then stopped: the code simply rolled over mid-run.
    console.log(
      `${ok} succeeded before this, so the code was valid and then expired — one OTP\n` +
        `covers a single ~30s TOTP step. Progress is saved; re-run with a fresh code\n` +
        `and it resumes at package ${trustedTotal + 1}.`,
    )
  } else {
    // Zero successes with a code the user believes is fresh means the OTP was not
    // the problem. Do NOT assert which cause it is — say what to check.
    console.log(
      `Nothing succeeded this run, so a fresh OTP is NOT the missing piece. Likely,\n` +
        `in order:\n` +
        `  1. npm's OTP-verification limiter is still cooling down from the previous\n` +
        `     run's rejected attempts. It clears on its own — wait ~30-60 min.\n` +
        `  2. The login session no longer satisfies 2FA for account-changing calls.\n` +
        `     Re-run \`npm login\` and take the browser flow again.\n` +
        `Check which by running one request by hand:\n` +
        `  node scripts/trust-publish-setup.mjs --write --otp=<code> --only=@molecule/api-scheduler`,
    )
  }
}
if (notPublished > 0) {
  console.log(`${notPublished} reported not-on-registry. That is unexpected: npm can trust a`)
  console.log(`package before it exists (createPackage), so investigate rather than`)
  console.log(`assuming these need a manual first publish.`)
}
if (failed.length > 0) {
  writeFileSync(join(ROOT, '.trust-failures.json'), JSON.stringify(failed, null, 2))
  failed.slice(0, 5).forEach((f) => console.log(`  ${f.name}: ${f.error}`))
  console.log('full list: molecule/.trust-failures.json')
  process.exit(1)
}
