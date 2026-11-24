#!/usr/bin/env node
/**
 * Runs the conformance kit's golden rules over the goldens a commit changes.
 *
 *   node scripts/check-golden-rules.mjs --base=HEAD
 *
 * Two kit tests read React's recorded goldens and render nothing:
 * `a11y-goldens.test.ts` (React markup passes axe-core's structural rules) and
 * `features-pseudo-locale.test.ts` (a feature's first case, switched to the
 * pseudo-locale, shows no English the component wrote itself). Every port is held
 * to React's goldens, so a defect enters the fleet in the commit that records
 * them: after a React change, or with a new case. Only CI and the release ran
 * these tests, so a commit whose new `BillingSection` case showed the English
 * prop default "Free" passed the pre-commit hook and stopped the release before
 * its push (2026-11-24).
 *
 * Takes the paths the index changes against `--base` (the hook passes the
 * commit's parent) and runs both tests by name over each feature whose cases or
 * goldens changed, and over the UI kit when its cases or goldens did. Runs the
 * tests from the tree it is started in, which in the hook is the export of the
 * index (`scripts/run-on-index.mjs`); reads the index from `MOL_INDEX_REPO`, or
 * from the current repository when that is unset. Exits 0 with nothing to run.
 *
 * @module
 */

import { execFileSync, spawnSync } from 'node:child_process'
import console from 'node:console'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

/** The conformance kit, relative to the repository root. */
export const KIT = 'packages/app/frameworks/conformance'

/** The kit's tests that read the committed goldens and render nothing. */
export const GOLDEN_RULE_TESTS = [
  'src/__tests__/a11y-goldens.test.ts',
  'src/__tests__/features-pseudo-locale.test.ts',
]

/**
 * The goldens a set of changed paths touches.
 *
 * A feature's cases are `src/features/cases/<name>.ts` (or a `<name>/` directory
 * beside it) and its goldens `src/features/goldens/<name>.json` (or a `<name>/`
 * directory); the UI kit's are `src/ui/cases/` and `src/ui/goldens.json`.
 *
 * @param paths - Changed paths, relative to the repository root.
 * @returns The features' case names, sorted, and whether the UI kit's changed.
 */
export function goldenScope(paths) {
  const features = new Set()
  let ui = false
  const prefix = `${KIT}/src/`
  for (const path of paths) {
    if (!path.startsWith(prefix)) continue
    const rest = path.slice(prefix.length)
    const feature = rest.match(
      /^features\/(?:cases|goldens)\/([^/]+?)(?:\.(?:ts|json))?(?:\/|$)/,
    )?.[1]
    if (feature) features.add(feature)
    else if (/^ui\/(?:goldens\.json$|cases\/)/.test(rest)) ui = true
  }
  return { features: [...features].sort(), ui }
}

/**
 * The vitest `-t` pattern that selects the scope's tests: each feature's own
 * describe block (`a11y-goldens`) or test (`features-pseudo-locale`) carries the
 * feature's case name as a whole word, and each UI kit test starts `UI kit`.
 *
 * @param scope - What `goldenScope` returned.
 * @returns The pattern, or undefined when nothing changed.
 */
export function testNamePattern({ features, ui }) {
  const names = [...(ui ? ['UI kit'] : []), ...features]
  if (!names.length) return undefined
  const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return `(^|\\s)(${escaped.join('|')})(\\s|$)`
}

/**
 * The paths the index changes against `base`.
 *
 * @param repo - The repository whose index to read.
 * @param base - The commit to compare against.
 * @returns The changed paths.
 */
function changedPaths(repo, base) {
  return execFileSync('git', ['diff', '--cached', '--name-only', '--no-renames', base, '--', KIT], {
    cwd: repo,
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  })
    .split('\n')
    .filter(Boolean)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const base =
    process.argv.find((arg) => arg.startsWith('--base='))?.slice('--base='.length) ?? 'HEAD'
  const tree = process.cwd()
  const repo = process.env.MOL_INDEX_REPO ?? tree
  const scope = goldenScope(changedPaths(repo, base))
  const pattern = testNamePattern(scope)
  if (!pattern) process.exit(0)
  const label = [...(scope.ui ? ['the UI kit'] : []), ...scope.features].join(', ')
  console.log(`check-golden-rules: axe-core and pseudo-locale rules over ${label}`)
  // In the hook's export, `node_modules` links to the checkout's, so the kit's setup file and
  // the `@molecule/*` packages it imports resolve into the checkout: Vite serves files from
  // the export alone unless the checkout is allowed too.
  const checkout = dirname(realpathSync(join(tree, 'node_modules')))
  const scratch = mkdtempSync(join(tmpdir(), 'check-golden-rules-'))
  const results = join(scratch, 'results.json')
  const config = join(tree, 'node_modules', '.cache', `check-golden-rules-${process.pid}.mjs`)
  mkdirSync(dirname(config), { recursive: true })
  writeFileSync(
    config,
    `import { mergeConfig } from 'vitest/config'\n` +
      `import base from ${JSON.stringify(join(tree, KIT, 'vitest.config.ts'))}\n` +
      `export default mergeConfig(base, { server: { fs: { allow: ${JSON.stringify([tree, checkout])} } } })\n`,
  )
  let child
  try {
    child = spawnSync(
      process.execPath,
      [
        join(tree, 'node_modules', 'vitest', 'vitest.mjs'),
        'run',
        `--config=${config}`,
        '--root=.',
        '--maxWorkers=1',
        '--reporter=default',
        '--reporter=json',
        `--outputFile.json=${results}`,
        ...GOLDEN_RULE_TESTS,
        '-t',
        pattern,
      ],
      { cwd: join(tree, KIT), stdio: 'inherit', env: { ...process.env, VITEST_MAX_WORKERS: '1' } },
    )
  } finally {
    rmSync(config, { force: true })
  }
  const report = existsSync(results) ? JSON.parse(readFileSync(results, 'utf8')) : undefined
  rmSync(scratch, { recursive: true, force: true })
  const ruleFailures = (report?.testResults ?? []).flatMap((file) =>
    (file.assertionResults ?? []).filter((test) => test.status === 'failed'),
  )
  if (ruleFailures.length)
    console.error(
      `check-golden-rules: the recorded React goldens of ${label} break a rule named above. Fix the React component it names (its own text goes through t(); the element gets its name or role), re-record its goldens with RECORD_GOLDENS=1 (${KIT}/README.md), and stage them again.`,
    )
  else if (child.status !== 0)
    console.error(
      `check-golden-rules: the golden rule tests did not run (${child.error?.message ?? child.signal ?? `vitest exited ${child.status}`}); the error is above.`,
    )
  process.exit(child.error ? 1 : (child.status ?? 1))
}
