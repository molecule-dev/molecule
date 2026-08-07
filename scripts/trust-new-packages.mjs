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
 * A package npm has never seen is CREATED here first, because npm's trust
 * endpoint 404s on a name that does not exist. Each step consumes a one-time
 * code, so this asks for a fresh one whenever npm says the last is spent rather
 * than failing four of five packages after a single prompt.
 *
 * Non-interactive callers (CI, a piped shell) get a warning and exit 0 — a hook
 * that hangs waiting on a tty nobody is watching is worse than a late failure.
 *
 *   node scripts/trust-new-packages.mjs            # prompt if anything is untrusted
 *   node scripts/trust-new-packages.mjs --otp=123456
 *   node scripts/trust-new-packages.mjs --list     # report only, never prompt
 */
import { execFileSync } from 'node:child_process'
import console from 'node:console'
import { createReadStream, createWriteStream, openSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'

import { readNpmToken, trustPackage } from './lib/npm-trust.mjs'
import {
  existsOnRegistry,
  readTrustLedger,
  ROOT,
  TRUST_STATE_PATH,
  untrustedPackages,
} from './lib/untrusted.mjs'

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

/**
 * Asks the user for a one-time code on the controlling terminal.
 *
 * Always prompts on /dev/tty, never on process.stdin: a git hook's stdin is the
 * ref list git pipes in, so a stdin prompt reads a ref and returns instantly
 * without the user ever seeing the question.
 *
 * @param label - What the code is for, shown in the prompt.
 * @returns The entered code, or null when there is no terminal.
 */
const askOtp = async (label) => {
  let input
  let output
  try {
    // openSync THROWS synchronously when there is no controlling terminal.
    // createReadStream('/dev/tty') does not — it emits an async 'error' event a
    // try/catch cannot see, so the catch below would never run and the prompt
    // would hang forever in CI. Open the fd first, stream from the fd.
    const fd = openSync('/dev/tty', 'r+')
    input = createReadStream('', { fd, autoClose: false })
    output = createWriteStream('', { fd, autoClose: false })
  } catch (_error) {
    // Intentionally ignored: no controlling terminal means no human to answer,
    // and a hook that blocks forever on an unwatched tty is worse than letting
    // the push through with the warning already printed above.
    return null
  }
  const rl = createInterface({ input, output })
  const answer = (await rl.question(`npm OTP for ${label} (6 digits): `)).trim()
  rl.close()
  input.destroy()
  output.destroy()
  return answer
}

/**
 * Returns a usable code, prompting when the current one is missing or spent.
 *
 * npm one-time codes are single-use, so a run touching five packages needs
 * several. Prompting per step only when npm actually rejects the previous code
 * keeps that to the minimum the user must type.
 *
 * @param label - What the code is for.
 * @param force - Ask for a fresh code even if one is held.
 * @returns A 6-digit code.
 */
const ensureOtp = async (label, force = false) => {
  if (otp && !force && /^\d{6}$/.test(otp)) return otp
  const answer = await askOtp(label)
  if (answer === null) {
    console.error('No terminal for the OTP prompt — skipping.')
    console.error('Run `npm run trust:new` from a shell to finish this.')
    process.exit(0)
  }
  if (!/^\d{6}$/.test(answer)) {
    console.error('That is not a 6-digit code. Run `npm run trust:new` to retry.')
    process.exit(1)
  }
  otp = answer
  return otp
}

await ensureOtp('trust config')

const ledger = readTrustLedger()
const failed = []

for (const pkg of untrusted) {
  // CREATE FIRST when npm has never seen the name — its trust endpoint 404s on
  // a package that does not exist, so trusting has to come second. This is the
  // only step that needs the package built, hence the scoped build.
  if (!(await existsOnRegistry(pkg.name))) {
    console.log(`  … ${pkg.name}: not on npm — creating it first`)
    try {
      execFileSync('node', ['scripts/build.js', `--only=${pkg.name}`], {
        cwd: ROOT,
        stdio: 'inherit',
      })
    } catch (_error) {
      // Intentionally ignored: the build printed its own errors to the inherited
      // stdio, and publishing an unbuilt package would ship an empty dist.
      console.error(`  ✗ ${pkg.name}: build failed (see output above)`)
      failed.push(`${pkg.name} (build)`)
      continue
    }
    // Two attempts: the held code is very likely spent by a previous package, and
    // npm's EOTP is indistinguishable from a wrong code, so just ask again once.
    let created = false
    for (const attempt of [0, 1]) {
      const code = await ensureOtp(`publishing ${pkg.name}`, attempt === 1)
      try {
        execFileSync('npm', ['publish', '--access', 'public', `--otp=${code}`], {
          cwd: join(ROOT, pkg.dir),
          stdio: 'inherit',
        })
        created = true
        break
      } catch (_error) {
        // Intentionally ignored: npm already printed a more specific reason to
        // the inherited stdio than anything reconstructable from the exit code.
        if (attempt === 1) console.error(`  ✗ ${pkg.name}: create failed (see npm output above)`)
      }
    }
    if (!created) {
      failed.push(`${pkg.name} (create)`)
      continue
    }
  }

  let result = await trustPackage(pkg.name, { token, otp })
  if (result.outcome === 'error' && /otp|one-time|EOTP/i.test(result.text)) {
    result = await trustPackage(pkg.name, { token, otp: await ensureOtp(pkg.name, true) })
  }
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
