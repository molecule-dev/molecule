#!/usr/bin/env node
/**
 * Make every new package publishable by CI, once.
 *
 * THE ONE-TIME COST, straight from npm's API docs for the trust endpoint:
 * "Package MUST exist", and `npm-otp` is "always required". OIDC tokens are
 * rejected outright and granular tokens with bypass_2fa get a 403. Staged
 * publishing is no help either — brand-new packages cannot be staged. And the
 * OIDC exchange looks up a package's trust config, so it answers
 * `404 OIDC token exchange error - package not found` for a name that has
 * neither. A first publish therefore has no OIDC path at all; npm/cli#8544 is
 * the open issue asking for one.
 *
 * So for a name npm has never seen this does two things, both needing a code:
 * publishes it, then trusts it. Everything afterwards is free — CI publishes
 * every later version over OIDC with no code, no stored secret and no human,
 * which is why the one-time cost is worth paying.
 *
 * It is also once per package, ever, and the pre-push hook runs it so nobody has
 * to remember. `npm publish` gets the terminal for its own 2FA prompt (it has no
 * --otp we could satisfy); the trust endpoint takes the code as an `npm-otp`
 * HEADER, so one code covers every package in the sweep.
 *
 * Non-interactive callers (CI, a piped shell) warn and exit 0 — a hook that
 * hangs on a tty nobody is watching is worse than a late failure.
 *
 *   node scripts/trust-new-packages.mjs            # publish + trust anything new
 *   node scripts/trust-new-packages.mjs --list     # report only, never prompt
 */
import { execFileSync } from 'node:child_process'
import console from 'node:console'
import {
  closeSync,
  createReadStream,
  createWriteStream,
  existsSync,
  openSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'

import { assertPackComplete } from './lib/assert-pack-complete.mjs'
import { loadSeed, parseSecret, SEED_PATH, secondsLeftInWindow, storeSeed, totp } from './lib/npm-2fa.mjs'
import { readNpmToken, trustPackage } from './lib/npm-trust.mjs'
import {
  collectPackages,
  existsOnRegistry,
  readTrustLedger,
  ROOT,
  TRUST_STATE_PATH,
  untrustedPackages,
} from './lib/untrusted.mjs'

/**
 * Packages the registry has never seen.
 *
 * @returns Records for names absent from npm, sorted.
 */
const registryAbsentPackages = async () => {
  const all = collectPackages()
  const absent = []
  for (let i = 0; i < all.length; i += 40) {
    await Promise.all(
      all.slice(i, i + 40).map(async (pkg) => {
        const res = await fetch(`https://registry.npmjs.org/${pkg.name.replace('/', '%2f')}`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(15_000),
        })
        if (res.status === 404) absent.push(pkg)
      }),
    )
  }
  return absent.sort((a, b) => a.name.localeCompare(b.name))
}

const args = process.argv.slice(2)
const LIST_ONLY = args.includes('--list')
// In CI there is no ~/.npmrc token, no terminal and no 2FA code — npm
// authenticates by exchanging the workflow's OIDC token instead, which is the
// whole point of running the trust step there. So --ci skips the login check and
// the prompt and hands the command straight to npm.
const CI = args.includes('--ci')
let otp = (args.find((a) => a.startsWith('--otp=')) || '').split('=')[1]
// --release: dispatch the Release workflow once everything is trusted, so the
// whole job is one command. Trusting without publishing leaves the packages in
// the exact half-done state this script exists to end.
const RELEASE = args.includes('--release')

// In CI the ledger does not exist — .trust-state.json is gitignored, so a fresh
// checkout reads it as empty and EVERY package looks untrusted. That made one run
// attempt all 919. There, the packages needing trust are exactly the ones npm has
// never seen, which is a fact we can ask the registry for.
const untrusted = CI ? await registryAbsentPackages() : untrustedPackages()

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

// The header's contract, actually enforced: NO TERMINAL -> warn and exit 0.
// This guard exists to catch a HUMAN at push time; without /dev/tty nobody can
// answer the 2FA prompt below, so exiting 1 only blocks automation that pushes
// with hooks enabled — which is exactly how the Release workflow died on
// 2026-08-07: the changesets action's version-commit push ran this hook in the
// runner (fresh checkout -> gitignored ledger absent -> all 919 packages
// "untrusted" -> no token -> exit 1) and the whole release failed. Untrusted
// NEW packages are still safe: their OIDC publish is skipped and the CI trust
// step reports them; they wait for an interactive `npm run trust:new`.
if (!CI) {
  try {
    // openSync THROWS synchronously when there is no controlling terminal —
    // same probe promptOtp uses below.
    closeSync(openSync('/dev/tty', 'r'))
  } catch (_error) {
    // No /dev/tty — a scripted push. The warn below IS the handling.
    console.error(
      'No terminal available — skipping the trust prompt (scripted push).\n' +
        'Any NEW packages stay untrusted (their publish is skipped) until\n' +
        '`npm run trust:new` runs interactively.',
    )
    process.exit(0)
  }
}

const token = CI ? null : readNpmToken()
if (!CI && !token) {
  console.error('Not logged in to npm. Run `npm login`, then push again.')
  process.exit(1)
}

const whoami = CI
  ? { ok: true, status: 200 }
  : await fetch('https://registry.npmjs.org/-/whoami', {
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
 * Asks for a 2FA code on the controlling terminal.
 *
 * Prompts on /dev/tty, never process.stdin: a git hook's stdin is the ref list
 * git pipes in, so a stdin prompt reads a ref and returns instantly without the
 * user ever seeing the question.
 *
 * @param label - What the code is for.
 * @returns The code, or null when there is no terminal.
 */
const askOtp = async (label) => {
  try {
    // openSync THROWS synchronously when there is no controlling terminal;
    // createReadStream emits an async error a try/catch cannot see, which would
    // hang a hook forever on a prompt nobody can answer. Probe, then close.
    closeSync(openSync('/dev/tty', 'r'))
  } catch (_error) {
    // Intentionally ignored: nobody is there to answer, and blocking a push on
    // an invisible prompt is worse than letting it through with the warning
    // already printed above.
    return null
  }
  // Separate descriptors. Sharing one fd between a read and a write stream and
  // then destroying both closes it twice, which threw EBADF and killed a run
  // after the user had already typed a code.
  const input = createReadStream('/dev/tty')
  const output = createWriteStream('/dev/tty')
  const rl = createInterface({ input, output })
  try {
    return (await rl.question(`npm 2FA code for ${label} (6 digits): `)).trim()
  } finally {
    rl.close()
    input.destroy()
    output.destroy()
  }
}

/**
 * The last TOTP code handed out from the stored seed, so a `force` retry can
 * wait out the 30 s window instead of returning the code npm just spent.
 *
 * @type {string | null}
 */
let lastSeedCode = null

/**
 * True once a stored seed is the code source: `otp` then merely mirrors the
 * last generated code (the trust call after a publish reads it) and must not
 * short-circuit the next ensureOtp into reusing it.
 *
 * @type {boolean}
 */
let seedMode = false

/**
 * Returns a usable code, self-served whenever possible.
 *
 * Order: the --otp argument, then the locally stored TOTP seed — after the
 * one-time enrollment this is the whole story, because npm's trust endpoint
 * wants a fresh `npm-otp` on EVERY call and the codes are single-use, which
 * is what made a sweep over N packages cost N keystrokes. The terminal prompt
 * doubles as the enrollment: answer with a 6-digit code for a one-time use,
 * or paste the authenticator SECRET (base32 or the otpauth:// URI) to store
 * it at SEED_PATH (0600) so every code after this is generated here and npm's
 * 2FA never asks again.
 *
 * @param label - What the code is for.
 * @param force - Compute a fresh one even if a code is held (npm rejected
 *   the held one as spent).
 * @returns A 6-digit code.
 */
const ensureOtp = async (label, force = false) => {
  if (otp && !seedMode && !force && /^\d{6}$/.test(otp)) return otp
  const seed = loadSeed()
  if (seed) {
    seedMode = true
    let code = totp(seed)
    if (force && code === lastSeedCode) {
      const wait = secondsLeftInWindow()
      console.error(`  code just spent — waiting ${wait}s for the next TOTP window`)
      await new Promise((resolve) => setTimeout(resolve, wait * 1000))
      code = totp(seed)
    }
    lastSeedCode = code
    otp = code
    return code
  }
  const answer = await askOtp(
    `${label} — 6-digit code, or paste the authenticator SECRET (base32 / otpauth:// URI) to store it at ${SEED_PATH} and never be asked again`,
  )
  if (answer === null) {
    console.error('No terminal for the 2FA prompt — skipping.')
    console.error('Run `npm run trust:new` from a shell to finish this.')
    process.exit(0)
  }
  const secret = parseSecret(answer)
  if (secret) {
    storeSeed(secret)
    console.error(
      `\n  TOTP secret stored at ${SEED_PATH} (mode 0600) — codes are generated locally from now on.\n`,
    )
    lastSeedCode = totp(secret)
    return lastSeedCode
  }
  if (!/^\d{6}$/.test(answer)) {
    console.error('That is not a 6-digit code or a TOTP secret. Run `npm run trust:new` to retry.')
    process.exit(1)
  }
  otp = answer
  return otp
}

const ledger = readTrustLedger()
const failed = []

// One code up front; the endpoint takes it as a header, so it covers every
// package until npm says it is spent.
if (!CI) await ensureOtp('trust config')

for (const pkg of untrusted) {
  // CREATE IT FIRST when npm has never seen the name.
  //
  // npm's API docs are unambiguous about the trust endpoint: "Package MUST
  // exist", and `npm-otp` is "always required". Staged publishing does not help
  // either — brand-new packages cannot be staged. And the OIDC exchange looks up
  // a package's trust config, so it answers
  // `404 OIDC token exchange error - package not found` for a name that has
  // neither. A first publish therefore has no OIDC path; npm/cli#8544 is the
  // open issue asking for one.
  //
  // So: publish once here, then trust. Every version after this one is published
  // by CI over OIDC with no code at all — which is the arrangement worth having,
  // and the reason this one-time step is worth paying.
  if (!CI && !(await existsOnRegistry(pkg.name))) {
    console.log(`\n  ${pkg.name}: npm has never seen this — publishing it first`)
    try {
      execFileSync('node', ['scripts/build.js', `--only=${pkg.name}`], {
        cwd: ROOT,
        stdio: 'inherit',
      })
      // The build must have produced every entry point before anything uploads.
      // README.md is GENERATED at commit time (the pre-commit hook regenerates
      // it from the module JSDoc), so a package an agent added mid-session has
      // no README on disk yet and the pack gate would refuse it — the exact
      // wall the 2026-10-05 geocoding + ai-decisions wave hit twice. Generate
      // it here the same way the hook does, so trust time never depends on
      // commit time. Skipped in a standalone clone (no ../mlcl).
      const readme = join(ROOT, pkg.dir, 'README.md')
      if (!existsSync(readme)) {
        // tsx lives at mlcl/node_modules/.bin in a STANDALONE mlcl clone, but
        // this workspace makes mlcl a root npm-workspace member, which hoists
        // it to the workspace root's .bin (mlcl/node_modules/.bin/tsx has not
        // existed here since 2026-08-16 — a silent skip there sent the
        // 2026-10-07 embeddings wave into the pack gate's README error).
        const mlclDir = join(ROOT, '..', 'mlcl')
        const regen = join(mlclDir, 'scripts', 'regen-molecule-docs.mjs')
        const tsx = [
          join(mlclDir, 'node_modules', '.bin', 'tsx'),
          join(mlclDir, '..', 'node_modules', '.bin', 'tsx'),
        ].find((p) => existsSync(p))
        if (!existsSync(regen)) {
          console.error(
            '    ⚠ no ../mlcl checkout next to this repo — cannot regenerate the' +
              ' missing README.md; the pack gate below will refuse this package',
          )
        } else if (!tsx) {
          console.error(
            '    ⚠ tsx not found (looked in mlcl/node_modules/.bin and the' +
              ' workspace root) — cannot regenerate the missing README.md; the' +
              ' pack gate below will refuse this package',
          )
        } else {
          console.log(`    regenerating the missing README.md (commit-time step, run early)`)
          execFileSync(tsx, [regen, pkg.dir], {
            cwd: mlclDir,
            stdio: 'inherit',
          })
        }
      }
      if (!existsSync(readme)) {
        // Still nothing: the regen path needs the package REGISTERED in mlcl's
        // registry, and a package caught mid-authoring (registration not yet
        // committed, or genuinely forgotten) cannot generate real docs. A
        // minimal manifest-sourced README beats failing the whole sweep — the
        // npm page shows name + description now, and the hook-generated full
        // README ships with the authoring commit's next version. No code
        // samples on purpose: README text travels inside the publish PUT
        // body, and sample code is what trips npm's Cloudflare WAF (the
        // 2026-09-24 app-margin-notes-react incident).
        const manifest = JSON.parse(readFileSync(join(ROOT, pkg.dir, 'package.json'), 'utf8'))
        console.error(
          `    ⚠ ${manifest.name} is not in mlcl's registry yet (authoring session mid-flight, or registration forgotten) — writing a minimal README so the publish can proceed; full docs arrive with its commit`,
        )
        writeFileSync(
          readme,
          `# ${manifest.name}\n\n${manifest.description ?? ''}\n\n` +
            `\`\`\`\nnpm install ${manifest.name}\n\`\`\`\n\n` +
            `Part of the [Molecule](https://www.molecule.dev) package fleet. This page carries the ` +
            `manifest summary; the full generated documentation ships with the package's first committed version.\n\n` +
            `License: ${manifest.license ?? 'Apache-2.0'}\n`,
        )
      }
      assertPackComplete(join(ROOT, pkg.dir))
      // With a code we can self-serve (a held one or the stored seed), hand it
      // to npm via --otp so the publish is unattended too; a TOTP window can
      // roll between computing the code and npm using it, so one fresh-code
      // retry before giving up. Without one, stdio: 'inherit' keeps npm's OWN
      // 2FA prompt — a code collected on /dev/tty may already be spent by an
      // earlier package's trust call, and asking the human for a code npm will
      // not consume is worse than letting npm ask.
      if ((otp && /^\d{6}$/.test(otp)) || loadSeed()) {
        const publishOnce = (code) =>
          execFileSync('npm', ['publish', '--access', 'public', '--otp', code], {
            cwd: join(ROOT, pkg.dir),
            stdio: 'inherit',
          })
        try {
          await publishOnce(await ensureOtp(`${pkg.name} publish`))
        } catch {
          await publishOnce(await ensureOtp(`${pkg.name} publish`, true))
        }
      } else {
        execFileSync('npm', ['publish', '--access', 'public'], {
          cwd: join(ROOT, pkg.dir),
          stdio: 'inherit',
        })
      }
    } catch (error) {
      // `npm publish` with stdio: 'inherit' prints its own reason, so its
      // "Command failed" wrapper adds nothing — but the build and the
      // pack-completeness gate throw BEFORE npm runs, and swallowing their
      // message printed "see npm output above" with nothing above (the
      // 2026-09-30 model-hosting wave sat on a missing-README.md diagnosis
      // that read like an npm failure).
      const reason =
        error instanceof Error && !/^Command failed/.test(error.message)
          ? error.message
          : 'npm printed the reason above'
      console.error(`  ✗ ${pkg.name}: publish failed — ${reason}`)
      failed.push(pkg.name)
      continue
    }
  }

  let result = await trustPackage(pkg.name, { otp })

  // A one-time code is single-use, so by the second package the held one is
  // spent. Ask for a fresh one and retry rather than reporting it as a failure.
  if (result.outcome === 'needs-otp') {
    if (CI) {
      console.error(`  x ${pkg.name}: npm demanded 2FA and CI cannot supply one`)
      failed.push(pkg.name)
      continue
    }
    // Codes are single-use and short-lived, so a long sweep needs a few. Ask
    // only when npm actually rejects the held one.
    result = await trustPackage(pkg.name, { otp: await ensureOtp(pkg.name, true) })
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

if (RELEASE) {
  // The packages are trusted but still do not exist on npm. CI creates them over
  // OIDC with no further code — that is the whole point of having trusted them.
  console.log('\nDispatching Release so CI creates them over OIDC...')
  try {
    execFileSync('gh', ['workflow', 'run', 'release.yml', '--ref', 'main'], {
      cwd: ROOT,
      stdio: 'inherit',
    })
    console.log('Dispatched. Watch: gh run list --workflow=release.yml --limit 1')
  } catch (_error) {
    // Intentionally ignored: gh printed its own reason, and the trust work above
    // is already saved — dispatching by hand is all that is left.
    console.error('Could not dispatch Release; run: gh workflow run release.yml --ref main')
  }
}
