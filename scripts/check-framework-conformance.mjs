#!/usr/bin/env node
/**
 * Every swappable framework bond runs the framework conformance kit.
 *
 * WHY THIS GATE EXISTS: an app moves between frameworks (React → Vue, Solid,
 * Svelte, Angular) by swapping its framework bonds, so each framework package
 * must export the same names as its React counterpart and behave the same way.
 * `@molecule/app-framework-conformance` holds that contract for each group of
 * swappable bonds (framework-neutral cases plus React's recorded results); each
 * bond proves it by running the kit from its own test suite. A bond that never
 * calls the kit is unchecked however far it drifts, and a NEW bond is unchecked
 * from the day it is created, so this gate finds every one from the tree.
 *
 * The groups ({@link GROUPS}), each measured against its React package:
 * - UI bonds (`@molecule/app-ui-*`, measured against `@molecule/app-ui-react`):
 *   the same components rendering the same DOM, through `runUIConformance`
 *   from `${KIT}/ui`;
 * - framework bindings (every other package under packages/app/frameworks/,
 *   measured against `@molecule/app-react`): the same hooks with the same
 *   results, service calls and cleanup, through `runBindingConformance` from
 *   `${KIT}/bindings`;
 * - routing bonds (`@molecule/app-routing` and every package under
 *   packages/app/bonds/routing/): the same `Router` behaviour over each bond's
 *   real native router, through `runRouterConformance` from `${KIT}/routing`.
 *   The cases state the behaviour directly, so there are no React goldens and
 *   no known gaps: every bond passes every case;
 * - feature bonds (every `packages/app/features/<x>-{vue,solid,svelte,angular}`
 *   whose `<x>-react` exists, each measured against that React package): the
 *   same components rendering the same DOM and the same plain exports, through
 *   `runFeatureConformance('<React package>', …)` from `${KIT}/features`.
 *
 * Rules, for every bond of a group except its exemptions:
 * - `src/__tests__/conformance.test.ts` (or `.tsx`) exists, imports the group's kit entry
 *   and calls the group's runner;
 * - for the UI and binding groups, `src/__tests__/conformance/known-gaps.json`
 *   is a JSON object whose values are arrays of case names (the kit runs listed
 *   cases as expected failures, so the list can only shrink);
 * - `devDependencies` lists `@molecule/app-framework-conformance` (so a change
 *   to the kit, its cases or its goldens re-runs this package's suite in CI's
 *   affected-package scope).
 * - no `.svelte`, `.vue` or `.html` file under a UI bond's `src/` (tests
 *   excepted) carries a static `class="…"` attribute or a Svelte `class:name`
 *   directive: CSS class names come from the ClassMap (molecule AGENTS.md
 *   Rule 5). ESLint's `no-raw-class-names` covers `.ts`/`.tsx`; it does not
 *   parse component markup, so this gate does.
 * The kit itself must stay private, keep each group's goldens test, and depend
 * on each React reference (for feature bonds: each one's React package) so a
 * React change re-checks the goldens.
 *
 * Feature bonds are held to full parity, and every React package has them:
 * - every React package under packages/app/features/ and
 *   packages/app/infrastructure/ (an `@molecule/app-*` package that depends on
 *   `react`, named `-react` or unsuffixed; a `-react` package that does not, like
 *   `@molecule/app-i18n-default-react`, is framework-neutral and every framework
 *   uses it as is) has a counterpart in each of {@link FEATURE_FRAMEWORKS} beside it
 *   (`@molecule/app-<x>-vue`, …; `<name>-vue` for an unsuffixed package),
 *   except the frameworks {@link FEATURE_PARITY_PENDING} still lists for it. That
 *   ledger may only shrink: an entry whose counterpart exists is a violation
 *   until it is removed, and a React package added later has no entry, so it
 *   ships with its counterparts;
 * - a feature bond's known-gaps.json is `{}`: it matches React in every case;
 * - every test title a React package declares is a test title in each of its counterparts
 *   ({@link titleParityViolations}): a feature or infrastructure package's `-vue`, `-solid`,
 *   `-svelte` and `-angular` packages, and in the UI, binding and routing groups each member
 *   that does not depend on React. The counterpart's test runs against its own
 *   implementation, so the behaviour React's test pins down is pinned down in every framework
 *   a bond can be swapped to. Titles not ported yet are listed in {@link TITLE_PARITY_PENDING},
 *   which may only shrink; a React test of something only React has is exempt, with the
 *   reason, in {@link TITLE_PARITY_EXEMPT};
 * - its conformance test passes its React package's cases
 *   (`${KIT}/features/cases/<x>`), and the kit has that cases file and its
 *   recorded goldens (`src/features/cases/<x>.ts`, `src/features/goldens/<x>.json` or, stored
 *   per component, `src/features/goldens/<x>/index.json`).
 *
 * With `--base=<commit>`, the ledgers and every known-gaps file must also hold no entry that commit
 * does not ({@link ledgerGrowthViolations}): they may only shrink, so a gap is closed by porting
 * it, never by listing it.
 *
 * @module
 */
import { execFileSync } from 'node:child_process'
import console from 'node:console'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { testFilesOf, testTitlesOf } from './lib/test-titles.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** The kit's package name. */
export const KIT = '@molecule/app-framework-conformance'

/** The React UI package every other UI bond is measured against. */
export const REFERENCE = '@molecule/app-ui-react'

/** UI bonds that do not run the kit, and why. */
export const EXEMPT = {
  [REFERENCE]:
    'the reference: the kit records its goldens from it and its goldens test re-renders it',
  '@molecule/app-ui-react-native':
    'renders native views, not DOM, so DOM conformance does not apply',
}

/** Routing bonds that do not run the router suite, and why. */
export const ROUTING_EXEMPT = {
  '@molecule/app-routing-react-navigation':
    'React Native screen navigation: it has no URL hash and runs only under react-native, which does not load in a DOM test',
}

/** The React bindings every other framework binding is measured against. */
export const BINDING_REFERENCE = '@molecule/app-react'

/** Framework bindings that do not run the kit, and why. */
export const BINDING_EXEMPT = {
  [BINDING_REFERENCE]:
    'the reference: the kit records its binding goldens from it and its bindings goldens test re-runs it',
  '@molecule/app-react-native':
    're-exports every @molecule/app-react hook unchanged (export * from), so it is the reference itself',
}

/** The frameworks a React feature package has counterparts in. */
export const FEATURE_FRAMEWORKS = ['vue', 'solid', 'svelte', 'angular']

/**
 * The ledger of React packages that do not have every framework counterpart
 * yet: React package → the frameworks it still lacks. It may only shrink.
 */
export const FEATURE_PARITY_PENDING = 'scripts/feature-parity-pending.json'

/** Where React packages that need framework counterparts live (each counterpart sits beside it). */
export const COUNTERPART_DIRS = ['packages/app/features', 'packages/app/infrastructure']

const FEATURE_SUFFIX = new RegExp(`-(${FEATURE_FRAMEWORKS.join('|')})$`)

/**
 * The kit's cases file name for a React feature package.
 *
 * @param reactPackage - `@molecule/app-tag-input-react`.
 * @returns `tag-input` (`src/features/cases/tag-input.ts`).
 */
export const featureCasesName = (reactPackage) =>
  reactPackage.replace(/^@molecule\/app-/, '').replace(/-react$/, '')

/**
 * The React feature package a framework feature package is the counterpart of.
 * A React package named without the `-react` suffix (`@molecule/app-chat-widget`,
 * depending on `react`) has its counterparts at `<name>-vue`, …; `reactNames`
 * tells the two apart.
 *
 * @param name - A feature package name (`@molecule/app-header-vue`).
 * @param [reactNames] - The React packages that exist. Without it the `-react` name is assumed.
 * @returns `@molecule/app-header-react` (or the unsuffixed React package `reactNames`
 *   holds), or null when the name has no framework suffix.
 */
export const featureReference = (name, reactNames) => {
  if (!FEATURE_SUFFIX.test(name)) return null
  const suffixed = name.replace(FEATURE_SUFFIX, '-react')
  const base = name.replace(FEATURE_SUFFIX, '')
  return reactNames && !reactNames.has(suffixed) && reactNames.has(base) ? base : suffixed
}

/**
 * The counterpart of a React package in one framework.
 *
 * @param reactPackage - `@molecule/app-header-react` or an unsuffixed React package.
 * @param framework - One of {@link FEATURE_FRAMEWORKS}.
 * @returns `@molecule/app-header-vue` (`<name>-vue` for an unsuffixed package).
 */
export const featureCounterpart = (reactPackage, framework) =>
  reactPackage.endsWith('-react')
    ? reactPackage.replace(/-react$/, `-${framework}`)
    : `${reactPackage}-${framework}`

/**
 * Each group of swappable framework bonds: which packages belong to it, the
 * React package they are measured against, and how they run the kit.
 */
export const GROUPS = [
  {
    kind: 'UI bond',
    packages: (root) => frameworkPackages(root),
    member: (name) => name.startsWith('@molecule/app-ui-'),
    reference: REFERENCE,
    exempt: EXEMPT,
    entry: `${KIT}/ui`,
    runner: 'runUIConformance',
    call: 'runUIConformance(adapter, { knownGaps })',
    goldensTest: 'goldens.test.ts',
    gapsKey: 'component',
  },
  {
    kind: 'framework binding',
    packages: (root) => frameworkPackages(root),
    member: (name) => name !== KIT && !name.startsWith('@molecule/app-ui-'),
    reference: BINDING_REFERENCE,
    exempt: BINDING_EXEMPT,
    entry: `${KIT}/bindings`,
    runner: 'runBindingConformance',
    call: 'runBindingConformance(adapter, { knownGaps })',
    goldensTest: 'bindings-goldens.test.ts',
    gapsKey: 'export',
  },
  {
    kind: 'feature bond',
    packages: (root) => featurePackages(root),
    member: (name, all) => {
      const reference = featureReference(name, reactFeatureNames(all))
      return reference !== null && all.some((p) => p.pkg.name === reference)
    },
    reference: null,
    referenceOf: (name, root, all = featurePackages(root)) =>
      featureReference(name, reactFeatureNames(all)),
    exempt: {},
    entry: `${KIT}/features`,
    runner: 'runFeatureConformance',
    call: "runFeatureConformance('<React package>', adapter, { module, cases, knownGaps })",
    goldensTest: 'features-goldens.test.ts',
    gapsKey: 'export',
    casesEntry: `${KIT}/features/cases`,
    fullParity: true,
  },
  {
    kind: 'routing bond',
    packages: (root) => routingPackages(root),
    member: (name) => name === '@molecule/app-routing' || name.startsWith('@molecule/app-routing-'),
    reference: null,
    exempt: ROUTING_EXEMPT,
    entry: `${KIT}/routing`,
    runner: 'runRouterConformance',
    call: "runRouterConformance('<bond>', createHarness)",
    goldensTest: null,
    gapsKey: null,
  },
]

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))

/** The names a bond's conformance test may have, in the order they are looked up. */
const TEST_FILE_NAMES = ['conformance.test.ts', 'conformance.test.tsx']

/** A static `class="…"` attribute (a `{…}` binding inside it is an expression, not a class list). */
const STATIC_CLASS = /(?:^|[\s<])class="([^"{]*)"/g
/** A Svelte `class:name={…}` directive: `name` is a raw class. */
const CLASS_DIRECTIVE = /(?:^|\s)class:([\w-]+)/g

/**
 * Lists component markup files under a package's `src/`, tests excepted.
 *
 * @param dir - Absolute package directory.
 * @returns Absolute file paths.
 */
const markupFiles = (dir) => {
  const out = []
  const walk = (p) => {
    if (!existsSync(p)) return
    for (const e of readdirSync(p, { withFileTypes: true })) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue
      const q = join(p, e.name)
      if (e.isDirectory()) walk(q)
      else if (/\.(svelte|vue|html)$/.test(e.name)) out.push(q)
    }
  }
  walk(join(dir, 'src'))
  return out.sort()
}

/**
 * Finds raw class names in component markup.
 *
 * @param root - The molecule repository root.
 * @param dir - Repo-relative package directory.
 * @returns One line per raw class list.
 */
export function rawMarkupClasses(root, dir) {
  const out = []
  for (const file of markupFiles(join(root, dir))) {
    const rel = file.slice(root.length + 1)
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        for (const m of line.matchAll(STATIC_CLASS)) {
          if (m[1].trim())
            out.push(
              `${rel}:${i + 1}: class="${m[1].trim()}" is a raw class list; use a ClassMap token (class={cm.…})`,
            )
        }
        for (const m of line.matchAll(CLASS_DIRECTIVE)) {
          out.push(
            `${rel}:${i + 1}: class:${m[1]} names a raw class; compose a ClassMap token into class={…} instead`,
          )
        }
      })
  }
  return out
}

/**
 * Lists the framework packages under `packages/app/frameworks/`.
 *
 * @param root - The molecule repository root.
 * @returns Each package dir (repo-relative) and its package.json.
 */
export function frameworkPackages(root = ROOT) {
  const base = join(root, 'packages', 'app', 'frameworks')
  return readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(base, e.name, 'package.json')))
    .map((e) => ({
      dir: `packages/app/frameworks/${e.name}`,
      pkg: readJson(join(base, e.name, 'package.json')),
    }))
    .sort((a, b) => a.dir.localeCompare(b.dir))
}

/**
 * Lists the feature packages under `packages/app/features/`.
 *
 * @param root - The molecule repository root.
 * @returns Each package dir (repo-relative) and its package.json.
 */
export function featurePackages(root = ROOT) {
  const base = join(root, 'packages', 'app', 'features')
  if (!existsSync(base)) return []
  return readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(base, e.name, 'package.json')))
    .map((e) => ({
      dir: `packages/app/features/${e.name}`,
      pkg: readJson(join(base, e.name, 'package.json')),
    }))
    .sort((a, b) => a.dir.localeCompare(b.dir))
}

/**
 * Lists the routing core and the routing bonds under `packages/app/bonds/routing/`.
 *
 * @param root - The molecule repository root.
 * @returns Each package dir (repo-relative) and its package.json.
 */
export function routingPackages(root = ROOT) {
  const core = 'packages/app/core/routing'
  const out = existsSync(join(root, core, 'package.json'))
    ? [{ dir: core, pkg: readJson(join(root, core, 'package.json')) }]
    : []
  const base = join(root, 'packages', 'app', 'bonds', 'routing')
  if (existsSync(base)) {
    for (const e of readdirSync(base, { withFileTypes: true })) {
      if (e.isDirectory() && existsSync(join(base, e.name, 'package.json')))
        out.push({
          dir: `packages/app/bonds/routing/${e.name}`,
          pkg: readJson(join(base, e.name, 'package.json')),
        })
    }
  }
  return out.sort((a, b) => a.dir.localeCompare(b.dir))
}

/**
 * Checks one bond's conformance test, known-gaps file and kit dependency.
 *
 * @param root - The molecule repository root.
 * @param bond - The bond's dir and package.json.
 * @param group - Its group from {@link GROUPS}.
 * @param all - The group's packages, read once by the caller.
 * @returns One line per violation.
 */
function bondViolations(root, { dir, pkg }, group, all) {
  const out = []
  // A bond whose harness renders JSX (React Router, Next.js) names it conformance.test.tsx.
  const testName = TEST_FILE_NAMES.find((name) =>
    existsSync(join(root, dir, 'src', '__tests__', name)),
  )
  if (!testName) {
    out.push(
      `${dir}: src/__tests__/conformance.test.ts (or .tsx) is missing; it must call ${group.call}`,
    )
  } else {
    const text = readFileSync(join(root, dir, 'src', '__tests__', testName), 'utf8')
    if (!text.includes(`'${group.entry}'`))
      out.push(`${dir}: ${testName} does not import '${group.entry}'`)
    if (!new RegExp(`\\b${group.runner}\\s*\\(`).test(text))
      out.push(`${dir}: ${testName} does not call ${group.runner}(`)
    const reference = group.referenceOf?.(pkg.name, root, all)
    if (reference && !text.includes(`'${reference}'`))
      out.push(`${dir}: ${testName} must measure the package against '${reference}'`)
    if (group.casesEntry && reference) {
      const cases = `${group.casesEntry}/${featureCasesName(reference)}`
      if (!text.includes(`'${cases}'`))
        out.push(`${dir}: ${testName} must pass ${reference}'s cases, imported from '${cases}'`)
    }
  }
  const gapsFile = join(root, dir, 'src', '__tests__', 'conformance', 'known-gaps.json')
  if (!group.gapsKey) {
    // The router suite takes no known gaps: every routing bond passes every case.
    if (existsSync(gapsFile))
      out.push(
        `${dir}: src/__tests__/conformance/known-gaps.json must not exist (${group.runner} has no known gaps)`,
      )
  } else if (!existsSync(gapsFile)) {
    out.push(
      `${dir}: src/__tests__/conformance/known-gaps.json is missing (use {} when nothing is known to differ)`,
    )
  } else {
    let gaps
    try {
      gaps = readJson(gapsFile)
    } catch (error) {
      out.push(`${dir}: known-gaps.json is not valid JSON (${error.message})`)
    }
    if (gaps !== undefined) {
      const valid =
        gaps !== null &&
        typeof gaps === 'object' &&
        !Array.isArray(gaps) &&
        Object.values(gaps).every((v) => Array.isArray(v) && v.every((c) => typeof c === 'string'))
      if (!valid)
        out.push(`${dir}: known-gaps.json must map ${group.gapsKey} names to arrays of case names`)
      else if (group.fullParity && Object.keys(gaps).length > 0)
        out.push(
          `${dir}: known-gaps.json must be {} (a feature bond matches its React package in every case): ${Object.keys(gaps).join(', ')}`,
        )
    }
  }
  if (!pkg.devDependencies?.[KIT]) out.push(`${dir}: devDependencies must list ${KIT}`)
  out.push(...buildTsconfigViolations(root, { dir, pkg }))
  return out
}

/** The tsconfig `exclude` entry that keeps a bond's build out of its tests. */
export const BUILD_TESTS_EXCLUDE = 'src/**/__tests__/**'

/**
 * The bond's build (tsc, ngc or svelte-check) type-checks every file its tsconfig includes. The
 * conformance test imports the kit's TypeScript source, whose own imports resolve only inside this
 * workspace, so a build that also checks the tests fails wherever the package is built alone (the
 * publish builds each new package from the committed tree). The tsconfig must exclude the tests.
 *
 * @param root - The molecule repository root.
 * @param bond - The bond's dir and package.json.
 * @returns One line per violation.
 */
function buildTsconfigViolations(root, { dir, pkg }) {
  const build = pkg.scripts?.build ?? ''
  const tool = build.match(/\b(svelte-check|tsc|ngc)\b/)?.[1]
  if (!tool) return []
  const named = build.match(
    tool === 'svelte-check'
      ? /svelte-check\b[^&|;]*?--tsconfig[\s=]+(\S+)/
      : new RegExp(`\\b${tool}\\b[^&|;]*?(?:-p|--project)[\\s=]+(\\S+)`),
  )?.[1]
  const tsconfig = named ?? 'tsconfig.json'
  const file = join(root, dir, tsconfig)
  if (!existsSync(file))
    return [`${dir}: its build runs ${tool} with ${tsconfig}, which is missing`]
  let exclude
  try {
    exclude = readJson(file).exclude
  } catch (error) {
    return [`${dir}: ${tsconfig} is not valid JSON (${error.message})`]
  }
  if (Array.isArray(exclude) && exclude.some((entry) => /(^|\/)__tests__(\/|$)/.test(entry)))
    return []
  return [
    `${dir}: ${tsconfig} must exclude the tests ("${BUILD_TESTS_EXCLUDE}"): the build's ${tool} otherwise type-checks the conformance test and, through it, the kit's source, which does not resolve when the package is built alone`,
  ]
}

/**
 * Finds every way the tree breaks the conformance contract.
 *
 * @param root - The molecule repository root.
 * @returns One line per violation; empty when the tree conforms.
 */
export function findConformanceViolations(root = ROOT) {
  const out = []
  const packages = frameworkPackages(root)
  const kit = packages.find((p) => p.pkg.name === KIT)
  if (!kit) {
    out.push(`${KIT}: not found under packages/app/frameworks/`)
  } else {
    if (kit.pkg.private !== true)
      out.push(`${kit.dir}: the kit must be "private": true (it is never published)`)
    for (const group of GROUPS) {
      const all = group.packages(root)
      const references = group.reference
        ? [group.reference]
        : group.referenceOf
          ? [
              ...new Set(
                all
                  .filter((b) => b.pkg.name && group.member(b.pkg.name, all))
                  .map((b) => group.referenceOf(b.pkg.name, root, all)),
              ),
            ].sort()
          : []
      for (const reference of references) {
        if (!kit.pkg.devDependencies?.[reference] && !kit.pkg.dependencies?.[reference]) {
          out.push(
            `${kit.dir}: must depend on ${reference} so a React change re-checks the goldens`,
          )
        }
      }
      if (!group.goldensTest || !references.length) continue
      if (!existsSync(join(root, kit.dir, 'src', '__tests__', group.goldensTest))) {
        out.push(
          `${kit.dir}: src/__tests__/${group.goldensTest} is missing (it keeps the goldens equal to React)`,
        )
      }
    }
  }

  const featureBonds = []
  for (const group of GROUPS) {
    const all = group.packages(root)
    for (const bond of all) {
      if (!bond.pkg.name || !group.member(bond.pkg.name, all) || group.exempt[bond.pkg.name])
        continue
      if (group.kind === 'feature bond') featureBonds.push(bond)
      out.push(...bondViolations(root, bond, group, all))
    }
  }

  out.push(...featureParityViolations(root, kit))
  out.push(...titleParityViolations(root))

  // Component markup of every UI bond and every feature bond takes its classes from the ClassMap.
  for (const { dir, pkg } of [...packages, ...featureBonds]) {
    if (pkg.name?.startsWith('@molecule/app-ui-') || featureBonds.some((b) => b.dir === dir))
      out.push(...rawMarkupClasses(root, dir))
  }
  return out
}

/**
 * Lists the packages in {@link COUNTERPART_DIRS}.
 *
 * @param root - The molecule repository root.
 * @returns Each package dir (repo-relative) and its package.json.
 */
export function counterpartPackages(root = ROOT) {
  const out = []
  for (const rel of COUNTERPART_DIRS) {
    const base = join(root, rel)
    if (!existsSync(base)) continue
    for (const e of readdirSync(base, { withFileTypes: true }))
      if (e.isDirectory() && existsSync(join(base, e.name, 'package.json')))
        out.push({ dir: `${rel}/${e.name}`, pkg: readJson(join(base, e.name, 'package.json')) })
  }
  return out.sort((a, b) => a.dir.localeCompare(b.dir))
}

/**
 * Whether a package is a React package that needs framework counterparts: an
 * `@molecule/app-*` package depending on `react`, named `-react` or without a
 * framework suffix (`@molecule/app-embeddable-chat-widget`). A `-react` package
 * without a `react` dependency is framework-neutral (mlcl's `packageFramework`
 * reads the same dependencies), so every framework already uses it; React Native
 * packages are their own platform.
 *
 * @param pkg - A package.json.
 * @returns True when it needs counterparts.
 */
export const isReactPackage = (pkg) => {
  const name = pkg.name ?? ''
  const deps = { ...pkg.peerDependencies, ...pkg.dependencies }
  if (!name.startsWith('@molecule/app-') || !('react' in deps) || 'react-native' in deps)
    return false
  return name.endsWith('-react') || !(FEATURE_SUFFIX.test(name) || /-react-native$/.test(name))
}

/**
 * The React packages among some packages.
 *
 * Computed once per list: the feature group's `member` asks it for every one of
 * ~900 packages, and rebuilding the set each time made the real-tree check
 * quadratic (tens of seconds).
 *
 * @param packages - Package dirs and package.jsons.
 * @returns Their React package names ({@link isReactPackage}).
 */
const reactFeatureNames = (packages) => {
  let names = reactNamesByList.get(packages)
  if (!names) {
    names = new Set(packages.filter((p) => isReactPackage(p.pkg)).map((p) => p.pkg.name))
    reactNamesByList.set(packages, names)
  }
  return names
}
/** {@link reactFeatureNames} per package list; a fresh list (a new scan) is computed anew. */
const reactNamesByList = new WeakMap()

/**
 * Finds React packages without every framework counterpart, ledger entries
 * that are out of date, and feature counterparts whose cases or goldens the
 * kit lacks.
 *
 * @param root - The molecule repository root.
 * @param kit - The kit's dir and package.json, or undefined when it is missing.
 * @returns One line per violation.
 */
export function featureParityViolations(root, kit) {
  const out = []
  const all = counterpartPackages(root)
  const names = new Set(all.map((p) => p.pkg.name))
  const ledgerFile = join(root, FEATURE_PARITY_PENDING)
  let ledger = {}
  if (existsSync(ledgerFile)) {
    try {
      ledger = readJson(ledgerFile)
    } catch (error) {
      return [`${FEATURE_PARITY_PENDING}: not valid JSON (${error.message})`]
    }
  }
  const reactPackages = all.filter((p) => isReactPackage(p.pkg))
  const reactNames = new Set(reactPackages.map((p) => p.pkg.name))
  for (const name of Object.keys(ledger).sort()) {
    if (!reactNames.has(name))
      out.push(
        `${FEATURE_PARITY_PENDING}: ${name} is not a React package (depending on react) in ${COUNTERPART_DIRS.join(' or ')}; remove its entry`,
      )
  }
  for (const { dir, pkg } of reactPackages) {
    const pending = ledger[pkg.name] ?? []
    for (const framework of FEATURE_FRAMEWORKS) {
      const counterpart = featureCounterpart(pkg.name, framework)
      const exists = names.has(counterpart)
      const sibling = `${dirname(dir)}/${counterpart.replace(/^@molecule\/app-/, '')}`
      if (!exists && !pending.includes(framework))
        out.push(
          `${dir}: has no ${framework} counterpart (${counterpart} in ${sibling}); every React package ships with its ${FEATURE_FRAMEWORKS.join(', ')} counterparts`,
        )
      if (exists && pending.includes(framework))
        out.push(
          `${FEATURE_PARITY_PENDING}: ${pkg.name} lists ${framework}, but ${counterpart} exists; remove it from the entry`,
        )
      if (exists && kit && dir.startsWith('packages/app/features/')) {
        const caseName = featureCasesName(pkg.name)
        const missing = (file) =>
          out.push(
            `${kit.dir}: ${file} is missing (${counterpart} is measured against ${pkg.name})`,
          )
        if (!existsSync(join(root, kit.dir, `src/features/cases/${caseName}.ts`)))
          missing(`src/features/cases/${caseName}.ts`)
        // Goldens are one file, or a directory per component (`goldensPerComponent`) with an index.
        if (
          !existsSync(join(root, kit.dir, `src/features/goldens/${caseName}.json`)) &&
          !existsSync(join(root, kit.dir, `src/features/goldens/${caseName}/index.json`))
        )
          missing(`src/features/goldens/${caseName}.json`)
      }
    }
    for (const framework of pending)
      if (!FEATURE_FRAMEWORKS.includes(framework))
        out.push(
          `${FEATURE_PARITY_PENDING}: ${pkg.name} lists ${framework}, which is not one of ${FEATURE_FRAMEWORKS.join(', ')}`,
        )
  }
  return [...new Set(out)]
}

/**
 * The ledger of React test titles a counterpart does not declare yet: counterpart package →
 * the titles it lacks. It may only shrink: a title the counterpart now declares, or that its
 * React package no longer declares, is a violation until it is removed.
 */
export const TITLE_PARITY_PENDING = 'scripts/test-title-parity-pending.json'

/**
 * React test files no counterpart has a test for, per React package: a path under the
 * package (a file, or a directory ending in `/`) → why no counterpart can run it. Each
 * one tests something only the React package has; behaviour every framework shares is
 * never exempt.
 */
export const TITLE_PARITY_EXEMPT = {
  [BINDING_REFERENCE]: {
    'src/render/':
      "`@molecule/app-react/render` holds helpers for React's render model (committed refs, effect events, stable callbacks), which no other binding has; app-facing hooks live on the root export, which every binding matches",
  },
  '@molecule/app-routing-react-router': {
    'src/__tests__/main-entry-without-react-dom.test.ts':
      'keeps the main entry loadable without react-dom, which only the react-router/dom split has',
    'src/__tests__/oldest-react-router-dom-exports.test.ts':
      'pins the /dom entry to the names react-router/dom 7.0.0 exports',
    'src/__tests__/routers.test.tsx':
      "turns off React Router's `useTransitions` (a React concurrent-rendering prop); the pages it guards are covered by every bond's lazy-page tests",
  },
}

/** The React Router bond the other frameworks' routing bonds are measured against. */
export const ROUTING_REFERENCE = '@molecule/app-routing-react-router'

/**
 * Whether a package.json depends on React at run time (a React package, never a counterpart
 * of one). A devDependency is not one: a counterpart may render React in its own tests.
 */
const dependsOnReact = (pkg) => 'react' in { ...pkg.peerDependencies, ...pkg.dependencies }

/**
 * Each React package and the counterparts that must declare its test titles: a React
 * feature or infrastructure package and its `-vue`, `-solid`, `-svelte` and `-angular`
 * counterparts that exist, and in each other group of swappable bonds (UI bonds,
 * framework bindings, routing bonds) its React package and every member that does not
 * depend on React.
 *
 * @param root - The molecule repository root.
 * @returns `{ react, ports }` pairs, each package as `{ dir, pkg }`.
 */
export function titleParityPairs(root = ROOT) {
  const out = []
  const counterparts = counterpartPackages(root)
  const byName = new Map(counterparts.map((p) => [p.pkg.name, p]))
  for (const react of counterparts.filter((p) => isReactPackage(p.pkg))) {
    const ports = FEATURE_FRAMEWORKS.map((fw) => byName.get(featureCounterpart(react.pkg.name, fw)))
    out.push({ react, ports: ports.filter(Boolean) })
  }
  const frameworks = frameworkPackages(root)
  const groups = [
    [REFERENCE, frameworks.filter((p) => p.pkg.name?.startsWith('@molecule/app-ui-'))],
    [
      BINDING_REFERENCE,
      frameworks.filter((p) => p.pkg.name !== KIT && !p.pkg.name?.startsWith('@molecule/app-ui-')),
    ],
    [
      ROUTING_REFERENCE,
      routingPackages(root).filter((p) => p.pkg.name !== '@molecule/app-routing'),
    ],
  ]
  for (const [reference, members] of groups) {
    const react = members.find((p) => p.pkg.name === reference)
    if (react) out.push({ react, ports: members.filter((p) => !dependsOnReact(p.pkg)) })
  }
  return out.filter((pair) => pair.ports.length > 0)
}

/**
 * Finds React test titles a counterpart does not declare, and ledger or exemption entries
 * that are out of date. Swapping a bond is only safe when its counterpart does what the
 * React package does, and the React package's tests say what that is: so each counterpart
 * declares a test with each React title, which the counterpart's own suite runs against
 * its own implementation.
 *
 * @param root - The molecule repository root.
 * @returns One line per violation.
 */
export function titleParityViolations(root = ROOT) {
  const out = []
  const ledgerFile = join(root, TITLE_PARITY_PENDING)
  let ledger = {}
  if (existsSync(ledgerFile)) {
    try {
      ledger = readJson(ledgerFile)
    } catch (error) {
      return [`${TITLE_PARITY_PENDING}: not valid JSON (${error.message})`]
    }
  }
  const pairs = titleParityPairs(root)
  const ported = new Set()
  for (const { react, ports } of pairs) {
    const exempt = TITLE_PARITY_EXEMPT[react.pkg.name] ?? {}
    const files = testFilesOf(join(root, react.dir))
    // An exemption that names no test file of a React package with tests has outlived its file.
    for (const path of files.length ? Object.keys(exempt) : [])
      if (!files.some((file) => (path.endsWith('/') ? file.startsWith(path) : file === path)))
        out.push(
          `${react.dir}: TITLE_PARITY_EXEMPT names ${path}, which holds no test file; remove the entry`,
        )
    const isExempt = (file) =>
      Object.keys(exempt).some((path) =>
        path.endsWith('/') ? file.startsWith(path) : file === path,
      )
    const titles = testTitlesOf(join(root, react.dir), (file) => !isExempt(file))
    for (const port of ports) {
      ported.add(port.pkg.name)
      const mine = testTitlesOf(join(root, port.dir))
      const pending = ledger[port.pkg.name] ?? []
      if (!Array.isArray(pending) || pending.some((t) => typeof t !== 'string')) {
        out.push(`${TITLE_PARITY_PENDING}: ${port.pkg.name} must list titles (strings)`)
        continue
      }
      const missing = new Map()
      for (const [title, file] of titles) {
        if (mine.has(title) || pending.includes(title)) continue
        missing.set(file, [...(missing.get(file) ?? []), title])
      }
      for (const [file, list] of missing)
        out.push(
          `${port.dir}: lacks ${list.length} test(s) of ${react.dir}/${file}: ${list.map((t) => JSON.stringify(t)).join(', ')}. Port each to a test in ${port.dir}/src with that exact title (an it.each table keeps the template), run against this package's implementation`,
        )
      for (const title of pending) {
        if (mine.has(title))
          out.push(
            `${TITLE_PARITY_PENDING}: ${port.pkg.name} declares ${JSON.stringify(title)} now; remove it from the entry`,
          )
        else if (!titles.has(title))
          out.push(
            `${TITLE_PARITY_PENDING}: ${react.pkg.name} declares no test ${JSON.stringify(title)} (or exempts its file); remove it from ${port.pkg.name}'s entry`,
          )
      }
    }
  }
  for (const name of Object.keys(ledger).sort())
    if (!ported.has(name))
      out.push(
        `${TITLE_PARITY_PENDING}: ${name} is not a counterpart of a React package; remove its entry`,
      )
  return out
}

/**
 * The title ledger with every entry removed that {@link titleParityViolations} reports as out
 * of date: titles a counterpart now declares, titles its React package no longer declares, and
 * packages that are no counterpart. It never adds a title, so a landing that ports tests can
 * shrink the ledger in the same commit and nothing can grow it.
 *
 * @param root - The molecule repository root.
 * @returns The shrunk ledger (counterpart package → titles), entries sorted by name.
 */
export function prunedTitlePending(root = ROOT) {
  const ledgerFile = join(root, TITLE_PARITY_PENDING)
  const ledger = existsSync(ledgerFile) ? readJson(ledgerFile) : {}
  const out = {}
  for (const { react, ports } of titleParityPairs(root)) {
    const exempt = Object.keys(TITLE_PARITY_EXEMPT[react.pkg.name] ?? {})
    const titles = testTitlesOf(
      join(root, react.dir),
      (file) => !exempt.some((p) => (p.endsWith('/') ? file.startsWith(p) : file === p)),
    )
    for (const port of ports) {
      const pending = ledger[port.pkg.name]
      if (!Array.isArray(pending)) continue
      const mine = testTitlesOf(join(root, port.dir))
      const kept = pending.filter((t) => typeof t === 'string' && titles.has(t) && !mine.has(t))
      if (kept.length) out[port.pkg.name] = kept
    }
  }
  return Object.fromEntries(
    Object.keys(out)
      .sort()
      .map((name) => [name, out[name]]),
  )
}

/** Where a bond keeps the conformance cases it still fails, under its package directory. */
const KNOWN_GAPS_SUFFIX = '/src/__tests__/conformance/known-gaps.json'

/**
 * The files that record what a counterpart still owes and may only shrink: the pending ledgers
 * and every bond's conformance `known-gaps.json`.
 *
 * @param root - The molecule repository root.
 * @returns Their repo-relative paths, those the tree holds.
 */
export function shrinkOnlyLedgers(root = ROOT) {
  const gaps = [...frameworkPackages(root), ...featurePackages(root), ...routingPackages(root)].map(
    ({ dir }) => `${dir}${KNOWN_GAPS_SUFFIX}`,
  )
  return [FEATURE_PARITY_PENDING, TITLE_PARITY_PENDING, ...gaps].filter((path) =>
    existsSync(join(root, path)),
  )
}

/**
 * The entries the tree's ledgers and known-gaps files hold that the base does not. Each may only
 * shrink, so a gap is closed by porting it, never by listing it: without this rule, a change could
 * add its own gap to the ledger and pass every other check.
 *
 * @param root - The molecule repository root.
 * @param readBase - Reads a repo-relative file at the base: its text, or `null` when the base has
 *   no such file.
 * @param base - The base's name, for messages.
 * @returns One line per added entry.
 */
export function ledgerGrowthViolations(root, readBase, base) {
  const out = []
  for (const path of shrinkOnlyLedgers(root)) {
    let now
    try {
      now = readJson(join(root, path))
    } catch (_error) {
      // Not JSON: the rule that reads this file names it; there is nothing to compare.
      continue
    }
    if (!now || typeof now !== 'object' || Array.isArray(now)) continue
    const text = readBase(path)
    // A port the base does not have at all starts its known-gaps.json here, and from then on it may
    // only shrink: landing a new port with its gaps closes more than it opens (its pending-ledger
    // entry goes). The pending ledgers are one file each, so they judge a new package's entries too.
    const gapsOf = path.endsWith(KNOWN_GAPS_SUFFIX)
      ? path.slice(0, -KNOWN_GAPS_SUFFIX.length)
      : null
    if (text === null && gapsOf !== null && readBase(`${gapsOf}/package.json`) === null) continue
    let before = {}
    if (text !== null)
      try {
        before = JSON.parse(text)
      } catch (_error) {
        // A base whose copy is not JSON lists nothing, so every entry the tree holds is new.
        before = {}
      }
    for (const [name, entries] of Object.entries(now)) {
      if (!Array.isArray(entries)) continue
      const had = new Set(Array.isArray(before?.[name]) ? before[name] : [])
      for (const entry of entries)
        if (!had.has(entry))
          out.push(
            `${path}: ${name} adds ${JSON.stringify(entry)}, which ${base} does not list; this file may only shrink, so port it instead of listing it`,
          )
    }
  }
  return out
}

/**
 * Reads files at one commit of a git repository, for {@link ledgerGrowthViolations}.
 *
 * @param root - The repository root.
 * @param rev - The commit (a sha, `HEAD`, `origin/main`).
 * @returns `readBase(path)`: the file's text at `rev`, or `null` when `rev` has no such file.
 * @throws {Error} When `rev` names no commit, so a mistyped base is never read as an empty one.
 */
export function gitFileReader(root, rev) {
  const git = (args) =>
    execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  try {
    git(['rev-parse', '--verify', '--quiet', `${rev}^{commit}`])
  } catch (error) {
    throw new Error(`--base=${rev} names no commit of ${root}`, { cause: error })
  }
  return (path) =>
    git(['ls-tree', '--name-only', rev, '--', path]).trim() ? git(['show', `${rev}:${path}`]) : null
}

/**
 * The base `--base=ci` names, chosen as `scripts/affected-projects.mjs` chooses its diff base: a
 * pull request's merge base with its target branch, or the commit before a push. A push that
 * created its branch, and any run outside CI, has none: the tree is checked alone (the release's
 * committed-tree mirror of CI), and the pre-commit hook judges growth against the commit's parent.
 *
 * @param env - The environment: GITHUB_EVENT_NAME, GITHUB_BASE_REF and GITHUB_EVENT_BEFORE.
 * @param mergeBase - Returns the merge base of a ref and HEAD.
 * @returns The base commit, or `null`.
 * @throws {Error} For a pull request without GITHUB_BASE_REF.
 */
export function ciBase(env, mergeBase) {
  if (env.GITHUB_EVENT_NAME === 'pull_request') {
    if (!env.GITHUB_BASE_REF) throw new Error('--base=ci: a pull request with no GITHUB_BASE_REF')
    return mergeBase(`origin/${env.GITHUB_BASE_REF}`)
  }
  if (env.GITHUB_EVENT_NAME === 'push') {
    const before = env.GITHUB_EVENT_BEFORE ?? ''
    return /^0*$/.test(before) ? null : before
  }
  return null
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain && process.argv.includes('--prune-title-pending')) {
  // Shrinks the title ledger to what is still missing; the check itself runs without the flag.
  writeFileSync(
    join(ROOT, TITLE_PARITY_PENDING),
    `${JSON.stringify(prunedTitlePending(), null, 2)}\n`,
  )
} else if (isMain) {
  // --base=<commit>: also refuse any ledger or known-gaps entry that commit does not hold
  // (pre-commit: the commit's parent; CI: --base=ci, the commit the push or pull request starts from).
  const baseArg = process.argv.find((a) => a.startsWith('--base='))?.slice('--base='.length)
  // run-on-index runs this from an export of the index, which has no .git: the base is read from
  // the repository the export came from.
  const repo = process.env.MOL_INDEX_REPO ?? ROOT
  const base =
    baseArg === 'ci'
      ? ciBase(process.env, (ref) =>
          execFileSync('git', ['-C', repo, 'merge-base', ref, 'HEAD'], { encoding: 'utf8' }).trim(),
        )
      : baseArg
  if (baseArg === 'ci' && !base)
    console.log(
      'framework-conformance: no push or pull-request base, so ledger growth is not judged here (the pre-commit hook judges it against the commit parent)',
    )
  // Read first, so a base that names no commit stops the check before the long scan.
  let readBase = null
  if (base)
    try {
      readBase = gitFileReader(repo, base)
    } catch (error) {
      // A force push's before-commit is not in CI's clone: say so and check the tree alone. A
      // base named by hand that names no commit is a mistake, and stops the check.
      if (baseArg !== 'ci') throw error
      console.log(
        `framework-conformance: ${error.message} (a force push), so ledger growth is not judged here`,
      )
    }
  const violations = [
    ...findConformanceViolations(),
    ...(readBase ? ledgerGrowthViolations(ROOT, readBase, base) : []),
  ]
  for (const v of violations) console.error(`framework-conformance: ${v}`)
  if (violations.length) process.exit(1)
  console.log(
    'framework-conformance: every UI bond, framework binding, feature bond and routing bond runs the conformance kit, every React package has its framework counterparts (or a pending-ledger entry), and every counterpart declares its React package’s test titles (or a pending-ledger entry)',
  )
}
