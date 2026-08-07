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
import process from 'node:process'

import { collectPackages, untrustedPackages } from './lib/untrusted.mjs'

const WARN_ONLY = process.argv.includes('--warn')

const packages = collectPackages()
const untrusted = untrustedPackages()

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
  `\nTrust them all in one go — no local publish is needed for any of them,\n` +
    `including the ones npm has never seen:\n` +
    `  npm run trust:new\n\n` +
    `It asks for ONE OTP and covers every package listed above. npm requires an\n` +
    `interactive code here and refuses automation tokens for trust config, so\n` +
    `this cannot run in CI — but it is once per package, ever. The pre-push hook\n` +
    `runs it for you when a new package appears.`,
)
process.exit(WARN_ONLY ? 0 : 1)
