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
 *   no known gaps: every bond passes every case.
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
 * on each React reference so a React change re-checks the goldens.
 *
 * @module
 */
import console from 'node:console'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

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
 * @returns One line per violation.
 */
function bondViolations(root, { dir, pkg }, group) {
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
    }
  }
  if (!pkg.devDependencies?.[KIT]) out.push(`${dir}: devDependencies must list ${KIT}`)
  return out
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
      if (!group.reference) continue
      if (!kit.pkg.devDependencies?.[group.reference] && !kit.pkg.dependencies?.[group.reference]) {
        out.push(
          `${kit.dir}: must depend on ${group.reference} so a React change re-checks the goldens`,
        )
      }
      if (!existsSync(join(root, kit.dir, 'src', '__tests__', group.goldensTest))) {
        out.push(
          `${kit.dir}: src/__tests__/${group.goldensTest} is missing (it keeps the goldens equal to React)`,
        )
      }
    }
  }

  for (const group of GROUPS) {
    for (const bond of group.packages(root)) {
      if (!bond.pkg.name || !group.member(bond.pkg.name) || group.exempt[bond.pkg.name]) continue
      out.push(...bondViolations(root, bond, group))
    }
  }

  for (const { dir, pkg } of packages) {
    if (pkg.name?.startsWith('@molecule/app-ui-')) out.push(...rawMarkupClasses(root, dir))
  }
  return out
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  const violations = findConformanceViolations()
  for (const v of violations) console.error(`framework-conformance: ${v}`)
  if (violations.length) process.exit(1)
  console.log(
    'framework-conformance: every UI bond, framework binding and routing bond runs the conformance kit',
  )
}
