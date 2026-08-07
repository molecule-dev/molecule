#!/usr/bin/env node
/**
 * Report every package CI cannot publish because it was never trusted.
 *
 * `release.yml` authenticates with OIDC and nothing else, and npm resolves that
 * per package: `npm publish` exchanges the GitHub OIDC token by looking up THAT
 * package's trusted-publisher config. No config, no exchange, ENEEDAUTH — and
 * publish-paced skips it and carries on, so the release reports success while
 * quietly shipping less than it should.
 *
 * Whether the package already exists on the registry is irrelevant here: a name
 * npm has never seen can be trusted too (`createPackage` is exactly that
 * permission), and CI then creates it. The seven `@molecule/app-*-react-native`
 * bonds were trusted while unpublished on 2026-08-05 and published by
 * `GitHub Actions`, attested, with no local publish. So there is ONE failure
 * mode, not two, and this checks for it.
 *
 * It is a sweep-vs-time problem: scripts/trust-publish-setup.mjs trusts the
 * packages that exist when it runs, and every package added after that sweep is
 * untrusted until someone re-runs it. Nothing in the source tree shows that,
 * which is why a new package clears every other gate and then fails at publish.
 *
 * Trust state comes from `.trust-state.json`, the ledger that script writes,
 * because npm's trust endpoint is 2FA-gated on READS as well as writes and so
 * cannot be queried from an unattended job. That makes this a record of what we
 * did rather than an observation of npm — a package trusted outside this script
 * reads as untrusted. Erring that way is deliberate: a false "needs trusting"
 * costs a glance, a false "fine" costs a release.
 *
 *   node scripts/check-publishable.mjs          # exit 1 when anything is untrusted
 *   node scripts/check-publishable.mjs --warn   # always exit 0, still report
 */
import console from 'node:console'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const WARN_ONLY = process.argv.includes('--warn')

/**
 * Collects every publishable package in the monorepo.
 *
 * Walks to arbitrary depth on purpose. A fixed three-or-four-segment glob under
 * `packages/` misses the react-native bonds, which sit one level deeper under
 * `packages/app/native/<capability>/react-native/` — and a scan that skipped
 * exactly those seven was how this repo talked itself into believing OIDC
 * could not create packages.
 *
 * @param dir - Directory to walk.
 * @param found - Accumulator.
 * @returns Package `{ name, version }` records.
 */
const collect = (dir, found = []) => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (!statSync(full).isDirectory()) continue
    const manifest = join(full, 'package.json')
    if (existsSync(manifest)) {
      try {
        const json = JSON.parse(readFileSync(manifest, 'utf8'))
        if (json.name?.startsWith('@molecule/') && !json.private) {
          found.push({ name: json.name, version: json.version })
          continue
        }
      } catch (error) {
        // An unparseable manifest is a different gate's problem (lint and build
        // both fail on it); reporting it here would only duplicate that noise.
        console.warn(`  ! skipped unreadable ${manifest}: ${error.message}`)
      }
    }
    collect(full, found)
  }
  return found
}

const packages = collect(join(ROOT, 'packages'))

const trustPath = join(ROOT, '.trust-state.json')
const trusted = new Set(existsSync(trustPath) ? JSON.parse(readFileSync(trustPath, 'utf8')) : [])

const untrusted = packages
  .filter((pkg) => !trusted.has(pkg.name))
  .sort((a, b) => a.name.localeCompare(b.name))

console.log(`Checked ${packages.length} publishable packages against the trust ledger.`)

if (!untrusted.length) {
  console.log('All trusted. CI can publish every one.')
  process.exit(0)
}

console.log(
  `\nUNTRUSTED (${untrusted.length}) — OIDC will be rejected and publish-paced will skip:`,
)
for (const pkg of untrusted) console.log(`  ${pkg.name}@${pkg.version}`)

console.log(
  `\nTrust them in one sweep, then re-run Release. No local publish is needed\n` +
    `for any of them, including the ones npm has never seen:\n` +
    `  node scripts/trust-publish-setup.mjs --write [--otp=<code>]\n` +
    `A prior note here claimed trust config always demands an OTP because npm\n` +
    `counts it as an account change. That is UNVERIFIED — the run it came from\n` +
    `used a token that is now dead on /-/whoami too, so its 401 said nothing\n` +
    `about 2FA. Try without --otp first; if npm asks, it asks.`,
)
process.exit(WARN_ONLY ? 0 : 1)
