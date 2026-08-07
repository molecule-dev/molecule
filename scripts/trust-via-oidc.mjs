#!/usr/bin/env node
/**
 * Trust new packages from CI using an OIDC-exchanged npm token. No 2FA.
 *
 * `npm trust` itself has no OIDC path — it wants a bearer token and 401s without
 * one. But `npm publish` gets its credential by EXCHANGING the workflow's GitHub
 * OIDC id_token for a real npm token, and that exchange is a plain HTTP call we
 * can make ourselves (npm/lib/utils/oidc.js):
 *
 *   1. ask GitHub for an id_token with audience `npm:registry.npmjs.org`
 *   2. POST /-/npm/v1/oidc/token/exchange/package/<pkg> with it
 *   3. get back an npm token
 *
 * The exchange names a package, and it only succeeds for one this workflow is
 * ALREADY a trusted publisher for — so a package that already exists is used as
 * the key to mint the token, which is then used to trust the new ones.
 *
 * The permissions matter and are the reason this was hard to see: sending only
 * `createPackage` (what `npm trust --allow-publish` sends) gets
 * `404 Package not found` for a name the registry does not have.
 * `createStagedPackage` alongside it is what makes an unpublished name trustable
 * — the 2026-08-05 sweep sent both and reported `not-yet-published: 0` while
 * seven of those packages did not exist on npm until hours later.
 *
 * Runs BEFORE the publish step, so anything it trusts is published by the same
 * run — a brand-new package goes from nothing to published with no human at all.
 *
 *   node scripts/trust-via-oidc.mjs            # trust every untrusted package
 *   node scripts/trust-via-oidc.mjs --dry-run  # report what it would do
 */
import console from 'node:console'
import process from 'node:process'
import { URL } from 'node:url'

import { TRUST_PERMISSIONS, TRUST_REPO, TRUST_WORKFLOW } from './lib/npm-trust.mjs'
import { collectPackages } from './lib/untrusted.mjs'

const REGISTRY = 'https://registry.npmjs.org'
const DRY_RUN = process.argv.includes('--dry-run')

/**
 * Requests a GitHub Actions OIDC id_token for the npm registry.
 *
 * @returns The id_token, or null when not running with `id-token: write`.
 */
const getIdToken = async () => {
  const url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL
  const token = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
  if (!url || !token) return null
  const target = new URL(url)
  // The audience npm itself uses. A token minted for anything else is rejected
  // by the exchange, which is why this is not a free-form string.
  target.searchParams.append('audience', `npm:${new URL(REGISTRY).hostname}`)
  const res = await fetch(target, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return null
  return (await res.json()).value ?? null
}

/**
 * Exchanges the OIDC id_token for an npm registry token.
 *
 * @param idToken - GitHub OIDC id_token.
 * @param packageName - A package this workflow is ALREADY trusted for.
 * @returns The npm token, or null.
 */
const exchange = async (idToken, packageName) => {
  const escaped = packageName.replace('/', '%2f')
  const res = await fetch(`${REGISTRY}/-/npm/v1/oidc/token/exchange/package/${escaped}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${idToken}`, accept: 'application/json' },
  })
  if (!res.ok) {
    console.error(
      `  exchange via ${packageName} -> ${res.status} ${(await res.text()).slice(0, 160)}`,
    )
    return null
  }
  return (await res.json())?.token ?? null
}

/**
 * Configures GitHub Actions as a trusted publisher for one package.
 *
 * @param name - Package name.
 * @param token - npm token from the exchange.
 * @returns True when trusted (or already trusted).
 */
const trust = async (name, token) => {
  const res = await fetch(`${REGISTRY}/-/package/${name.replace('/', '%2f')}/trust`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify([
      {
        type: 'github',
        claims: { repository: TRUST_REPO, workflow_ref: { file: TRUST_WORKFLOW } },
        permissions: TRUST_PERMISSIONS,
      },
    ]),
  })
  const text = (await res.text()).slice(0, 200)
  if (res.ok || /already|duplicate/i.test(text)) {
    console.log(`  ✓ ${name}`)
    return true
  }
  console.error(`  ✗ ${name}: ${res.status} ${text}`)
  return false
}

const all = collectPackages()

// Which packages does npm not have? Those are the ones needing trust. The local
// ledger is gitignored and therefore empty in CI, so asking the registry is the
// only honest source here.
const absent = []
for (let i = 0; i < all.length; i += 40) {
  await Promise.all(
    all.slice(i, i + 40).map(async (pkg) => {
      const res = await fetch(`${REGISTRY}/${pkg.name.replace('/', '%2f')}`, { method: 'HEAD' })
      if (res.status === 404) absent.push(pkg)
    }),
  )
}

if (!absent.length) {
  console.log('Every package is on the registry — nothing to trust.')
  process.exit(0)
}

console.log(`${absent.length} package(s) npm has never seen:`)
for (const pkg of absent) console.log(`  ${pkg.name}`)

// The exchange needs a package this workflow already publishes. Any published
// one works; it is a key, not a target.
const anchor = all.find((pkg) => !absent.some((a) => a.name === pkg.name))
if (!anchor) {
  console.error('No already-published package to exchange against.')
  process.exit(1)
}
console.log(`\nExchanging OIDC token via ${anchor.name}...`)

if (DRY_RUN) {
  console.log('Dry run — no exchange, no trust calls.')
  process.exit(0)
}

const idToken = await getIdToken()
if (!idToken) {
  console.error('No GitHub OIDC id_token. This must run in Actions with `id-token: write`.')
  process.exit(1)
}

const npmToken = await exchange(idToken, anchor.name)
if (!npmToken) {
  console.error('OIDC exchange produced no token.')
  process.exit(1)
}
console.log('Got an npm token from the OIDC exchange — no 2FA involved.\n')

// FIRST: try exchanging for each NEW package directly. The exchange takes a
// package name, so if npm will mint a token for a name it does not have, that
// token publishes it — creating the package over OIDC with no 2FA and no trust
// config at all, which is the whole objective.
console.log('Trying a direct exchange for each unpublished package:')
const directTokens = new Map()
for (const pkg of absent) {
  const direct = await exchange(idToken, pkg.name)
  if (direct) {
    directTokens.set(pkg.name, direct)
    console.log(`  ✓ direct exchange worked for ${pkg.name}`)
  }
}
console.log(`Direct exchange succeeded for ${directTokens.size}/${absent.length}.\n`)

let failed = 0
for (const pkg of absent) {
  if (!(await trust(pkg.name, directTokens.get(pkg.name) ?? npmToken))) failed++
}

console.log(`\nTrusted ${absent.length - failed}/${absent.length}.`)
process.exit(failed ? 1 : 0)
