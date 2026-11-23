/**
 * `runFeatureConformance(reactPackage, adapter, { module })`: registers the
 * conformance suite of one feature package against its React reference.
 *
 * Every `@molecule/app-<feature>-{vue,solid,svelte,angular}` package calls
 * this from its own `src/__tests__/conformance.test.ts`, with an adapter over
 * its UI package and its own exports and the React package's cases
 * (`@molecule/app-framework-conformance/features/cases/<feature>`), so a change
 * to the package, the cases or the goldens re-runs its conformance in CI.
 *
 * Each React feature package has one cases file (`cases/<feature>.ts`) and one
 * goldens file (`goldens/<feature>.json`) or directory (`goldens/<feature>/`), so
 * recording or editing one feature never rewrites another's.
 *
 * @module
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { describe, expect, it } from 'vitest'

import { getProvider as getI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'

import { registerHookFamilies } from '../bindings/run.js'
import { buildBindingServices } from '../bindings/services.js'
import type { BindingAdapter, BindingContext } from '../bindings/spec.js'
import { assertConformanceRunBuilt } from '../build-freshness.js'
import { withChildSteps } from '../ui/children-step.js'
import { installRandomSources } from '../ui/globals.js'
import { installDomGaps } from '../ui/page.js'
import {
  goldensCachePath,
  onlyFromEnv,
  runCaseSuite,
  type UIKnownGaps,
  withKeyedLists,
  withLocaleSwitch,
} from '../ui/run.js'
import type { AppComposition, FrameworkAdapter } from '../ui/spec.js'
import type { FeatureCases, FeatureGoldens, FeatureValueCheck } from './spec.js'

const here = dirname(fileURLToPath(import.meta.url))

/**
 * One feature's cases as every runner sees them: families and hooks sorted, each
 * family with its derived cases (the pseudo-locale switch, keyed-list reorders, and while
 * `CONFORMANCE_CHILDREN_STEP=1` children changes).
 *
 * @param feature - The cases as written in `cases/<feature>.ts`.
 * @returns The cases the recorder and every framework run.
 */
export function featureCaseSet(feature: FeatureCases): FeatureCases {
  return {
    ...feature,
    families: [...feature.families]
      .sort((a, b) => a.component.localeCompare(b.component))
      .map(withLocaleSwitch)
      .map(withKeyedLists)
      .map(withChildSteps),
    ...(feature.hooks
      ? { hooks: [...feature.hooks].sort((a, b) => a.hook.localeCompare(b.hook)) }
      : {}),
  }
}

/**
 * The cases file of a React feature package: `@molecule/app-tag-input-react` →
 * `tag-input` (`src/features/cases/tag-input.ts`, exported as
 * `@molecule/app-framework-conformance/features/cases/tag-input`). A React package
 * named without a framework suffix (`@molecule/app-embeddable-chat-widget`) keeps its
 * whole name (`embeddable-chat-widget`); its counterparts are `<name>-vue`, ….
 *
 * @param reactPackage - The React feature package.
 * @returns The file's base name.
 */
export function featureCasesName(reactPackage: string): string {
  const match = /^@molecule\/app-(.+?)(-react)?$/.exec(reactPackage)
  if (!match || /-(vue|solid|svelte|angular)$/.test(match[1]!))
    throw new Error(
      `framework-conformance: ${reactPackage} is not a React feature package (@molecule/app-<name>-react or @molecule/app-<name>)`,
    )
  return match[1]!
}

/** One goldens file per React feature package, so recording one never rewrites another's. */
export const FEATURE_GOLDENS_DIR = join(here, 'goldens')

/**
 * The committed goldens file of a React feature package.
 *
 * @param reactPackage - The React feature package.
 * @returns `src/features/goldens/<feature>.json`.
 */
export const featureGoldensFile = (reactPackage: string): string =>
  join(FEATURE_GOLDENS_DIR, `${featureCasesName(reactPackage)}.json`)

/**
 * The goldens directory of a feature stored per component
 * ({@link FeatureCases.goldensPerComponent}): `index.json` holds the exports, values and
 * hooks, and `<Component>.json` each component's case results.
 *
 * @param reactPackage - The React feature package.
 * @returns `src/features/goldens/<feature>/`.
 */
export const featureGoldensDir = (reactPackage: string): string =>
  join(FEATURE_GOLDENS_DIR, featureCasesName(reactPackage))

/** The file of a per-component goldens directory that holds everything but the component cases. */
export const FEATURE_GOLDENS_INDEX = 'index.json'

/**
 * How a recording stores one feature's goldens.
 */
export interface FeatureGoldensForm {
  /** One file per component (the feature's {@link FeatureCases.goldensPerComponent}). */
  perComponent: boolean
  /** The components the run was narrowed to, or null for all. */
  components: string[] | null
  /**
   * Component → case name → the case's goldens group, for each component whose cases
   * name one ({@link featureGoldensGroups}): its results are stored one file per group.
   */
  groups?: Record<string, Record<string, string>>
}

/** A goldens group's name is a file name. */
const GROUP_NAME = /^[\w-]+$/

/**
 * The goldens groups of a feature's components (each case's `goldensGroup`): for each
 * component whose cases name one, each case's group.
 *
 * @param feature - The feature's cases as every runner sees them ({@link featureCaseSet}).
 * @returns Component → case name → group.
 * @throws {Error} When some but not all of a component's cases name a group, a group is not a
 *   file name, or the feature is not stored per component.
 */
export function featureGoldensGroups(
  feature: FeatureCases,
): Record<string, Record<string, string>> {
  const groups: Record<string, Record<string, string>> = {}
  for (const family of feature.families) {
    if (family.cases.every((c) => c.goldensGroup === undefined)) continue
    const unnamed = family.cases.find((c) => c.goldensGroup === undefined)
    if (unnamed)
      throw new Error(
        `framework-conformance: ${feature.package} ${family.component} "${unnamed.name}" names no goldensGroup, but other cases of the component do; name one for every case or for none`,
      )
    if (!feature.goldensPerComponent)
      throw new Error(
        `framework-conformance: ${feature.package} ${family.component} names goldens groups, which need goldensPerComponent`,
      )
    const bad = family.cases.find((c) => !GROUP_NAME.test(c.goldensGroup!))
    if (bad)
      throw new Error(
        `framework-conformance: ${feature.package} ${family.component} "${bad.name}": goldensGroup "${bad.goldensGroup}" must be letters, digits, - and _ only (it names a file)`,
      )
    groups[family.component] = Object.fromEntries(
      family.cases.map((c) => [c.name, c.goldensGroup!]),
    )
  }
  return groups
}

/**
 * Reads goldens stored either as one file or per component in a directory, where a
 * component stored per group is a directory of group files.
 *
 * @param file - The one-file form.
 * @param dir - The per-component form.
 * @returns The goldens, or null when neither exists.
 */
export function readFeatureGoldensAt(file: string, dir: string): FeatureGoldens | null {
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as FeatureGoldens
  const index = join(dir, FEATURE_GOLDENS_INDEX)
  if (!existsSync(index)) return null
  const goldens = JSON.parse(readFileSync(index, 'utf8')) as Omit<FeatureGoldens, 'cases'>
  const cases: FeatureGoldens['cases'] = {}
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== FEATURE_GOLDENS_INDEX)
      cases[entry.name.slice(0, -'.json'.length)] = JSON.parse(
        readFileSync(join(dir, entry.name), 'utf8'),
      )
    else if (entry.isDirectory()) {
      const results: FeatureGoldens['cases'][string] = {}
      for (const group of readdirSync(join(dir, entry.name)).sort())
        if (group.endsWith('.json'))
          Object.assign(results, JSON.parse(readFileSync(join(dir, entry.name, group), 'utf8')))
      cases[entry.name] = results
    }
  }
  return { ...goldens, cases }
}

/**
 * Writes goldens in one file, or per component when the feature asks for it, and a
 * component whose cases name goldens groups as one file per group. A run narrowed to some
 * components writes only theirs and leaves every other file as it is.
 *
 * @param file - The one-file form.
 * @param dir - The per-component form.
 * @param goldens - What the run recorded.
 * @param options - The form ({@link FeatureGoldensForm}) and the JSON indent.
 * @throws {Error} When a narrowed run would rewrite the one file, or a recorded case of a
 *   grouped component has no group.
 */
export function writeFeatureGoldensAt(
  file: string,
  dir: string,
  goldens: FeatureGoldens,
  options: FeatureGoldensForm & { indent?: number },
): void {
  const json = (value: unknown): string => `${JSON.stringify(value, null, options.indent)}\n`
  if (!options.perComponent) {
    if (options.components)
      throw new Error(
        'framework-conformance: a recording narrowed to components rewrites the one goldens file without the others; record the whole feature, or store it per component (goldensPerComponent)',
      )
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, json(goldens))
    // The other form, left by an earlier recording, would be read in place of this one.
    rmSync(dir, { recursive: true, force: true })
    return
  }
  rmSync(file, { force: true })
  mkdirSync(dir, { recursive: true })
  const { cases, ...rest } = goldens
  if (!options.components) {
    writeFileSync(join(dir, FEATURE_GOLDENS_INDEX), json(rest))
    // A component no family renders any more leaves no file or directory behind.
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const component = entry.isDirectory() ? entry.name : entry.name.slice(0, -'.json'.length)
      const stored =
        entry.isDirectory() ||
        (entry.name.endsWith('.json') && entry.name !== FEATURE_GOLDENS_INDEX)
      if (stored && !(component in cases))
        rmSync(join(dir, entry.name), { recursive: true, force: true })
    }
  }
  for (const [component, results] of Object.entries(cases)) {
    if (options.components && !options.components.includes(component)) continue
    const one = join(dir, `${component}.json`)
    const grouped = join(dir, component)
    const groupOf = options.groups?.[component]
    if (!groupOf) {
      // The other form of this component, left by an earlier recording, would be read too.
      rmSync(grouped, { recursive: true, force: true })
      writeFileSync(one, json(results))
      continue
    }
    const byGroup: Record<string, FeatureGoldens['cases'][string]> = {}
    for (const [name, result] of Object.entries(results)) {
      const group = groupOf[name]
      if (group === undefined)
        throw new Error(
          `framework-conformance: ${component} stores its goldens per group, but its recorded case "${name}" has none`,
        )
      ;(byGroup[group] ??= {})[name] = result
    }
    rmSync(one, { force: true })
    mkdirSync(grouped, { recursive: true })
    // A group no case names any more leaves no file behind.
    for (const name of readdirSync(grouped))
      if (name.endsWith('.json') && !(name.slice(0, -'.json'.length) in byGroup))
        rmSync(join(grouped, name))
    for (const [group, groupResults] of Object.entries(byGroup))
      writeFileSync(join(grouped, `${group}.json`), json(groupResults))
  }
}

/**
 * The React reference results of one feature package.
 *
 * @param reactPackage - The React feature package.
 * @returns Its goldens, or null before they are recorded.
 */
export function loadFeatureGoldens(reactPackage: string): FeatureGoldens | null {
  return readFeatureGoldensAt(featureGoldensFile(reactPackage), featureGoldensDir(reactPackage))
}

/**
 * Writes one feature package's committed goldens (the React recorder).
 *
 * @param reactPackage - The React feature package.
 * @param goldens - What the run recorded.
 * @param options - Whether the feature stores goldens per component, and the components a
 *   narrowed run recorded (null for all).
 */
export function writeFeatureGoldens(
  reactPackage: string,
  goldens: FeatureGoldens,
  options: FeatureGoldensForm,
): void {
  writeFeatureGoldensAt(
    featureGoldensFile(reactPackage),
    featureGoldensDir(reactPackage),
    goldens,
    {
      ...options,
      indent: 1,
    },
  )
}

/**
 * Where the feature recorder writes one package's goldens with real class names (never committed).
 *
 * @param reactPackage - The React feature package.
 * @returns A path under the kit's `node_modules/.cache`.
 */
export const featureReadableGoldensFile = (reactPackage: string): string =>
  goldensCachePath(join('features', `${featureCasesName(reactPackage)}.readable.json`))

/**
 * The readable copy's per-component directory (never committed).
 *
 * @param reactPackage - The React feature package.
 * @returns A path under the kit's `node_modules/.cache`.
 */
const featureReadableGoldensDir = (reactPackage: string): string =>
  goldensCachePath(join('features', `${featureCasesName(reactPackage)}.readable`))

/**
 * Reads one feature package's readable goldens (real class names), in either form.
 *
 * @param reactPackage - The React feature package.
 * @returns The readable goldens, or null before a recording on this machine.
 */
export function loadFeatureReadableGoldens(reactPackage: string): FeatureGoldens | null {
  try {
    return readFeatureGoldensAt(
      featureReadableGoldensFile(reactPackage),
      featureReadableGoldensDir(reactPackage),
    )
  } catch (error) {
    throw new Error(
      `framework-conformance: the readable goldens of ${reactPackage} are not valid JSON; delete ${featureReadableGoldensFile(reactPackage)} and ${featureReadableGoldensDir(reactPackage)}`,
      { cause: error },
    )
  }
}

/**
 * Writes one feature package's readable goldens, in the same form as its committed ones.
 *
 * @param reactPackage - The React feature package.
 * @param goldens - The readable results.
 * @param options - As for {@link writeFeatureGoldens}.
 */
export function writeFeatureReadableGoldens(
  reactPackage: string,
  goldens: FeatureGoldens,
  options: FeatureGoldensForm,
): void {
  writeFeatureGoldensAt(
    featureReadableGoldensFile(reactPackage),
    featureReadableGoldensDir(reactPackage),
    goldens,
    options,
  )
}

/**
 * The comparable value of one export: a constant as plain data, or each call's result.
 *
 * @param check - The export and its calls.
 * @param value - The export's runtime value.
 * @returns Plain data.
 */
export function featureValue(check: FeatureValueCheck, value: unknown): unknown {
  const plain = (v: unknown): unknown => (v === undefined ? null : JSON.parse(JSON.stringify(v)))
  if (!check.calls) return plain(value)
  if (typeof value !== 'function') throw new Error(`${check.export} is not a function`)
  // Each check starts from the same random state wherever it runs (before React's cases in
  // the recording, after a port's own), so a minted id depends only on the calls before it.
  const sources = installRandomSources()
  // The page a UI case mounts on, so a value that probes the DOM sees the same one.
  installDomGaps()
  try {
    return check.calls.map((args) => plain((value as (...a: unknown[]) => unknown)(...args)))
  } finally {
    sources.restore()
  }
}

/**
 * The full composition a feature with `composition: 'app'` mounts with: the
 * binding kit's services (scripted HTTP, storage, device, push, …), seeded from
 * the case context, with the UI kit's i18n provider kept so translated text
 * and the pseudo-locale switch behave as in every other UI case.
 */
export const featureAppComposition: AppComposition = {
  services: (testCase, record) => {
    const i18n = getI18nProvider()
    // A feature case's context is a BindingContext (FeatureCase).
    const harness = buildBindingServices((testCase.context ?? {}) as BindingContext, record)
    // buildBindingServices bonds its own i18n provider; the UI kit's stays in charge.
    setI18nProvider(i18n)
    return {
      services: { ...harness.services, i18n },
      controls: {
        answerHttp: harness.controls.answerHttp,
        setAuth: harness.controls.setAuth,
        control: harness.controls.control,
      },
      dispose: async () => {
        await harness.controls.dispose()
        setI18nProvider(i18n)
      },
    }
  },
}

/** Options for {@link runFeatureConformance}. */
export interface FeatureConformanceOptions {
  /** The feature package's own module (`import * as Feature from '../index.js'`), for the value checks. */
  module: Record<string, unknown>
  /**
   * The React package's cases, imported from
   * `@molecule/app-framework-conformance/features/cases/<feature>`.
   */
  cases: FeatureCases
  /** Cases this package does not match yet; `'(export)'` under a name means it is not exported. */
  knownGaps?: UIKnownGaps
  /**
   * An adapter over the framework binding plus this package's exports
   * (`create<Fw>BindingAdapter({ exports: { ...Binding, ...Feature }, binding })`),
   * for a package whose React reference has hook cases ({@link FeatureCases.hooks}).
   */
  bindingAdapter?: BindingAdapter
  /**
   * The framework-neutral packages the feature re-exports from, by name
   * (`{ '@molecule/app-push': AppPush }`): one entry per package
   * {@link FeatureCases.shared} names.
   */
  sharedModules?: Record<string, Record<string, unknown>>
  /**
   * The package's own parts module (`import * as Parts from '../parts.js'`), for a
   * feature whose cases render unexported components ({@link FeatureCases.parts}).
   * The same module goes into the adapter's exports.
   */
  parts?: Record<string, unknown>
}

/**
 * The built parts module of an installed React feature package (`dist/parts.js`), as a
 * URL to import. Its package's `exports` do not expose it, so it is found on disk:
 * the nearest `node_modules/<package>` above the kit, resolved through its symlink.
 *
 * @param reactPackage - The React feature package.
 * @returns The module's file URL.
 */
export function reactPartsUrl(reactPackage: string): string {
  for (let dir = here; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', reactPackage)
    if (existsSync(join(candidate, 'package.json'))) {
      const file = join(realpathSync(candidate), 'dist', 'parts.js')
      if (!existsSync(file))
        throw new Error(`framework-conformance: ${file} is missing; build ${reactPackage}`)
      return pathToFileURL(file).href
    }
    if (dirname(dir) === dir)
      throw new Error(`framework-conformance: ${reactPackage} is not installed`)
  }
}

/**
 * The parts a port's run checks. A run narrowed to some components
 * (`CONFORMANCE_COMPONENTS`) renders only their cases, so it checks only the parts among
 * them: the parts that other workers have not ported yet are not that run's.
 *
 * @param feature - The feature's cases.
 * @param filter - The components the run is narrowed to, or `null` for all of them.
 * @returns The listed parts the run checks.
 */
export function partsToCheck(feature: FeatureCases, filter: readonly string[] | null): string[] {
  return (feature.parts ?? []).filter((part) => !filter || filter.includes(part))
}

/**
 * Checks a feature's parts: each listed part exists in the parts module, is not
 * also a public export (then it is an ordinary family), and is rendered by a case.
 *
 * @param feature - The feature's cases.
 * @param parts - The package's parts module (`dist/parts.js` or `src/parts.ts`), if any.
 * @param exportNames - The package's public runtime exports.
 * @returns One problem per part that breaks a rule.
 */
export function featurePartProblems(
  feature: FeatureCases,
  parts: Record<string, unknown> | undefined,
  exportNames: readonly string[],
): string[] {
  const listed = feature.parts ?? []
  if (listed.length === 0) return []
  if (!parts)
    return [`the cases list parts (${listed.join(', ')}); pass the package's parts module`]
  const rendered = new Set(feature.families.map((family) => family.component))
  const problems: string[] = []
  for (const name of listed) {
    if (!(name in parts)) problems.push(`${name}: the parts module does not export it`)
    if (exportNames.includes(name))
      problems.push(`${name}: a public export; give it an ordinary family instead of a part`)
    if (!rendered.has(name)) problems.push(`${name}: no family renders it`)
  }
  return problems
}

/**
 * Checks that a module re-exports each shared export from its framework-neutral
 * package: the same value, not a copy.
 *
 * @param shared - Export name → the package that owns it.
 * @param module - The feature package's module.
 * @param sharedModules - The owning packages' modules, by name.
 * @returns One problem per export that is missing, not the same value, or whose package was not passed.
 */
export function sharedExportProblems(
  shared: Record<string, string>,
  module: Record<string, unknown>,
  sharedModules: Record<string, Record<string, unknown>>,
): string[] {
  const problems: string[] = []
  for (const [name, owner] of Object.entries(shared)) {
    const source = sharedModules[owner]
    if (!source) problems.push(`${name}: pass ${owner} in sharedModules`)
    else if (!(name in source)) problems.push(`${name}: ${owner} does not export it`)
    else if (!(name in module)) problems.push(`${name}: not exported`)
    else if (module[name] !== source[name])
      problems.push(`${name}: not the ${owner} export (re-export it, do not copy it)`)
  }
  return problems
}

/**
 * Registers one feature package's conformance suite.
 *
 * `CONFORMANCE_COMPONENTS=AppHeader` narrows a local run (component and hook names).
 *
 * @param reactPackage - The React reference (`@molecule/app-header-react`).
 * @param adapter - An adapter over the framework's UI package plus this package's exports.
 * @param options - The package module, its React package's cases and known gaps.
 */
export function runFeatureConformance(
  reactPackage: string,
  adapter: FrameworkAdapter,
  options: FeatureConformanceOptions,
): void {
  if (options.cases.package !== reactPackage)
    throw new Error(
      `framework-conformance: the cases passed for ${reactPackage} are ${options.cases.package}'s`,
    )
  assertConformanceRunBuilt(adapter.name, expect.getState().testPath)
  const feature = featureCaseSet(options.cases)
  const goldens = loadFeatureGoldens(reactPackage)
  if (!goldens)
    throw new Error(
      `framework-conformance: no goldens for ${reactPackage}; record them: CONFORMANCE_FEATURE=${reactPackage} RECORD_GOLDENS=1 npx vitest run src/__tests__/features-goldens.test.ts in packages/app/frameworks/conformance`,
    )
  const gaps = options.knownGaps ?? {}
  const filter = onlyFromEnv('CONFORMANCE_COMPONENTS')
  const readable = loadFeatureReadableGoldens(reactPackage)
  runCaseSuite(
    {
      title: `${adapter.name} ${reactPackage} conformance`,
      reference: reactPackage,
      exports: goldens.exports,
      parts: feature.parts ?? [],
      families: feature.families.filter((f) => !filter || filter.includes(f.component)),
      goldens: goldens.cases,
      readable: readable?.cases ?? null,
      narrowed: filter !== null,
      ...(feature.composition === 'app' ? { app: featureAppComposition } : {}),
    },
    adapter,
    gaps,
  )
  const checkedParts = partsToCheck(feature, filter)
  if (checkedParts.length > 0) {
    describe(`${adapter.name} ${reactPackage} parts`, () => {
      it('passes its parts module, holding every part the cases render', () => {
        expect(
          featurePartProblems({ ...feature, parts: checkedParts }, options.parts, goldens.exports),
        ).toEqual([])
        for (const part of checkedParts)
          expect(adapter.has(part), `${adapter.name} adapter has the part ${part}`).toBe(true)
      })
    })
  }
  const hooks = (feature.hooks ?? []).filter((f) => !filter || filter.includes(f.hook))
  if (hooks.length > 0) {
    const bindingAdapter = options.bindingAdapter
    if (!bindingAdapter)
      throw new Error(
        `framework-conformance: ${reactPackage} has hook cases; pass bindingAdapter (create<Fw>BindingAdapter over the binding plus this package)`,
      )
    describe(`${bindingAdapter.name} ${reactPackage} hooks`, () => {
      registerHookFamilies(bindingAdapter, hooks, goldens.hooks ?? {}, gaps)
    })
  }
  if (feature.shared && Object.keys(feature.shared).length > 0) {
    const shared = feature.shared
    describe.skipIf(filter !== null)(`${adapter.name} ${reactPackage} shared exports`, () => {
      it('re-exports each framework-neutral export from its package', () => {
        expect(sharedExportProblems(shared, options.module, options.sharedModules ?? {})).toEqual(
          [],
        )
      })
    })
  }
  // A feature with no value checks registers NO suite: like the hooks and
  // shared suites above, an empty `describe` is itself a vitest failure
  // ("No test found in suite").
  if ((feature.values ?? []).length > 0) {
    describe.skipIf(filter !== null)(`${adapter.name} ${reactPackage} values`, () => {
      for (const check of feature.values ?? []) {
        const gap = gaps[check.export]?.includes('(export)') ?? false
        ;(gap ? it.fails : it)(check.export, () => {
          expect(check.export in options.module, `exports ${check.export}`).toBe(true)
          expect(featureValue(check, options.module[check.export])).toEqual(
            goldens.values[check.export],
          )
        })
      }
    })
  }
}
