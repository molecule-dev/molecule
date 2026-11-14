/**
 * `runFeatureConformance(reactPackage, adapter, { module })`: registers the
 * conformance suite of one feature package against its React reference.
 *
 * Every `@molecule/app-<feature>-{vue,solid,svelte,angular}` package calls
 * this from its own `src/__tests__/conformance.test.ts`, with an adapter over
 * its UI package and its own exports, so a change to the package, the cases or
 * the goldens re-runs its conformance in CI.
 *
 * @module
 */

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
import * as allCases from './cases/index.js'
import goldensJson from './goldens.json' with { type: 'json' }
import type { FeatureCases, FeatureGoldens, FeatureValueCheck } from './spec.js'

/** Every feature package's cases, keyed by its React package, each family with its derived cases. */
export const featureCases: Record<string, FeatureCases> = Object.fromEntries(
  (Object.values(allCases) as FeatureCases[])
    .sort((a, b) => a.package.localeCompare(b.package))
    .map((feature) => [
      feature.package,
      {
        ...feature,
        families: [...feature.families]
          .sort((a, b) => a.component.localeCompare(b.component))
          .map(withLocaleSwitch)
          .map(withKeyedLists),
        ...(feature.hooks
          ? { hooks: [...feature.hooks].sort((a, b) => a.hook.localeCompare(b.hook)) }
          : {}),
      },
    ]),
)

/** The React reference results, keyed by React package. */
export const featureGoldens: Record<string, FeatureGoldens> = goldensJson as Record<
  string,
  FeatureGoldens
>

/** Where the feature recorder writes goldens with real class names (never committed). */
export const FEATURE_READABLE_GOLDENS = goldensCachePath('features.readable.json')

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
 * @param options - The package module and known gaps.
 */
export function runFeatureConformance(
  reactPackage: string,
  adapter: FrameworkAdapter,
  options: FeatureConformanceOptions,
): void {
  const feature = featureCases[reactPackage]
  const goldens = featureGoldens[reactPackage]
  if (!feature) throw new Error(`framework-conformance: no feature cases for ${reactPackage}`)
  if (!goldens)
    throw new Error(
      `framework-conformance: no goldens for ${reactPackage}; record them in @molecule/app-framework-conformance`,
    )
  const gaps = options.knownGaps ?? {}
  const filter = onlyFromEnv('CONFORMANCE_COMPONENTS')
  const readable =
    readGoldensCache<Record<string, FeatureGoldens>>(FEATURE_READABLE_GOLDENS)?.[reactPackage]
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
