#!/usr/bin/env node
/**
 * Report every package CI cannot publish on its own.
 *
 * The Release/Publish workflows authenticate with OIDC and nothing else, so a
 * package they can publish must satisfy two conditions that are invisible from
 * the source tree:
 *
 *   1. it EXISTS on the registry — npm's trust endpoint is per-package and 404s
 *      for a name it has never seen, so a brand-new package cannot be trusted,
 *      and therefore cannot be published, until something creates it once;
 *   2. it is TRUSTED — a GitHub Actions trusted publisher is configured for it.
 *
 * Neither is derivable from package.json, which is why a new package sails
 * through every other gate and then fails at publish time with an opaque
 * `ENEEDAUTH` — the failure mode this exists to move earlier. Run it in CI and
 * the need for a bootstrap surfaces on the PR that adds the package.
 *
 * Trust state is read from `.trust-state.json`, the ledger written by
 * scripts/trust-publish-setup.mjs, because npm's trust endpoint is 2FA-gated on
 * READS as well as writes and so cannot be queried from an unattended job. That
 * makes the trust half a record of what we did, not an observation of npm — a
 * package trusted outside this script reads as untrusted here. Erring that way
 * is deliberate: a false "needs bootstrap" costs a glance, a false "fine" costs
 * a failed release.
 *
 *   node scripts/check-publishable.mjs          # exit 1 if anything needs a bootstrap
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
        // An unparseable manifest is a different gate's problem (lint/build will
        // fail on it); reporting it here would just duplicate that noise.
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

/**
 * Asks the registry whether a package exists.
 *
 * @param name - Package name.
 * @returns True when the registry serves it.
 */
const exists = async (name) => {
  const res = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2f')}`, {
    method: 'HEAD',
    signal: AbortSignal.timeout(15_000),
  })
  return res.status !== 404
}

const missing = []
const untrusted = []

for (let i = 0; i < packages.length; i += 40) {
  await Promise.all(
    packages.slice(i, i + 40).map(async (pkg) => {
      if (!(await exists(pkg.name))) missing.push(pkg)
      else if (!trusted.has(pkg.name)) untrusted.push(pkg)
    }),
  )
}

console.log(`Checked ${packages.length} publishable packages.`)

if (missing.length) {
  console.log(`\nNOT ON THE REGISTRY (${missing.length}) — need one bootstrap publish:`)
  for (const pkg of missing.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  ${pkg.name}@${pkg.version}`)
  }
}

if (untrusted.length) {
  console.log(
    `\nPUBLISHED BUT NOT IN THE TRUST LEDGER (${untrusted.length}) — OIDC will be rejected:`,
  )
  for (const pkg of untrusted.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  ${pkg.name}`)
  }
}

if (!missing.length && !untrusted.length) {
  console.log('All packages are on the registry and trusted. CI can publish every one.')
  process.exit(0)
}

console.log(
  `\nFix both classes in one pass — bootstrap the missing names, then trust everything:\n` +
    `  npm run bootstrap:new-packages\n` +
    `  node scripts/trust-publish-setup.mjs --write --otp=<code>\n` +
    `Until then these are skipped by publish-paced and the release is incomplete.`,
)
process.exit(WARN_ONLY ? 0 : 1)
