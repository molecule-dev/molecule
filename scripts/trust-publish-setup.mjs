#!/usr/bin/env node
/**
 * Configure npm trusted publishing (OIDC) for every `@molecule/*` package.
 *
 * Trusted publishing replaces a long-lived NPM_TOKEN with a short-lived OIDC
 * token minted per CI run, so nothing publishable sits at rest in a secret store.
 * It must be configured PER PACKAGE, which at 903 packages means a loop.
 *
 * AUTH — read this before running:
 * `npm trust` is an account-changing operation, so npm REFUSES it from a granular
 * token with "bypass 2FA" enabled:
 *
 *   403 — "Granular access tokens that bypass two-factor authentication may not
 *          perform this action."
 *
 * `--otp` does not help; the token TYPE is rejected, not the challenge. So:
 *
 *   1. mv ~/.npmrc ~/.npmrc.token-backup     # set the bypass token aside
 *   2. npm login                             # browser flow, satisfies 2FA
 *   3. On npmjs.com, take the "skip 2FA for the next 5 minutes" option that
 *      appears during the first challenge — otherwise every package prompts.
 *   4. node scripts/trust-publish-setup.mjs --write
 *
 * Idempotent: re-running is safe, and an already-trusted package is reported as
 * such rather than treated as an error. Failures are written to
 * .trust-failures.json so a follow-up run can target only what is left.
 *
 *   node scripts/trust-publish-setup.mjs            # dry run — list what it would do
 *   node scripts/trust-publish-setup.mjs --write    # apply
 *   node scripts/trust-publish-setup.mjs --write --delay 2
 */
import { execFileSync } from 'node:child_process'
import console from 'node:console'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const WRITE = args.includes('--write')
const delayIdx = args.indexOf('--delay')
const DELAY_S = delayIdx === -1 ? 1 : Number(args[delayIdx + 1])

const REPO = 'molecule-dev/molecule'
const WORKFLOW = 'release.yml'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Every publishable `@molecule` package name.
 *
 * @returns Sorted package names.
 */
function discover() {
  const names = []
  const walk = (dir, depth) => {
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
    if (!depth) return
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue
      const child = join(dir, entry)
      try {
        if (statSync(child).isDirectory()) walk(child, depth - 1)
      } catch (_error) {
        // Vanished mid-walk.
      }
    }
  }
  walk(join(ROOT, 'packages'), 4)
  return names.sort()
}

const packages = discover()
console.log(`${packages.length} package(s) to trust → ${REPO} / ${WORKFLOW}`)

if (!WRITE) {
  packages
    .slice(0, 5)
    .forEach((n) => console.log(`  npm trust github ${n} --file ${WORKFLOW} --repo ${REPO} --yes`))
  console.log(`  …and ${packages.length - 5} more`)
  console.log(
    '\nDry run — nothing sent. See the AUTH steps in this file, then re-run with --write.',
  )
  process.exit(0)
}

let ok = 0
let already = 0
const failed = []

for (const [index, name] of packages.entries()) {
  try {
    execFileSync('npm', ['trust', 'github', name, '--file', WORKFLOW, '--repo', REPO, '--yes'], {
      cwd: ROOT,
      stdio: 'pipe',
      encoding: 'utf8',
    })
    ok++
  } catch (error) {
    const out = `${error.stdout ?? ''}${error.stderr ?? ''}`
    if (/already (exists|trusted)|duplicate/i.test(out)) {
      already++
    } else {
      failed.push({
        name,
        error: out.split('\n').filter(Boolean).slice(-2).join(' ').slice(0, 200),
      })
      // A 403 here means the auth problem above — every subsequent call fails the
      // same way, so stop rather than grinding through 900 identical failures.
      if (/E403|403 Forbidden|bypass two-factor/i.test(out)) {
        console.error(`\n✗ ${name}: ${failed.at(-1).error}`)
        console.error('\nAuth rejected — see the AUTH steps at the top of this file.')
        break
      }
    }
  }

  if ((index + 1) % 25 === 0)
    console.log(
      `  ${index + 1}/${packages.length} (ok:${ok} already:${already} failed:${failed.length})`,
    )
  if (DELAY_S) await sleep(DELAY_S * 1000)
}

console.log(`\nDONE. trusted:${ok} already:${already} failed:${failed.length}`)
if (failed.length) {
  writeFileSync(join(ROOT, '.trust-failures.json'), JSON.stringify(failed, null, 2))
  console.log('failures → molecule/.trust-failures.json')
}
