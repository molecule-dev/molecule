#!/usr/bin/env node
/**
 * Every swappable UI bond runs the framework conformance kit.
 *
 * WHY THIS GATE EXISTS: an app moves between frameworks (React → Vue, Solid,
 * Svelte, Angular) by swapping its framework bonds, so each `@molecule/app-ui-*`
 * framework package must export the same components as `@molecule/app-ui-react`
 * and render the same DOM. `@molecule/app-framework-conformance` holds that
 * contract (framework-neutral cases plus React's recorded results); each UI bond
 * proves it by running the kit from its own test suite. A bond that never calls
 * the kit is unchecked however far it drifts, and a NEW bond is unchecked from
 * the day it is created, so this gate finds every one from the tree.
 *
 * Rules, for every package under packages/app/frameworks/ named
 * `@molecule/app-ui-*`, except the exemptions below:
 * - `src/__tests__/conformance.test.ts` exists, imports
 *   `@molecule/app-framework-conformance/ui` and calls `runUIConformance(`;
 * - `src/__tests__/conformance/known-gaps.json` is a JSON object whose values
 *   are arrays of case names (the kit runs listed cases as expected failures,
 *   so the list can only shrink);
 * - `devDependencies` lists `@molecule/app-framework-conformance` (so a change
 *   to the kit, its cases or its goldens re-runs this package's suite in CI's
 *   affected-package scope).
 * - no `.svelte`, `.vue` or `.html` file under `src/` (tests excepted)
 *   carries a static `class="…"` attribute or a Svelte `class:name`
 *   directive: CSS class names come from the ClassMap (molecule AGENTS.md
 *   Rule 5). ESLint's `no-raw-class-names` covers `.ts`/`.tsx`; it does not
 *   parse component markup, so this gate does.
 * The kit itself must stay private, keep its goldens test, and depend on the
 * React reference so a React change re-checks the goldens.
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

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))

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
    if (!kit.pkg.devDependencies?.[REFERENCE] && !kit.pkg.dependencies?.[REFERENCE]) {
      out.push(`${kit.dir}: must depend on ${REFERENCE} so a React change re-checks the goldens`)
    }
    if (!existsSync(join(root, kit.dir, 'src', '__tests__', 'goldens.test.ts'))) {
      out.push(
        `${kit.dir}: src/__tests__/goldens.test.ts is missing (it keeps the goldens equal to React)`,
      )
    }
  }

  for (const { dir, pkg } of packages) {
    if (!pkg.name?.startsWith('@molecule/app-ui-') || EXEMPT[pkg.name]) continue
    const testFile = join(root, dir, 'src', '__tests__', 'conformance.test.ts')
    if (!existsSync(testFile)) {
      out.push(
        `${dir}: src/__tests__/conformance.test.ts is missing; it must call runUIConformance(adapter, { knownGaps })`,
      )
    } else {
      const text = readFileSync(testFile, 'utf8')
      if (!text.includes(`'${KIT}/ui'`))
        out.push(`${dir}: conformance.test.ts does not import '${KIT}/ui'`)
      if (!/\brunUIConformance\s*\(/.test(text))
        out.push(`${dir}: conformance.test.ts does not call runUIConformance(`)
    }
    const gapsFile = join(root, dir, 'src', '__tests__', 'conformance', 'known-gaps.json')
    if (!existsSync(gapsFile)) {
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
          Object.values(gaps).every(
            (v) => Array.isArray(v) && v.every((c) => typeof c === 'string'),
          )
        if (!valid)
          out.push(`${dir}: known-gaps.json must map component names to arrays of case names`)
      }
    }
    if (!pkg.devDependencies?.[KIT]) out.push(`${dir}: devDependencies must list ${KIT}`)
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
  console.log('framework-conformance: every UI bond runs the conformance kit')
}
