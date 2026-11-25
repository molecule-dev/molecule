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
 * - every counterpart exports each name, kind (value or type) and subpath its React package
 *   exports ({@link exportParityViolations}): feature and infrastructure counterparts, UI bonds,
 *   framework bindings and routing bonds alike. Exports only React has are in
 *   {@link EXPORT_EXEMPT}, ones a counterpart's framework does another way (naming the
 *   counterpart's own export) in {@link PORT_EXPORT_EXEMPT}, and ones still being ported in
 *   {@link EXPORT_PARITY_PENDING}, which may only shrink;
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
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { BINDING_MOCK_FIX, partialBindingMocks } from './lib/binding-mocks.mjs'
import { testFilesOf, testTitlesOf } from './lib/test-titles.mjs'
import {
  ROUTER_LIBRARY_FIX,
  ROUTER_LIBRARY_OWNERS,
  ROUTER_LIBRARY_PACKAGES,
} from './router-libraries.mjs'

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
  {
    kind: 'markdown provider',
    packages: (root) => markdownPackages(root),
    member: (name) => name.startsWith('@molecule/app-markdown-'),
    reference: null,
    exempt: {},
    entry: `${KIT}/markdown`,
    runner: 'runMarkdownConformance',
    call: "runMarkdownConformance('<bond>', createProvider)",
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
 * Lists the markdown providers under `packages/app/bonds/markdown/`. Each one renders the same
 * DOM and table of contents for the same markdown, so an app swaps one for another.
 *
 * @param root - The molecule repository root.
 * @returns Each provider's dir (repo-relative) and package.json.
 */
export function markdownPackages(root = ROOT) {
  const base = join(root, 'packages', 'app', 'bonds', 'markdown')
  if (!existsSync(base)) return []
  return readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(base, e.name, 'package.json')))
    .map((e) => ({
      dir: `packages/app/bonds/markdown/${e.name}`,
      pkg: readJson(join(base, e.name, 'package.json')),
    }))
    .sort((a, b) => a.dir.localeCompare(b.dir))
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
    // The router and markdown suites take no known gaps: every bond passes every case.
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
 * @param [ledgers] - The export exemptions to hold the tree to (see {@link exportParityViolations});
 *   a fixture tree passes its own.
 * @returns One line per violation; empty when the tree conforms.
 */
export function findConformanceViolations(root = ROOT, ledgers = {}) {
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
  out.push(...routerLibraryViolations(root))
  out.push(...bindingMockViolations(root))
  out.push(...titleParityViolations(root))
  out.push(...exportParityViolations(root, ledgers))

  // Component markup of every UI bond and every feature bond takes its classes from the ClassMap.
  for (const { dir, pkg } of [...packages, ...featureBonds]) {
    if (pkg.name?.startsWith('@molecule/app-ui-') || featureBonds.some((b) => b.dir === dir))
      out.push(...rawMarkupClasses(root, dir))
  }
  return out
}

/** The app package directories {@link routerLibraryViolations} reads: `<dir>/<name>` or `<dir>/<group>/<name>`. */
const APP_PACKAGE_DIRS = ['bonds', 'core', 'features', 'frameworks', 'native', 'utilities']

/**
 * Finds app packages outside the routing bonds and composition roots that declare a router
 * library ({@link ROUTER_LIBRARY_PACKAGES}) in any dependency field: such a package works
 * under one routing bond only, and its peer pulls that router into every app that installs it.
 *
 * @param root - The molecule repository root.
 * @returns One line per declared router library, by package directory.
 */
export function routerLibraryViolations(root) {
  const out = []
  const visit = (rel, depth) => {
    const abs = join(root, rel)
    if (!existsSync(abs)) return
    const entries = readdirSync(abs, { withFileTypes: true })
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!e.isDirectory() || e.name === 'node_modules') continue
      const dir = `${rel}/${e.name}`
      if (ROUTER_LIBRARY_OWNERS.some((owner) => `${dir}/`.startsWith(owner))) continue
      if (!existsSync(join(root, dir, 'package.json'))) {
        if (depth === 0) visit(dir, 1)
        continue
      }
      const pkg = readJson(join(root, dir, 'package.json'))
      for (const field of ['dependencies', 'peerDependencies', 'devDependencies']) {
        for (const library of ROUTER_LIBRARY_PACKAGES) {
          if (pkg[field]?.[library] !== undefined)
            out.push(`${dir}: ${field} declares ${library}. ${ROUTER_LIBRARY_FIX}`)
        }
      }
    }
  }
  for (const top of APP_PACKAGE_DIRS) visit(`packages/app/${top}`, 0)
  return out
}

/**
 * Finds the tests of app packages that mock a framework binding without its real exports
 * (`scripts/lib/binding-mocks.mjs`): a shared component that starts reading another export of
 * the binding breaks every such test, in packages its change never touched.
 *
 * @param root - The molecule repository root.
 * @returns One line per such `vi.mock`, by file and line.
 */
export function bindingMockViolations(root) {
  const out = []
  // `packages/app/<dir>/<name>` or `packages/app/<dir>/<group>/<name>`.
  const visit = (rel, depth) => {
    const abs = join(root, rel)
    if (!existsSync(abs)) return
    const entries = readdirSync(abs, { withFileTypes: true })
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!e.isDirectory() || e.name === 'node_modules') continue
      const dir = `${rel}/${e.name}`
      if (!existsSync(join(root, dir, 'package.json'))) {
        if (depth < 2) visit(dir, depth + 1)
        continue
      }
      for (const file of testFilesOf(join(root, dir))) {
        const text = readFileSync(join(root, dir, file), 'utf8')
        if (!text.includes('vi.mock(')) continue
        for (const { binding, line } of partialBindingMocks(text, file))
          out.push(
            `${dir}/${file}:${line}: vi.mock('${binding}') replaces the binding without its real exports; ${BINDING_MOCK_FIX}`,
          )
      }
    }
  }
  visit('packages/app', 0)
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
  [REFERENCE]: {
    'src/elements/':
      'tests the renderer-neutral elements (`@molecule/app-ui-react/elements`) one React kit renders with on React DOM and React Native; a Vue, Svelte, Solid or Angular port renders its own DOM, and matches the components built on the elements through the conformance goldens',
  },
  [BINDING_REFERENCE]: {
    'src/render/':
      "`@molecule/app-react/render` holds helpers for React's render model (committed refs, effect events, stable callbacks), which no other binding has; app-facing hooks live on the root export, which every binding matches",
    'src/__tests__/useRouter.route-params-hook.test.tsx':
      "tests `RouterProvider`'s `useRouteParams`, a hook only React Router needs: it scopes route params to the calling component, while Vue Router, SvelteKit, Solid Router and Angular Router answer params at the router's root, so no other binding takes such a hook",
  },
  '@molecule/app-copy-link-field-react': {
    'src/__tests__/copy-link-field-native-focus.test.tsx':
      "calls the field's focus handler with a React Native focus event, which has no selectable web field; a Vue, Svelte, Solid or Angular port renders a DOM input, and each tests selecting it on focus",
  },
  '@molecule/app-diff-viewer-react': {
    'src/__tests__/diff-viewer-keys.test.tsx':
      "checks React's missing-key warning for list rows; Vue, Svelte, Solid and Angular key their lists in their own templates and log no such warning",
  },
  '@molecule/app-footer-react': {
    'src/__tests__/footer-rich-elements.test.tsx':
      'checks that the React footer uses the portable elements path without assigning innerHTML; the DOM ports use their own HTML rendering',
  },
  '@molecule/app-legal-pages-react': {
    'src/__tests__/legal-rich-elements.test.tsx':
      'checks that the React page and modal use the portable elements path without assigning innerHTML; the DOM ports use their own HTML rendering',
  },
  '@molecule/app-kanban-board-react': {
    'src/__tests__/kanban-board-renderer.test.tsx':
      'covers React DragDropRendererProvider switching and React portal event bubbling; the four DOM ports use their own renderer and event system',
  },
  '@molecule/app-reorderable-list-react': {
    'src/__tests__/reorderable-list-renderer.test.tsx':
      'exercises React portal event bubbling and focus across a portal to an iframe; the four DOM ports use their own renderer and event system',
  },
  '@molecule/app-photo-lightbox-react': {
    'src/__tests__/photo-lightbox-no-document.test.tsx':
      'opens the lightbox with no global `document`, as on React Native; a Vue, Svelte, Solid or Angular port renders in a browser, which always has one',
  },
  '@molecule/app-routing-react-router': {
    'src/__tests__/main-entry-without-react-dom.test.ts':
      'keeps the main entry loadable without react-dom, which only the react-router/dom split has',
    'src/__tests__/route-params.test.tsx':
      "React Router scopes route params to the matched route (`useParams()` is empty at the router's root), so the bond reads them where the component is; Vue Router, SvelteKit, Solid Router and Angular Router answer params at the root, and data routers are React Router's alone",
    'src/__tests__/routers.test.tsx':
      "turns off React Router's `useTransitions` (a React concurrent-rendering prop); the pages it guards are covered by every bond's lazy-page tests",
    'src/__tests__/static-routers.test.tsx':
      "wraps React Router's server routers (`StaticRouter`, `StaticRouterProvider`), components only React Router has: the other bonds render on the server through the same provider as in the browser",
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

/** Each framework's word for `React` in a counterpart's export names (`ReactRouter` is tried first). */
export const FRAMEWORK_WORDS = {
  vue: { ReactRouter: 'VueRouter', React: 'Vue' },
  solid: { ReactRouter: 'SolidRouter', React: 'Solid' },
  svelte: { ReactRouter: 'SvelteKit', React: 'Svelte' },
  angular: { ReactRouter: 'AngularRouter', React: 'Angular' },
}

/**
 * The names a counterpart may export in place of a React package's export: the same name, or
 * the name with its framework's word for `React` (`createReactRouter` → `createVueRouter`).
 *
 * @param name - The React package's export name.
 * @param framework - One of {@link FEATURE_FRAMEWORKS}, or undefined for a package without one.
 * @returns The accepted names, the React name first.
 */
export const counterpartNames = (name, framework) => {
  const words = FRAMEWORK_WORDS[framework]
  if (!words) return [name]
  return [
    ...new Set([
      name,
      name.replace('ReactRouter', words.ReactRouter),
      name.replace('React', words.React),
    ]),
  ]
}

/**
 * A counterpart's framework, read from its package name (`-vue`, `app-ui-svelte`,
 * `routing-sveltekit`).
 *
 * @param name - A package name.
 * @returns One of {@link FEATURE_FRAMEWORKS}, or undefined.
 */
const portFramework = (name) =>
  FEATURE_FRAMEWORKS.find((f) => new RegExp(`-${f}(?:-|kit|$)`).test(name ?? ''))

/**
 * Exports only a React package has, per React package, and why: names and subpaths for a React
 * mechanism that no other framework has. No counterpart has to export them. `Name (value)` or
 * `Name (type)` exempts one kind of a name React exports as both.
 */
export const EXPORT_EXEMPT = {
  '@molecule/app-ui-react': {
    './elements':
      'the renderer-neutral elements one React feature renders with on React DOM and React Native; a Vue, Svelte, Solid or Angular port renders its own DOM',
  },
  '@molecule/app-react': {
    './render':
      "React render-cycle helpers (committed refs, effect events, stable callbacks) for code written to React's render model; the other frameworks' reactivity has no render to stabilize against",
  },
  [ROUTING_REFERENCE]: {
    BrowserRouter: "React Router's router component (each port mounts its native router's own)",
    BrowserRouterProps: "props of React Router's router component",
    HashRouter: "React Router's router component (each port mounts its native router's own)",
    HashRouterProps: "props of React Router's router component",
    HistoryRouterProps: "props of React Router's router component",
    MemoryRouter: "React Router's router component (each port mounts its native router's own)",
    MemoryRouterProps: "props of React Router's router component",
    RouterProps: "props of React Router's router component",
    RouterProvider:
      "React Router's data-router component (each port mounts its native router's own)",
    RouterProviderProps: "props of React Router's data-router component",
    StaticRouter:
      "React Router's server-render router component (each port renders on the server through its native router's own)",
    StaticRouterProps: "props of React Router's server-render router component",
    StaticRouterProvider:
      "React Router's server-render data-router component (each port renders on the server through its native router's own)",
    StaticRouterProviderProps: "props of React Router's server-render data-router component",
    unstable_HistoryRouter:
      "React Router's router component (each port mounts its native router's own)",
    'Router (value)':
      "React Router's low-level router component; the Router type (the molecule router) is still owed",
    createReactRouter:
      'builds the molecule Router over React Router; each port has its own (createVueRouter, …)',
    ReactRouterConfig: "createReactRouter's options; each port has its own constructor's",
    ReactRouterHooks:
      "React Router's hooks createReactRouter reads; each port reads its own router",
    './dom':
      "React Router DOM's data routers (RouterProvider, HydratedRouter); each port mounts its native router's own",
    './dist':
      'the build folder as an older import path of the root entry; import the package itself',
  },
}

/**
 * The twelve services a framework binding provides, by React's context and component names, with
 * each port's own way to provide and read that service. React's `<XContext>` objects and
 * `<XProvider>` components are React mechanisms: Vue reads a service through its injection key,
 * Svelte through its context functions, Angular through its DI token and `provideX()`.
 */
const BINDING_SERVICES = [
  ['State', 'state', 'STATE_PROVIDER', 'StateProvider'],
  ['Auth', 'auth', 'AUTH_CLIENT', 'AuthClient'],
  ['Theme', 'theme', 'THEME_PROVIDER', 'ThemeProvider'],
  ['Router', 'router', 'ROUTER', 'Router'],
  ['I18n', 'i18n', 'I18N_PROVIDER', 'I18nProvider'],
  ['Http', 'http', 'HTTP_CLIENT', 'HttpClient'],
  ['Storage', 'storage', 'STORAGE_PROVIDER', 'StorageProvider'],
  ['Logger', 'logger', 'LOGGER_PROVIDER', 'LoggerProvider'],
  ['Chat', 'chat', 'CHAT_PROVIDER', 'ChatProvider'],
  ['Workspace', 'workspace', 'WORKSPACE_PROVIDER', 'WorkspaceProvider'],
  ['Editor', 'editor', 'EDITOR_PROVIDER', 'EditorProvider'],
  ['Preview', 'preview', 'PREVIEW_PROVIDER', 'PreviewProvider'],
]

/** Svelte's reader of each service's context ({@link BINDING_SERVICES} order). */
const SVELTE_READERS = {
  State: 'useStateProvider',
  Auth: 'useAuthClient',
  Theme: 'useThemeProvider',
  Router: 'getRouter',
  I18n: 'useI18nProvider',
  Http: 'useHttpClient',
  Storage: 'useStorageProvider',
  Logger: 'useLoggerProvider',
  Chat: 'useChatProvider',
  Workspace: 'useWorkspaceProvider',
  Editor: 'useEditorProvider',
  Preview: 'usePreviewProvider',
}

/**
 * Exports of a React package that one counterpart does not have, per counterpart, and why: each
 * entry names the counterpart's own exports that do that job (`use`, which the gate checks it
 * exports) and the reason its framework has no such export. Only a mechanism the counterpart's
 * framework lacks belongs here; a hook, a hook's result type, a prop or option type, or a
 * component the framework can express does not, and a name not ported yet goes in
 * {@link EXPORT_PARITY_PENDING}.
 */
export const PORT_EXPORT_EXEMPT = {
  '@molecule/app-vue': Object.fromEntries(
    BINDING_SERVICES.map(([s]) => [
      `${s}Context`,
      {
        use: [`${s}Key`],
        why: `a React context object; Vue reads the service with inject(${s}Key)`,
      },
    ]),
  ),
  '@molecule/app-svelte': Object.fromEntries(
    BINDING_SERVICES.map(([s]) => [
      `${s}Context`,
      {
        use: [`set${s}Context`, SVELTE_READERS[s]],
        why: `a React context object; Svelte sets the service with set${s}Context() and reads it with ${SVELTE_READERS[s]}()`,
      },
    ]),
  ),
  '@molecule/app-angular': {
    ...Object.fromEntries(
      BINDING_SERVICES.flatMap(([s, key, token]) => [
        [
          `${s}Context`,
          {
            use: [token],
            why: `a React context object; Angular reads the service with inject(${token})`,
          },
        ],
        [
          `${s}Provider`,
          {
            use: [`provide${s}`],
            why: `a React provider component; Angular DI providers are fixed at bootstrap, so provide${s}() (or provideMolecule({ ${key} })) supplies the service`,
          },
        ],
        [
          `${s}ProviderProps`,
          { use: [`provide${s}`], why: `props of a React provider component (see ${s}Provider)` },
        ],
      ]),
    ),
    MoleculeProvider: {
      use: ['provideMolecule'],
      why: "a React provider component; Angular DI providers are fixed at bootstrap, so provideMolecule() takes MoleculeProvider's keys, and while the session restores the page shows the app root's index.html content (Angular has no sessionFallback)",
    },
    MoleculeProviderProps: {
      use: ['provideMolecule', 'MoleculeModuleConfig'],
      why: "props of a React provider component; provideMolecule's MoleculeModuleConfig takes the same keys",
    },
    ProviderProps: {
      use: ['provideMolecule'],
      why: "the children prop every React provider component takes; Angular's providers have no children",
    },
  },
  '@molecule/app-routing-angular-router': {
    MoleculeRouterProvider: {
      use: ['provideMoleculeRouter'],
      why: 'Angular wires the router through DI at bootstrap',
    },
    MoleculeRouterProviderProps: {
      use: ['provideMoleculeRouter', 'AngularRouterOptions'],
      why: "provideMoleculeRouter's AngularRouterOptions are the counterpart",
    },
  },
  '@molecule/app-routing-sveltekit': {
    defineRoute: {
      use: [],
      why: 'SvelteKit declares a route by its file path under src/routes, not in code',
    },
    lazyPage: {
      use: [],
      why: 'SvelteKit loads every page lazily from its route file; there is no page to wrap',
    },
    LazyPageOptions: { use: [], why: "lazyPage's options (lazyPage is exempt)" },
    LazyLoadableComponent: { use: [], why: "lazyPage's loader type (lazyPage is exempt)" },
  },
}

/**
 * Ledger of React exports a counterpart has not ported yet (counterpart → names and subpaths);
 * it may only shrink.
 */
export const EXPORT_PARITY_PENDING = 'scripts/export-parity-pending.json'

/**
 * Every `@molecule/*` package's entry sources in the tree: its name (and each subpath, as
 * `name/sub`) to the TypeScript file {@link entrySource} maps it to.
 *
 * @param root - The molecule repository root.
 * @returns A resolver from a module specifier to its source file, `undefined` for any other.
 */
export function moleculeSourceResolver(root) {
  const sources = new Map()
  /**
   * Records the package at `rel`, or walks into its directories until one holds a package.json.
   *
   * @param rel - A repo-relative directory under `packages/`.
   */
  const walk = (rel) => {
    const abs = join(root, rel)
    if (rel !== 'packages' && existsSync(join(abs, 'package.json'))) {
      const pkg = readJson(join(abs, 'package.json'))
      if (typeof pkg.name !== 'string' || !pkg.name.startsWith('@molecule/')) return
      for (const key of ['.', ...subpathKeys(pkg)]) {
        const file = entrySource(root, { dir: rel, pkg }, key)
        if (file) sources.set(key === '.' ? pkg.name : pkg.name + key.slice(1), file)
      }
      return
    }
    for (const e of readdirSync(abs, { withFileTypes: true }))
      if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.'))
        walk(`${rel}/${e.name}`)
  }
  if (existsSync(join(root, 'packages'))) walk('packages')
  return (specifier) => sources.get(specifier)
}

/**
 * The names each module exports and their kinds, as TypeScript resolves them (`export *`
 * chains, re-exports from other packages, a `.svelte` component's default re-export).
 *
 * @param files - Absolute paths of the entry modules (`src/index.ts`).
 * @param [options] - How to resolve imports.
 * @param [options.resolve] - The source file of a module specifier, or `undefined` to resolve
 *   it as Node does ({@link moleculeSourceResolver}: every `@molecule/*` import is read from
 *   its package's source, so the answer does not depend on which packages are built).
 * @returns Per file, each export name and its kinds (`value`, `type`, and `class` for a class
 *   with no other type declaration), or `null` when the export cannot be resolved without a
 *   framework's own tooling (a `.svelte` component). A name exported with `export type` is a
 *   type whether or not its target resolves.
 */
export function moduleExports(files, { resolve } = {}) {
  const ts = createRequire(import.meta.url)('typescript')
  const options = {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.Preserve,
    noLib: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
  }
  const host = ts.createCompilerHost(options)
  if (resolve)
    host.resolveModuleNameLiterals = (literals, containingFile, redirected, opts, sourceFile) =>
      literals.map((literal) => {
        const file = resolve(literal.text)
        if (!file) {
          const mode = ts.getModeForUsageLocation(sourceFile, literal, opts)
          return ts.resolveModuleName(
            literal.text,
            containingFile,
            opts,
            host,
            undefined,
            redirected,
            mode,
          )
        }
        const extension = file.endsWith('.tsx') ? ts.Extension.Tsx : ts.Extension.Ts
        return {
          resolvedModule: { resolvedFileName: file, extension, isExternalLibraryImport: false },
        }
      })
  const program = ts.createProgram({ rootNames: files, options, host })
  const checker = program.getTypeChecker()
  return files.map((file) => {
    const out = new Map()
    const source = program.getSourceFile(file)
    const moduleSymbol = source && checker.getSymbolAtLocation(source)
    if (!moduleSymbol) return out
    for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
      const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
      // A value reached through `export type` is a type to the importer: it has no runtime binding.
      const typeOnly =
        symbol.declarations?.some((d) => ts.isTypeOnlyImportOrExportDeclaration(d)) === true
      // An unresolved re-export has no declarations (TypeScript's stand-in symbol); through
      // `export type` it is still a type, whatever it names.
      if (!target.declarations?.length) {
        out.set(symbol.name, typeOnly ? new Set(['type']) : null)
        continue
      }
      const kinds = new Set()
      if (target.flags & ts.SymbolFlags.Value && !typeOnly) kinds.add('value')
      if (target.flags & ts.SymbolFlags.Type || !kinds.size) kinds.add('type')
      // A class's instance type comes with the class syntax, not as an export of its own: a
      // counterpart owes its value (a class still serves as a type wherever it is exported).
      if (
        kinds.has('value') &&
        target.flags & ts.SymbolFlags.Class &&
        !(target.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias))
      )
        kinds.add('class')
      out.set(symbol.name, kinds)
    }
    return out
  })
}

/**
 * The names each module exports, types included ({@link moduleExports} without the kinds).
 *
 * @param files - Absolute paths of the entry modules.
 * @returns Each file's export names, sorted.
 */
export function moduleExportNames(files) {
  return moduleExports(files).map((m) => [...m.keys()].sort())
}

/**
 * A package's subpath entries: its `exports` keys other than `.`, `./package.json` and patterns
 * (a `*` key exposes files, not a named entry).
 *
 * @param pkg - A package.json.
 * @returns The subpath keys.
 */
const subpathKeys = (pkg) =>
  pkg.exports && typeof pkg.exports === 'object' && !Array.isArray(pkg.exports)
    ? Object.keys(pkg.exports).filter(
        (k) => k.startsWith('./') && k !== './package.json' && !k.includes('*'),
      )
    : []

/**
 * The TypeScript source of one entry: `src/index.ts` for `.`, and for a subpath the file its
 * `exports` target names under `dist/`, mapped back into `src/`.
 *
 * @param root - The molecule repository root.
 * @param entry - A package's dir and package.json.
 * @param key - `.` or a subpath key.
 * @returns The absolute source path, or undefined when it is not a TypeScript module.
 */
const entrySource = (root, { dir, pkg }, key) => {
  if (key === '.') {
    const index = join(root, dir, 'src', 'index.ts')
    return existsSync(index) ? index : undefined
  }
  const target = pkg.exports[key]
  const file =
    typeof target === 'string' ? target : (target?.types ?? target?.import ?? target?.default)
  if (typeof file !== 'string' || !file.startsWith('./dist/')) return undefined
  const stem = file.slice('./dist/'.length).replace(/(\.d\.ts|\.js)$/, '')
  return ['.ts', '.tsx', '/index.ts', '/index.tsx']
    .map((ext) => join(root, dir, 'src', `${stem}${ext}`))
    .find((p) => existsSync(p))
}

/**
 * Finds exports of a React package its counterparts lack: each name (types included) of each
 * entry, under the same name or with the framework's word for `React`
 * ({@link counterpartNames}), as the same kind (a value where React's is a value, a type where
 * React's is a type), and each subpath. An app swaps a React package for its counterpart package
 * for package, so the counterpart exports what the React one does. Covers every pair
 * {@link titleParityPairs} measures: feature and infrastructure packages, UI bonds, framework
 * bindings and routing bonds. Exports only React has are in {@link EXPORT_EXEMPT}, ones one
 * counterpart has another way to do in {@link PORT_EXPORT_EXEMPT}, and ones still being ported in
 * {@link EXPORT_PARITY_PENDING}, which may only shrink.
 *
 * @param root - The molecule repository root.
 * @param [ledgers] - The exemptions: `exportExempt` defaults to {@link EXPORT_EXEMPT} and
 *   `portExportExempt` to {@link PORT_EXPORT_EXEMPT}. Each entry must name a package the tree
 *   measures, so a fixture tree that holds none of them passes its own.
 * @returns One line per violation.
 */
export function exportParityViolations(
  root = ROOT,
  { exportExempt = EXPORT_EXEMPT, portExportExempt = PORT_EXPORT_EXEMPT } = {},
) {
  const out = []
  const ledgerFile = join(root, EXPORT_PARITY_PENDING)
  let ledger = {}
  if (existsSync(ledgerFile)) {
    try {
      ledger = readJson(ledgerFile)
    } catch (error) {
      return [`${EXPORT_PARITY_PENDING}: not valid JSON (${error.message})`]
    }
  }
  const groups = titleParityPairs(root)
    .map(({ react, ports }) => ({
      react,
      ports: ports.filter((p) => entrySource(root, p, '.')),
    }))
    .filter(({ react, ports }) => ports.length && entrySource(root, react, '.'))
  const measured = new Set(groups.flatMap((g) => g.ports.map((p) => p.pkg.name)))
  for (const name of Object.keys(ledger))
    if (!measured.has(name))
      out.push(
        `${EXPORT_PARITY_PENDING}: ${name} is not a counterpart measured against a React package; remove it`,
      )
  for (const name of Object.keys(portExportExempt))
    if (!measured.has(name))
      out.push(
        `PORT_EXPORT_EXEMPT names ${name}, which is not a counterpart measured against a React package; remove it`,
      )
  for (const name of Object.keys(exportExempt))
    if (!groups.some((g) => g.react.pkg.name === name))
      out.push(
        `EXPORT_EXEMPT names ${name}, which is not a React package with counterparts; remove it`,
      )

  // Every entry of every package, type-checked in one program.
  const files = new Set()
  for (const { react, ports } of groups)
    for (const p of [react, ...ports])
      for (const key of ['.', ...subpathKeys(p.pkg)]) {
        const file = entrySource(root, p, key)
        if (file) files.add(file)
      }
  const list = [...files]
  const exportsOfFile = new Map(
    moduleExports(list, { resolve: moleculeSourceResolver(root) }).map((m, i) => [list[i], m]),
  )
  const exportsOf = (p, key) => {
    const file = entrySource(root, p, key)
    return file ? exportsOfFile.get(file) : undefined
  }

  for (const { react, ports } of groups) {
    const reactName = react.pkg.name
    const reactKeys = ['.', ...subpathKeys(react.pkg)]
    const reactExempt = exportExempt[reactName] ?? {}
    const reactAll = new Set(reactKeys.flatMap((k) => [k, ...(exportsOf(react, k)?.keys() ?? [])]))
    // `Name (kind)` exempts one kind of a name React exports as both (a value and a type).
    const reactKinds = new Map(reactKeys.flatMap((k) => [...(exportsOf(react, k) ?? [])]))
    for (const name of Object.keys(reactExempt))
      if (
        !reactAll.has(name) &&
        !(
          /^(\S+) \((value|type)\)$/.test(name) &&
          reactKinds.get(name.split(' ')[0])?.has(name.split(' ')[1].slice(1, -1))
        )
      )
        out.push(
          `${react.dir}: EXPORT_EXEMPT names ${name}, which it does not export; remove the entry`,
        )
    for (const port of ports) {
      const framework = portFramework(port.pkg.name)
      const portKeys = new Set(['.', ...subpathKeys(port.pkg)])
      // Every gap, by React name, before the exemptions and the ledger are applied.
      const gaps = new Map()
      const gap = (name, message) => gaps.set(name, [...(gaps.get(name) ?? []), message])
      for (const key of reactKeys) {
        if (key in reactExempt) continue
        if (key !== '.' && !portKeys.has(key)) {
          gap(
            key,
            `${port.dir}: package.json "exports" has no "${key}", which ${reactName} has; add that subpath`,
          )
          continue
        }
        const reactExports = exportsOf(react, key)
        const portExports = exportsOf(port, key)
        if (!reactExports || !portExports) continue
        const where = key === '.' ? '' : ` from "${key}"`
        for (const [name, kinds] of reactExports) {
          if (name in reactExempt) continue
          const match = counterpartNames(name, framework).find((c) => portExports.has(c))
          if (!match) {
            gap(
              name,
              `${port.dir}: does not export ${name}${where}, which ${reactName} exports; export it under the same name (an app swaps the package for its counterpart)`,
            )
            continue
          }
          const theirs = portExports.get(match)
          const owed = !kinds ? [] : kinds.has('class') ? ['value'] : [...kinds]
          if (theirs)
            for (const kind of owed)
              if (!theirs.has(kind) && !(`${name} (${kind})` in reactExempt))
                gap(
                  name,
                  `${port.dir}: exports ${match}${where} only as a ${[...theirs].filter((k) => k !== 'class').join(' and ')}, but ${reactName} exports ${name} as a ${kind}; export the ${kind} under that name`,
                )
        }
      }
      const exempt = portExportExempt[port.pkg.name] ?? {}
      const pending = new Set(Array.isArray(ledger[port.pkg.name]) ? ledger[port.pkg.name] : [])
      for (const [name, messages] of gaps)
        if (!(name in exempt) && !pending.has(name)) out.push(...messages)
      const portRoot = exportsOf(port, '.')
      for (const [name, entry] of Object.entries(exempt)) {
        if (!reactAll.has(name) || name in reactExempt)
          out.push(
            `${port.dir}: PORT_EXPORT_EXEMPT names ${name}, which ${reactName} ${name in reactExempt ? 'lists in EXPORT_EXEMPT' : 'does not export'}; remove the entry`,
          )
        else if (!gaps.has(name))
          out.push(
            `${port.dir}: PORT_EXPORT_EXEMPT names ${name}, which it now exports; remove the entry`,
          )
        for (const use of entry.use ?? [])
          if (!portRoot?.has(use))
            out.push(
              `${port.dir}: PORT_EXPORT_EXEMPT names ${use} as the counterpart of ${name}, but it does not export ${use}`,
            )
      }
      for (const name of pending) {
        const needNot = !reactAll.has(name) || name in reactExempt || name in exempt
        if (needNot || !gaps.has(name))
          out.push(
            `${EXPORT_PARITY_PENDING}: ${port.pkg.name} ${needNot ? 'need not export' : 'now exports'} ${name}; remove it from the ledger`,
          )
      }
    }
  }
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
  return [FEATURE_PARITY_PENDING, TITLE_PARITY_PENDING, EXPORT_PARITY_PENDING, ...gaps].filter(
    (path) => existsSync(join(root, path)),
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
    'framework-conformance: every UI bond, framework binding, feature bond, routing bond and markdown provider runs the conformance kit, every React package has its framework counterparts (or a pending-ledger entry), every counterpart declares its React package’s test titles (or a pending-ledger entry), and every test that mocks a framework binding keeps its real exports',
  )
}
