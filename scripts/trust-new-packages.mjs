#!/usr/bin/env node
/**
 * Trust every new package, once, at the moment you push it.
 *
 * npm requires an interactive 2FA OTP to configure a trusted publisher and
 * explicitly refuses automation tokens for it — a granular token with "bypass
 * 2FA" is not accepted by `npm trust`. So this step cannot run in CI, no matter
 * how it is wired. What it CAN do is stop being a thing anyone has to remember:
 * the pre-push hook runs this, and if a package in the repo has no trusted
 * publisher yet it asks for one code and configures all of them together.
 *
 * Once configured, trust is a permanent per-package setting. That package never
 * needs a code again — not for its first publish, not for any later version.
 *
 * The package does NOT need to exist on npm. Trust config accepts a name npm
 * has never seen (`createPackage` is that permission), and CI then creates it
 * over OIDC. So this runs at push time, before the package has ever shipped.
 *
 * Non-interactive callers (CI, a piped shell) get a warning and exit 0 — a hook
 * that hangs waiting on a tty nobody is watching is worse than a late failure.
 *
 *   node scripts/trust-new-packages.mjs            # prompt if anything is untrusted
 *   node scripts/trust-new-packages.mjs --otp=123456
 *   node scripts/trust-new-packages.mjs --list     # report only, never prompt
 */
import console from 'node:console'
import { createReadStream, createWriteStream, openSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'

import { readNpmToken, trustPackage } from './lib/npm-trust.mjs'
import { readTrustLedger, TRUST_STATE_PATH, untrustedPackages } from './lib/untrusted.mjs'

const args = process.argv.slice(2)
const LIST_ONLY = args.includes('--list')
let otp = (args.find((a) => a.startsWith('--otp=')) || '').split('=')[1]

const untrusted = untrustedPackages()

// The common case by far: nothing new, no output, no network call, no delay.
if (!untrusted.length) process.exit(0)

if (process.env.MOL_SKIP_TRUST === '1') {
  console.error(
    `MOL_SKIP_TRUST=1 — skipping trust config for ${untrusted.length} package(s).\n` +
      `They will be skipped by the next release until \`npm run trust:new\` runs.`,
  )
  process.exit(0)
}

console.log(`\n${untrusted.length} package(s) have no trusted publisher yet:`)
for (const pkg of untrusted) console.log(`  ${pkg.name}`)
console.log(
  `\nUntil they are trusted, npm rejects their OIDC publish and the release\n` +
    `skips them silently. This is a one-time step per package.\n`,
)

if (LIST_ONLY) process.exit(1)

const token = readNpmToken()
if (!token) {
  console.error('Not logged in to npm. Run `npm login`, then push again.')
  process.exit(1)
}

const whoami = await fetch('https://registry.npmjs.org/-/whoami', {
  headers: { authorization: `Bearer ${token}` },
})
if (!whoami.ok) {
  // A dead token 401s identically to a 2FA rejection on the trust endpoint,
  // which is how an expired session once got diagnosed as "npm requires an OTP
  // here" and sent this repo chasing the wrong constraint for hours.
  console.error(
    `The npm token in ~/.npmrc is not valid (whoami -> ${whoami.status}).\n` +
      `Run \`npm login\`, then push again.`,
  )
  process.exit(1)
}

if (!otp) {
  // Always prompt on /dev/tty, never on process.stdin. A git hook's stdin is
  // the ref list git pipes in, so a stdin prompt reads a ref and returns
  // instantly without the user ever seeing the question. /dev/tty is the
  // controlling terminal in both a plain shell and a hook; if it cannot be
  // opened, nobody is watching and there is nothing to wait for.
  let input
  let output
  try {
    // openSync THROWS synchronously when there is no controlling terminal.
    // createReadStream('/dev/tty') does not — it emits an async 'error' event
    // that a try/catch cannot see, so the catch below would never run and the
    // prompt would hang forever in CI. Open the fd first, stream from the fd.
    const fd = openSync('/dev/tty', 'r+')
    input = createReadStream('', { fd, autoClose: false })
    output = createWriteStream('', { fd, autoClose: false })
  } catch (_error) {
    // Intentionally ignored: no controlling terminal means no human to answer,
    // and a hook that blocks forever on an unwatched tty is worse than letting
    // the push through with the warning already printed above.
    console.error('No terminal for the OTP prompt — skipping.')
    console.error('Run `npm run trust:new` from a shell to finish this.')
    process.exit(0)
  }
  const rl = createInterface({ input, output })
  otp = (await rl.question('npm OTP (6 digits): ')).trim()
  rl.close()
  input.destroy()
  output.destroy()
}

if (!/^\d{6}$/.test(otp)) {
  console.error('That is not a 6-digit code. Run `npm run trust:new` to retry.')
  process.exit(1)
}

const ledger = readTrustLedger()
const failed = []

for (const pkg of untrusted) {
  const result = await trustPackage(pkg.name, { token, otp })
  if (result.outcome === 'trusted' || result.outcome === 'already') {
    ledger.add(pkg.name)
    console.log(`  ✓ ${pkg.name}`)
  } else {
    console.error(`  ✗ ${pkg.name}: ${result.status} ${result.text}`)
    failed.push(pkg.name)
  }
}

// Persist after every attempt, not at the end: a code can expire partway
// through a long sweep, and losing the successes to an exception means redoing
// them with a fresh code for no reason.
writeFileSync(TRUST_STATE_PATH, `${JSON.stringify([...ledger].sort(), null, 2)}\n`)

if (failed.length) {
  console.error(
    `\n${failed.length} failed. If the code expired mid-run, the successes above\n` +
      `are saved — run \`npm run trust:new\` with a fresh code to finish.`,
  )
  process.exit(1)
}

console.log(
  `\nTrusted ${untrusted.length}. Commit .trust-state.json; no code needed for these again.`,
)
