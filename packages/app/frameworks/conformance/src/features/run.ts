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
 * goldens file (`goldens/<feature>.json`), so recording or editing one feature
 * never rewrites another's.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { getProvider as getI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'

import { registerHookFamilies } from '../bindings/run.js'
import { buildBindingServices } from '../bindings/services.js'
import type { BindingAdapter, BindingContext } from '../bindings/spec.js'
import {
  goldensCachePath,
  onlyFromEnv,
  readGoldensCache,
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
 * family with its derived cases (the pseudo-locale switch, keyed-list reorders).
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
      .map(withKeyedLists),
    ...(feature.hooks
      ? { hooks: [...feature.hooks].sort((a, b) => a.hook.localeCompare(b.hook)) }
      : {}),
  }
}

/**
 * The cases file of a React feature package: `@molecule/app-tag-input-react` →
 * `tag-input` (`src/features/cases/tag-input.ts`, exported as
 * `@molecule/app-framework-conformance/features/cases/tag-input`).
 *
 * @param reactPackage - The React feature package.
 * @returns The file's base name.
 */
export function featureCasesName(reactPackage: string): string {
  const match = /^@molecule\/app-(.+)-react$/.exec(reactPackage)
  if (!match)
    throw new Error(`framework-conformance: ${reactPackage} is not an app-*-react package`)
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
 * The React reference results of one feature package.
 *
 * @param reactPackage - The React feature package.
 * @returns Its goldens, or null before they are recorded.
 */
export function loadFeatureGoldens(reactPackage: string): FeatureGoldens | null {
  const file = featureGoldensFile(reactPackage)
  if (!existsSync(file)) return null
  return JSON.parse(readFileSync(file, 'utf8')) as FeatureGoldens
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
  return check.calls.map((args) => plain((value as (...a: unknown[]) => unknown)(...args)))
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
      controls: { answerHttp: harness.controls.answerHttp, setAuth: harness.controls.setAuth },
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
  const feature = featureCaseSet(options.cases)
  const goldens = loadFeatureGoldens(reactPackage)
  if (!goldens)
    throw new Error(
      `framework-conformance: no goldens for ${reactPackage}; record them: CONFORMANCE_FEATURE=${reactPackage} RECORD_GOLDENS=1 npx vitest run src/__tests__/features-goldens.test.ts in packages/app/frameworks/conformance`,
    )
  const gaps = options.knownGaps ?? {}
  const filter = onlyFromEnv('CONFORMANCE_COMPONENTS')
  const readable = readGoldensCache<FeatureGoldens>(featureReadableGoldensFile(reactPackage))
  runCaseSuite(
    {
      title: `${adapter.name} ${reactPackage} conformance`,
      reference: reactPackage,
      exports: goldens.exports,
      families: feature.families.filter((f) => !filter || filter.includes(f.component)),
      goldens: goldens.cases,
      readable: readable?.cases ?? null,
      narrowed: filter !== null,
      ...(feature.composition === 'app' ? { app: featureAppComposition } : {}),
    },
    adapter,
    gaps,
  )
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
