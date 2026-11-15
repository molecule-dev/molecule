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
 * publishes a PLACEHOLDER (`0.0.0-stage`, dist-tag `stage`) so the name exists,
 * then trusts it. The real first version is left for CI: npm marks a new trust
 * link "Pending validation" until a publish goes through it, and one that is
 * never used stops working — still listed, but its exchange and its revoke both
 * answer 404. Publishing the real 1.0.0 from the owner's account (as this did
 * until 2026-10-15) meant no CI publish ever validated the link, and 33 packages
 * sat on links nobody had proven until a release tried one (api-database-pglite,
 * api-payments-capture). Everything afterwards is free — CI publishes every
 * version over OIDC with no code, no stored secret and no human.
 *
 * It is also once per package, ever, and the pre-push hook runs it so nobody has
 * to remember. `npm publish` gets the terminal for its own 2FA prompt (it has no
 * --otp we could satisfy); the trust endpoint takes the code as an `npm-otp`
 * HEADER, so one code covers every package in the sweep.
 *
 * The placeholder is built and published from an export of the committed HEAD
 * (lib/committed-export.mjs), never from the checkout, which other sessions
 * share: their uncommitted edits can neither fail the build nor reach npm. A
 * package that is not committed yet is refused until it is.
 *
 * Non-interactive callers (CI, a piped shell) warn and exit 0 — a hook that
 * hangs on a tty nobody is watching is worse than a late failure.
 *
 *   node scripts/trust-new-packages.mjs            # publish + trust anything new
 *   node scripts/trust-new-packages.mjs --list     # report only, never prompt
 */
import { execFileSync, spawnSync } from 'node:child_process'
import console from 'node:console'
import { closeSync, existsSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'
import { ReadStream, WriteStream } from 'node:tty'

import { assertPackComplete } from './lib/assert-pack-complete.mjs'
import { buildFirstPublishes } from './lib/build-first-publishes.mjs'
import { commitTrustState } from './lib/commit-trust-state.mjs'
import { createCommittedExport } from './lib/committed-export.mjs'
import {
  loadSeed,
  parseSecret,
  secondsLeftInWindow,
  SEED_PATH,
  storeSeed,
  totp,
} from './lib/npm-2fa.mjs'
import {
  approvalServiceAvailable,
  npmApprovalLink,
  requestOwnerNpmLogin,
  requestOwnerOtp,
} from './lib/npm-2fa-approval.mjs'
import {
  npmUserconfigWithToken,
  readNpmToken,
  relinkPackage,
  trustPackage,
} from './lib/npm-trust.mjs'
import {
  collectPackages,
  existsOnRegistry,
  readTrustLedger,
  ROOT,
  TRUST_STATE_PATH,
  unprovenPackages,
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
// --from-hook: the pre-push hook. A push never waits on the owner's phone; with no
// terminal it only says what to run.
const FROM_HOOK = args.includes('--from-hook')

// In CI the ledger does not exist — .trust-state.json is gitignored, so a fresh
// checkout reads it as empty and EVERY package looks untrusted. That made one run
// attempt all 919. There, the packages needing trust are exactly the ones npm has
// never seen, which is a fact we can ask the registry for.
const untrusted = CI ? await registryAbsentPackages() : untrustedPackages()

// The ledger records that a link was ADDED, never that one worked: a package npm has
// but never accepted an OIDC publish for sits on a dead link while the ledger calls it
// trusted (15 of them on 2026-10-16, refused by every release while this script
// reported nothing to do). Those are re-linked — revoked and added fresh — not skipped.
if (!CI) {
  const listed = new Set(untrusted.map((pkg) => pkg.name))
  const ledgerNow = readTrustLedger()
  const unproven = await unprovenPackages(collectPackages().filter((p) => ledgerNow.has(p.name)))
  untrusted.push(
    ...unproven.filter((pkg) => !listed.has(pkg.name)).map((pkg) => ({ ...pkg, relink: true })),
  )
}

// The common case by far: nothing new, no output, no network call, no delay.
if (!untrusted.length) process.exit(0)

if (process.env.MOL_SKIP_TRUST === '1') {
  console.error(
    `MOL_SKIP_TRUST=1 — skipping trust config for ${untrusted.length} package(s).\n` +
      `They will be skipped by the next release until \`npm run trust:new\` runs.`,
  )
  process.exit(0)
}

console.log(`\n${untrusted.length} package(s) have no working trusted publisher:`)
for (const pkg of untrusted)
  console.log(
    `  ${pkg.name}${pkg.relink ? '  (on npm, never published over OIDC: its link is re-made)' : ''}`,
  )
console.log(
  `\nUntil they are trusted, npm rejects their OIDC publish and the release\n` +
    `skips them silently. This is a one-time step per package.\n`,
)

if (LIST_ONLY) process.exit(1)

// When a local approval service runs (lib/npm-2fa-approval.mjs), codes come from the
// owner's phone: this works with no terminal, so an agent can run trust:new itself.
// --otp=<code> still covers the first call. Checked only now, when there is work.
const PHONE = !CI && !FROM_HOOK && !otp && (await approvalServiceAvailable())

// The header's contract, actually enforced: NO TERMINAL -> warn and exit 0.
// This guard exists to catch a HUMAN at push time; without /dev/tty nobody can
// answer the 2FA prompt below, so exiting 1 only blocks automation that pushes
// with hooks enabled — which is exactly how the Release workflow died on
// 2026-08-07: the changesets action's version-commit push ran this hook in the
// runner (fresh checkout -> gitignored ledger absent -> all 919 packages
// "untrusted" -> no token -> exit 1) and the whole release failed. Untrusted
// NEW packages are still safe: their OIDC publish is skipped and the CI trust
// step reports them; they wait for an interactive `npm run trust:new`.
if (!CI && !PHONE) {
  try {
    // openSync THROWS synchronously when there is no controlling terminal —
    // same probe promptOtp uses below.
    closeSync(openSync('/dev/tty', 'r'))
  } catch (_error) {
    // No /dev/tty — a scripted push. The warn below IS the handling.
    console.error(
      'No terminal available — skipping the trust prompt (scripted push).\n' +
        'Any NEW packages stay untrusted (their publish is skipped) until\n' +
        '`npm run trust:new` runs: interactively, or from any shell (an agent too) while\n' +
        "the phone approval service runs, which asks the owner's phone for the codes.",
    )
    process.exit(0)
  }
}

/**
 * npm's answer to `whoami` for a session token.
 *
 * @param bearer - The token.
 * @returns The HTTP status.
 */
const whoamiStatus = async (bearer) =>
  (
    await fetch('https://registry.npmjs.org/-/whoami', {
      headers: { authorization: `Bearer ${bearer}` },
      signal: AbortSignal.timeout(20_000),
    })
  ).status

let token = CI ? null : readNpmToken()

/**
 * Set when this run signed in from the owner's phone: a temporary npm config carrying
 * that login, for `npm publish`. The login lives only in this process and that file,
 * which goes when the run ends; ~/.npmrc is never rewritten.
 *
 * @type {ReturnType<typeof npmUserconfigWithToken> | null}
 */
let phoneLogin = null
process.on('exit', () => phoneLogin?.dispose())

// A dead token 401s identically to a 2FA rejection on the trust endpoint, which is
// how an expired session once got diagnosed as "npm requires an OTP here" and sent
// this repo chasing the wrong constraint for hours. So the login is checked first.
// An `npm login` session lasts at most 12 hours, so the saved one is often dead.
const savedLoginStatus = CI || !token ? null : await whoamiStatus(token)
if (!CI && savedLoginStatus !== 200) {
  const why = token
    ? `The npm login in ~/.npmrc is not valid (whoami -> ${savedLoginStatus})`
    : 'Not logged in to npm'
  if (!PHONE) {
    console.error(`${why}. Run \`npm login\`, then push again.`)
    process.exit(1)
  }
  console.error(`${why}; asked the owner's phone to sign in to npm…`)
  const names = untrusted.map((pkg) => pkg.name)
  try {
    token = await requestOwnerNpmLogin({
      purpose:
        `trust:new needs you to sign in to npm (the saved login has expired) to trust ` +
        `${names.length} package(s): ${names.slice(0, 3).join(', ')}` +
        (names.length > 3 ? ` and ${names.length - 3} more` : ''),
    })
  } catch (error) {
    console.error(`Stopped: no npm sign-in from the phone: ${error.message}. Nothing was changed.`)
    process.exit(1)
  }
  const status = await whoamiStatus(token)
  if (status !== 200) {
    console.error(`Stopped: npm does not accept the new sign-in (whoami -> ${status}).`)
    process.exit(1)
  }
  phoneLogin = npmUserconfigWithToken(token)
  console.error('  signed in to npm from the phone (kept for this run only)')
}

/**
 * Arguments that point an `npm publish` at this run's phone sign-in, when there is one.
 *
 * @returns Extra npm arguments.
 */
const loginArgs = () => (phoneLogin ? ['--userconfig', phoneLogin.path] : [])

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
  // tty streams, not fs streams: destroying an fs ReadStream leaves its
  // blocking read on /dev/tty pending, so the process never exited after the
  // last prompt until the user pressed Ctrl-C.
  const input = new ReadStream(openSync('/dev/tty', 'r'))
  const output = new WriteStream(openSync('/dev/tty', 'w'))
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
 * True once answers come from the owner's phone. A code from there is reused like a
 * typed one until npm rejects it; an approval on npm's page covers one call, so the
 * next call is rejected and asks again.
 *
 * @type {boolean}
 */
let phoneMode = false

/** Packages this run will make calls for, and how many are finished (shown on the phone). */
const progress = { names: [], done: 0 }

/**
 * The owner gave no 2FA answer (denied, timed out, no terminal, a bad answer). The sweep
 * stops there and keeps what it finished.
 */
class NoTwoFactorAnswer extends Error {}

/**
 * What the phone shows for a request, in plain words.
 *
 * @param label - What the code is for.
 * @param force - npm rejected the held code.
 * @returns The text.
 */
const phonePurpose = (label, force) => {
  const total = progress.names.length
  if (force)
    return `trust:new needs a new npm code; the last one stopped working (${total - progress.done} of ${total} package(s) left, at ${label})`
  const shown = progress.names.slice(0, 3).join(', ')
  const more = total > 3 ? ` and ${total - 3} more` : ''
  return `trust:new needs an npm code to trust ${total} package(s): ${shown}${more}`
}

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
  if (otp && !seedMode && !force && (phoneMode || /^\d{6}$/.test(otp))) return otp
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
  if (PHONE) {
    phoneMode = true
    console.error(`  asked the owner's phone for an npm code (${label})…`)
    let reply
    try {
      reply = await requestOwnerOtp({
        purpose: phonePurpose(label, force),
        link: () => npmApprovalLink(progress.names[0] ?? 'molecule', { bearer: token }),
        bearer: token,
      })
    } catch (error) {
      throw new NoTwoFactorAnswer(`no npm code from the phone: ${error.message}`, { cause: error })
    }
    console.error(
      `  got ${reply.kind === 'code' ? 'a code' : 'an approval for one call'} from the phone`,
    )
    otp = reply.otp
    return otp
  }
  const answer = await askOtp(
    `${label} — 6-digit code, or paste the authenticator SECRET (base32 / otpauth:// URI) to store it at ${SEED_PATH} and never be asked again`,
  )
  if (answer === null) throw new NoTwoFactorAnswer('no terminal for the 2FA prompt')
  const secret = parseSecret(answer)
  if (secret) {
    storeSeed(secret)
    console.error(
      `\n  TOTP secret stored at ${SEED_PATH} (mode 0600) — codes are generated locally from now on.\n`,
    )
    lastSeedCode = totp(secret)
    return lastSeedCode
  }
  if (!/^\d{6}$/.test(answer))
    throw new NoTwoFactorAnswer('that is not a 6-digit code or a TOTP secret')
  otp = answer
  return otp
}

/**
 * Runs `npm publish` with piped output so an OTP rejection can be told apart
 * from every other failure — the interactive prompt is never needed in this
 * branch (--otp is always set), and the output is echoed through either way
 * so npm's own reason still reaches the terminal.
 *
 * @param args - Full npm argv, including the --otp value.
 * @param cwd - The package directory to publish from.
 * @returns The result.
 */
const npmPublish = (args, cwd) => {
  const result = spawnSync('npm', args, { cwd, encoding: 'utf8' })
  if (result.stdout?.trim()) console.log(result.stdout)
  if (result.stderr?.trim()) console.error(result.stderr)
  return result
}

/**
 * Whether npm's failure output says the code (not something else) was the
 * problem — only then is it worth asking for a fresh one.
 *
 * @param result
 * @returns
 */
const isOtpRejection = (result) =>
  /EOTP|one-time password|\botp\b|two-factor/i.test(`${result.stderr ?? ''}${result.stdout ?? ''}`)

const ledger = readTrustLedger()
const ledgerBefore = new Set(ledger)
const failed = []

/**
 * This run's export of HEAD, once a first publish needs it.
 *
 * @type {ReturnType<typeof createCommittedExport> | null}
 */
let exported = null

/**
 * The committed tree every first publish builds from: one export of HEAD per run, made on first
 * use (a relink-only run never pays for it) and removed when the run exits.
 *
 * @returns The export.
 */
const committedTree = () => {
  if (exported) return exported
  exported = createCommittedExport({ root: ROOT })
  console.log(
    `  building from committed HEAD ${exported.sha.slice(0, 12)} — uncommitted edits in the checkout are not built or published`,
  )
  return exported
}
process.on('exit', () => exported?.dispose())
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => {
    exported?.dispose()
    process.exit(130)
  })

/**
 * Records a trusted package and saves the ledger at once, so a run that stops partway
 * (a code nobody sent, a crash) keeps every package it finished.
 *
 * @param name - The package.
 */
const record = (name) => {
  ledger.add(name)
  writeFileSync(TRUST_STATE_PATH, `${JSON.stringify([...ledger].sort(), null, 2)}\n`)
}

// BUILD EVERY FIRST PUBLISH BEFORE ASKING FOR A CODE. A code works for every call inside
// its ~30 s window, so the calls that need one (publishes, trust links) run back to back
// after this, instead of between builds that outlive the window and cost another code.
/**
 * Package name -> its built directory in the committed export.
 *
 * @type {Map<string, string>}
 */
const prepared = new Map()
const firstPublishes = []
for (const pkg of untrusted) {
  if (pkg.relink || CI || (await existsOnRegistry(pkg.name))) continue
  // Built and published from the committed tree only: the checkout is shared, and another
  // session's uncommitted edit to a dependency failed this build (or was published) when it
  // read the working tree (lib/committed-export.mjs).
  if (!existsSync(join(committedTree().dir, pkg.dir, 'package.json'))) {
    console.error(
      `  ✗ ${pkg.name}: not committed yet — only committed code is published; commit it, then run trust:new again`,
    )
    failed.push(pkg.name)
    continue
  }
  firstPublishes.push(pkg)
}
if (firstPublishes.length) {
  console.log(
    `\n  npm has never seen ${firstPublishes.length} package(s) — building them to publish first`,
  )
}
// One build.js call for all of them, so their shared dependencies build once
// (lib/build-first-publishes.mjs).
const builds = buildFirstPublishes(
  firstPublishes.map((pkg) => pkg.name),
  {
    build: (names) =>
      execFileSync('node', ['scripts/build.js', `--only=${names.join(',')}`], {
        cwd: committedTree().dir,
        stdio: 'inherit',
      }),
  },
)
for (const name of builds.failed) {
  console.error(`  ✗ ${name}: not publishable — the build printed the reason above`)
  failed.push(name)
}
for (const pkg of firstPublishes) {
  if (!builds.built.includes(pkg.name)) continue
  const tree = committedTree()
  const pkgDir = join(tree.dir, pkg.dir)
  try {
    // The build must have produced every entry point before anything uploads.
    // README.md is GENERATED at commit time (the pre-commit hook regenerates
    // it from the module JSDoc), so a package an agent added mid-session has
    // no README on disk yet and the pack gate would refuse it — the exact
    // wall the 2026-10-05 geocoding + ai-decisions wave hit twice. Generate
    // it here the same way the hook does, so trust time never depends on
    // commit time. Skipped in a standalone clone (no ../mlcl).
    const readme = join(pkgDir, 'README.md')
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
        // MOLECULE_PACKAGES_DIR points the generator at the export, so it reads the committed
        // source and writes there; the checkout is never touched.
        execFileSync(tsx, [regen, pkg.dir], {
          cwd: mlclDir,
          env: { ...process.env, MOLECULE_PACKAGES_DIR: join(tree.dir, 'packages') },
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
      const manifest = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
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
    assertPackComplete(pkgDir)
    prepared.set(pkg.name, pkgDir)
  } catch (error) {
    const reason =
      error instanceof Error && !/^Command failed/.test(error.message)
        ? error.message
        : 'the build printed the reason above'
    console.error(`  ✗ ${pkg.name}: not publishable — ${reason}`)
    failed.push(pkg.name)
  }
}
const ready = untrusted.filter((pkg) => !failed.includes(pkg.name))
progress.names = ready.map((pkg) => pkg.name)

/**
 * Publishes (when new) and trusts one package, or re-links one npm has.
 *
 * @param pkg - The package record.
 */
const trustOne = async (pkg) => {
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
  if (pkg.relink) {
    let relinked = await relinkPackage(pkg.name, { otp, token })
    if (relinked.outcome === 'needs-otp')
      relinked = await relinkPackage(pkg.name, { otp: await ensureOtp(pkg.name, true), token })
    if (relinked.outcome === 'relinked') {
      record(pkg.name)
      console.log(`  ✓ ${pkg.name} (re-linked)`)
    } else {
      console.error(`  ✗ ${pkg.name}: ${relinked.status ?? ''} ${relinked.text}`)
      failed.push(pkg.name)
    }
    return
  }
  const pkgDir = prepared.get(pkg.name)
  if (pkgDir) {
    console.log(`\n  ${pkg.name}: publishing it first`)
    try {
      // ONE code per run is the contract: the up-front prompt (or --otp, or
      // the stored seed) is reused for every publish and trust call — npm
      // keeps accepting the same TOTP code until its window tolerance runs
      // out, which is how 592 packages were trusted on a handful of codes on
      // 2026-08-05. A fresh code is asked for ONLY when npm actually rejects
      // one (long sweeps outliving the window), and non-OTP failures (WAF,
      // network) surface immediately instead of triggering a prompt. Without
      // any code available, stdio: 'inherit' keeps npm's OWN interactive
      // prompt as the fallback.
      // Publish the placeholder: the EXPORT's manifest carries the placeholder version. The
      // export is removed when this run ends, so the checkout's manifest is never rewritten.
      const manifestPath = join(pkgDir, 'package.json')
      const staged = JSON.parse(readFileSync(manifestPath, 'utf8'))
      if ((otp && /^\d{6}$/.test(otp)) || loadSeed() || phoneMode) {
        // npm answers a 403 "You cannot publish using the version" for a
        // version its policy refuses (0.0.0-stage is refused), so walk a
        // list of placeholder versions until one is accepted.
        const placeholders = ['0.0.1-stage', '0.0.1-stage.0', '0.1.0-stage']
        let result
        for (const version of placeholders) {
          staged.version = version
          writeFileSync(manifestPath, `${JSON.stringify(staged, null, 2)}\n`)
          const attempt = async (force) => {
            const code = await ensureOtp(`${pkg.name} publish`, force)
            return npmPublish(
              ['publish', '--access', 'public', '--tag', 'stage', '--otp', code, ...loginArgs()],
              pkgDir,
            )
          }
          result = await attempt(false)
          if (result.status !== 0 && isOtpRejection(result)) {
            result = await attempt(true)
          }
          if (
            result.status === 0 ||
            !/cannot publish using the version/i.test(
              `${result.stderr ?? ''}${result.stdout ?? ''}`,
            )
          ) {
            break
          }
        }
        if (result.status !== 0) {
          throw new Error('npm publish exited non-zero — npm printed the reason above')
        }
      } else {
        staged.version = '0.0.1-stage'
        writeFileSync(manifestPath, `${JSON.stringify(staged, null, 2)}\n`)
        execFileSync('npm', ['publish', '--access', 'public', '--tag', 'stage', ...loginArgs()], {
          cwd: pkgDir,
          stdio: 'inherit',
        })
      }
    } catch (error) {
      if (error instanceof NoTwoFactorAnswer) throw error
      // `npm publish` prints its own reason, so its "Command failed" wrapper adds
      // nothing. The build and the pack-completeness gate ran (and reported) in the
      // build pass above, before any code was asked for.
      const reason =
        error instanceof Error && !/^Command failed/.test(error.message)
          ? error.message
          : 'npm printed the reason above'
      console.error(`  ✗ ${pkg.name}: publish failed — ${reason}`)
      failed.push(pkg.name)
      return
    }
  }
  let result = await trustPackage(pkg.name, { otp, token })

  // A one-time code is single-use, so by the second package the held one is
  // spent. Ask for a fresh one and retry rather than reporting it as a failure.
  if (result.outcome === 'needs-otp') {
    if (CI) {
      console.error(`  x ${pkg.name}: npm demanded 2FA and CI cannot supply one`)
      failed.push(pkg.name)
      return
    }
    // Codes are single-use and short-lived, so a long sweep needs a few. Ask
    // only when npm actually rejects the held one.
    result = await trustPackage(pkg.name, { otp: await ensureOtp(pkg.name, true), token })
  }
  if (result.outcome === 'trusted' || result.outcome === 'already') {
    record(pkg.name)
    console.log(`  ✓ ${pkg.name}`)
  } else {
    console.error(`  ✗ ${pkg.name}: ${result.status} ${result.text}`)
    failed.push(pkg.name)
  }
}

try {
  // One code up front; the endpoint takes it as a header, so it covers every
  // package until npm says it is spent.
  if (!CI && ready.length) await ensureOtp('trust config')
  for (const pkg of ready) {
    await trustOne(pkg)
    progress.done++
  }
} catch (error) {
  if (!(error instanceof NoTwoFactorAnswer)) throw error
  const left = ready.slice(progress.done).map((pkg) => pkg.name)
  failed.push(...left)
  console.error(
    `\nStopped: ${error.message}. ${left.length} package(s) not done; run \`npm run trust:new\` again to finish them.`,
  )
}

// Persist after every attempt, not at the end: a code can expire partway
// through a long sweep, and losing the successes to an exception means redoing
// them with a fresh code for no reason.
writeFileSync(TRUST_STATE_PATH, `${JSON.stringify([...ledger].sort(), null, 2)}\n`)

// The run that records packages in the ledger commits it (never pushes, and only that file), so the
// record is not left as an unexplained modification. CI keeps no ledger of its own and never commits.
if (!CI) {
  const outcome = commitTrustState({
    root: ROOT,
    file: '.trust-state.json',
    added: [...ledger].filter((name) => !ledgerBefore.has(name)).sort(),
  })
  if (outcome.committed) console.log(`Committed .trust-state.json (${outcome.sha}); not pushed.`)
  if (outcome.reason && !outcome.reason.startsWith('nothing was added'))
    console.error(
      `${outcome.committed ? 'Trust ledger commit warning' : 'Did not commit .trust-state.json'}: ${outcome.reason}`,
    )
}

if (failed.length) {
  console.error(
    `\n${failed.length} failed. If the code expired mid-run, the successes above\n` +
      `are saved — run \`npm run trust:new\` with a fresh code to finish.`,
  )
  process.exit(1)
}

console.log(
  `\nTrusted ${untrusted.length}. Their links are PENDING until CI publishes through them — npm ` +
    'gives about two days. Run the release now so CI publishes their real versions:\n' +
    '  node ../scripts/release.mjs --only=gates,version,publish,pins,lockfiles\n' +
    'Then `node ../scripts/audit-npm-trust.mjs` lists any package still never published over OIDC.',
)

// Inside the molecule workspace, releases go through its release runner, which holds the
// shared release claim and watches only its own run; a Release dispatched by hand here
// collided with a live release once. Standalone clones keep the direct dispatch.
const WORKSPACE_RELEASE = join(ROOT, '..', 'scripts', 'release.mjs')
if (RELEASE && existsSync(WORKSPACE_RELEASE)) {
  console.error(
    '\n--release does not dispatch Release inside the workspace. Run the release runner:\n' +
      '  node ../scripts/release.mjs --only=gates,version,publish,pins,lockfiles',
  )
} else if (RELEASE) {
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
