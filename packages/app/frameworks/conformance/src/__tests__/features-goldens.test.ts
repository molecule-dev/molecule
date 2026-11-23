/**
 * The React reference for feature packages: every feature case renders in its
 * React package without errors or warnings, every runtime export is covered
 * (rendered by a case, compared by value, or named as framework-shaped), and
 * the committed goldens equal what React renders today.
 *
 * `RECORD_GOLDENS=1 npx vitest run src/__tests__/features-goldens.test.ts`
 * rewrites each feature's `src/features/goldens/<feature>.json` (and a local,
 * never-committed readable copy with real class names). Recording changes the
 * contract: every framework's counterpart then has to match it.
 *
 * `CONFORMANCE_FEATURE=@molecule/app-tag-input-react[,…]` runs (and records)
 * only those packages: it loads only their cases files and writes only their
 * goldens files, so ports of different features can record side by side.
 *
 * @module
 */

import { existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import '../ui/setup.js'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as ReactBindings from '@molecule/app-react'
import * as ReactUI from '@molecule/app-ui-react'

import { type HookCaseResult, runHookCase } from '../bindings/index.js'
import { assertBuiltFromSource } from '../build-freshness.js'
import {
  FEATURE_GOLDENS_DIR,
  FEATURE_GOLDENS_INDEX,
  featureAppComposition,
  type FeatureCases,
  featureCaseSet,
  featureCasesName,
  type FeatureGoldens,
  featureGoldensFile,
  featureGoldensGroups,
  featurePartProblems,
  featureValue,
  loadFeatureGoldens,
  reactPartsUrl,
  sharedExportProblems,
  writeFeatureGoldens,
  writeFeatureGoldensAt,
  writeFeatureReadableGoldens,
} from '../features/index.js'
import { featureCaseFileNames, loadFeatureCases } from '../features/load.js'
import { watchConformanceEventLoop } from '../stall-watchdog-vitest.js'
import {
  assertNoLostStyleValues,
  caseExports,
  type CaseResult,
  onlyFromEnv,
  writePixelCapture,
} from '../ui/index.js'
import { createReactAdapter } from './react-adapter.js'
import { createReactBindingAdapter } from './react-bindings-adapter.js'
import { assertCompleteRecording, missingRecordings } from './recording.js'

// React is recorded here: a reference that stops yielding ends the run with its stack.
watchConformanceEventLoop()

const RECORD = process.env.RECORD_GOLDENS === '1'
/**
 * Where a recording goes instead of over the committed goldens: `<dir>/<feature>.json` (or a
 * `<feature>/` directory per component) and the readable copy beside it. For a case being written
 * while other recordings of the same feature run, or a recording to compare before keeping it.
 */
const OUT = process.env.CONFORMANCE_GOLDENS_OUT || null
/** The React packages this run is narrowed to, or null for every feature. */
const ONLY = onlyFromEnv('CONFORMANCE_FEATURE')
/**
 * The components this run is narrowed to (`CONFORMANCE_COMPONENTS=ChatPanel,…`), or null for all.
 * A narrowed run skips value and hook checks; a narrowed recording rewrites only those
 * components' goldens, so it needs a feature stored per component.
 */
const COMPONENTS = onlyFromEnv('CONFORMANCE_COMPONENTS')
/** Whether a component family runs in this run. */
const runsComponent = (component: string): boolean => !COMPONENTS || COMPONENTS.includes(component)
/**
 * The cases this run is narrowed to: those whose name matches `CONFORMANCE_CASES`, a regular
 * expression (a case derived from one, `… then a locale switch`, keeps its name as a prefix), or
 * null for all. Like `CONFORMANCE_COMPONENTS` it skips the value checks; a recording narrowed to
 * some cases goes to `CONFORMANCE_GOLDENS_OUT` only, since it holds none of the others.
 */
const CASES = process.env.CONFORMANCE_CASES ? new RegExp(process.env.CONFORMANCE_CASES) : null
/** Whether a case runs in this run. */
const runsCase = (testCase: { name: string }): boolean => !CASES || CASES.test(testCase.name)
/** Whether value checks run (a narrowed run checks only the cases it names). */
const NARROWED = COMPONENTS !== null || CASES !== null

/** The cases of each React feature package this run covers, by package. */
const featureCases: Record<string, FeatureCases> = Object.fromEntries(
  (
    await Promise.all(
      (ONLY ?? featureCaseFileNames()).map((name) =>
        loadFeatureCases(ONLY ? featureCasesName(name) : name),
      ),
    )
  )
    .sort((a, b) => a.package.localeCompare(b.package))
    .map((feature) => [feature.package, featureCaseSet(feature)]),
)

// A recording reads each package's dist/: refuse one older than its source.
assertBuiltFromSource(
  [
    ...Object.keys(featureCases),
    ...Object.values(featureCases).flatMap((f) => Object.values(f.shared ?? {})),
    '@molecule/app-react',
    '@molecule/app-ui-react',
  ],
  dirname(fileURLToPath(import.meta.url)),
)

/** Each React feature package, by name. */
const MODULES: Record<string, Record<string, unknown>> = Object.fromEntries(
  await Promise.all(Object.keys(featureCases).map(async (name) => [name, await import(name)])),
)

/** Each React feature package's parts module (`dist/parts.js`), for features whose cases list parts. */
const PARTS: Record<string, Record<string, unknown>> = Object.fromEntries(
  await Promise.all(
    Object.entries(featureCases)
      .filter(([, feature]) => (feature.parts ?? []).length > 0)
      .map(async ([name]) => [name, await import(reactPartsUrl(name))]),
  ),
)

/** The framework-neutral packages feature packages re-export from (each feature's `shared` field). */
const SHARED_MODULES: Record<string, Record<string, unknown>> = Object.fromEntries(
  await Promise.all(
    [...new Set(Object.values(featureCases).flatMap((f) => Object.values(f.shared ?? {})))].map(
      async (name) => [name, await import(name)],
    ),
  ),
)

if (RECORD && COMPONENTS)
  for (const [name, feature] of Object.entries(featureCases))
    if (!feature.goldensPerComponent)
      throw new Error(
        `framework-conformance: CONFORMANCE_COMPONENTS narrows a recording, which would rewrite ${name}'s one goldens file without its other components; record it whole, or set goldensPerComponent in its cases`,
      )

if (
  CASES &&
  !Object.values(featureCases).some((feature) =>
    [
      ...feature.families.filter((f) => runsComponent(f.component)),
      ...(COMPONENTS ? [] : (feature.hooks ?? [])),
    ].some((family) => family.cases.some(runsCase)),
  )
)
  throw new Error(
    `framework-conformance: CONFORMANCE_CASES (${CASES.source}) matches no case of this run`,
  )

if (RECORD && CASES && !OUT)
  throw new Error(
    'framework-conformance: CONFORMANCE_CASES narrows a recording to some cases, which would rewrite the goldens without the others; record to CONFORMANCE_GOLDENS_OUT',
  )

const recorded: Record<string, FeatureGoldens> = {}
const recordedReadable: Record<string, FeatureGoldens> = {}
const stale = (name: string) =>
  `goldens are stale: run CONFORMANCE_FEATURE=${name} RECORD_GOLDENS=1 npx vitest run src/__tests__/features-goldens.test.ts in packages/app/frameworks/conformance`

describe.skipIf(ONLY !== null)('feature goldens files', () => {
  // A feature's goldens are one `<feature>.json`, or a `<feature>/` directory per component.
  const goldenNames = () =>
    readdirSync(FEATURE_GOLDENS_DIR, { withFileTypes: true }).flatMap((entry) =>
      entry.isFile() && entry.name.endsWith('.json')
        ? [entry.name.slice(0, -'.json'.length)]
        : entry.isDirectory() &&
            existsSync(join(FEATURE_GOLDENS_DIR, entry.name, FEATURE_GOLDENS_INDEX))
          ? [entry.name]
          : [],
    )
  it('every goldens file has a cases file', () => {
    const cases = featureCaseFileNames()
    expect(goldenNames().filter((name) => !cases.includes(name))).toEqual([])
  })
  it.skipIf(RECORD)('every cases file has a goldens file', () => {
    const goldens = goldenNames()
    expect(featureCaseFileNames().filter((name) => !goldens.includes(name))).toEqual([])
  })
})

for (const [name, module] of Object.entries(MODULES)) {
  const feature = featureCases[name]!
  const goldens = RECORD ? null : loadFeatureGoldens(name)
  const exportNames = Object.keys(module).sort()
  const parts = PARTS[name]
  const adapter = createReactAdapter({
    ...(ReactUI as unknown as Record<string, unknown>),
    ...module,
    ...parts,
  })
  // The package's hook cases run like the binding kit's own: the binding plus the package.
  const bindingAdapter = createReactBindingAdapter({
    ...(ReactBindings as unknown as Record<string, unknown>),
    ...module,
  })
  recorded[name] = { exports: exportNames, values: {}, cases: {} }
  recordedReadable[name] = { exports: exportNames, values: {}, cases: {} }

  describe(name, () => {
    it('every runtime export is rendered, compared by value, or framework-shaped', () => {
      const covered = new Set<string>([
        ...(feature.values ?? []).map((v) => v.export),
        ...Object.keys(feature.frameworkShaped ?? {}),
        ...Object.keys(feature.shared ?? {}),
        ...(feature.hooks ?? []).filter((f) => f.cases.length > 0).map((f) => f.hook),
      ])
      for (const family of feature.families)
        for (const testCase of family.cases)
          for (const used of caseExports(family.component, testCase)) covered.add(used)
      expect(exportNames.filter((e) => !covered.has(e))).toEqual([])
      const partNames = feature.parts ?? []
      expect(
        [...covered].filter(
          (e) => !exportNames.includes(e) && !(e in ReactUI) && !partNames.includes(e),
        ),
      ).toEqual([])
    })

    it.skipIf((feature.parts ?? []).length === 0)(
      'every part is in its parts module, not a public export, and rendered by a case',
      () => {
        expect(featurePartProblems(feature, parts, exportNames)).toEqual([])
      },
    )

    it('re-exports each shared export from its framework-neutral package', () => {
      expect(sharedExportProblems(feature.shared ?? {}, module, SHARED_MODULES)).toEqual([])
    })

    it.skipIf(RECORD)('the committed goldens list the React exports', () => {
      expect(goldens?.exports, stale(name)).toEqual(exportNames)
    })

    for (const check of NARROWED ? [] : (feature.values ?? [])) {
      it(`value: ${check.export}`, () => {
        const value = featureValue(check, module[check.export])
        recorded[name]!.values[check.export] = value
        recordedReadable[name]!.values[check.export] = value
        if (!RECORD) expect(goldens?.values[check.export], stale(name)).toEqual(value)
      })
    }

    let errors: string[] = []
    beforeEach(() => {
      errors = []
      vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
        errors.push(args.map(String).join(' '))
      })
      vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
        errors.push(args.map(String).join(' '))
      })
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })

    for (const family of COMPONENTS ? [] : (feature.hooks ?? [])) {
      describe(`hook ${family.hook}`, () => {
        it('has unique case names', () => {
          const names = family.cases.map((c) => c.name)
          expect(new Set(names).size).toBe(names.length)
        })
        for (const testCase of family.cases.filter(runsCase)) {
          it(testCase.name, async () => {
            const result: HookCaseResult = await runHookCase(
              bindingAdapter,
              family.hook,
              testCase,
              undefined,
              family,
            )
            expect(errors, 'React logged errors or warnings').toEqual([])
            expect(result.snapshots.length).toBe((testCase.steps ?? []).length + 1)
            const golden = JSON.parse(JSON.stringify(result)) as HookCaseResult
            ;((recorded[name]!.hooks ??= {})[family.hook] ??= {})[testCase.name] = golden
            ;((recordedReadable[name]!.hooks ??= {})[family.hook] ??= {})[testCase.name] = golden
            if (!RECORD) {
              expect(goldens?.hooks?.[family.hook]?.[testCase.name], stale(name)).toEqual(golden)
            }
          })
        }
      })
    }

    for (const family of feature.families.filter((f) => runsComponent(f.component))) {
      describe(family.component, () => {
        it('has unique case names', () => {
          const names = family.cases.map((c) => c.name)
          expect(new Set(names).size).toBe(names.length)
        })
        for (const testCase of family.cases.filter(runsCase)) {
          it(testCase.name, async () => {
            const result = await adapter.run(
              family.component,
              testCase,
              feature.composition === 'app' ? { app: featureAppComposition } : undefined,
            )
            if (result.pages) {
              writePixelCapture('react', {
                reference: name,
                component: family.component,
                case: testCase.name,
                pages: result.pages,
              })
            }
            expect(errors, 'React logged errors or warnings').toEqual([])
            expect(result.snapshots.length).toBe((testCase.interactions ?? []).length + 1)
            assertNoLostStyleValues(
              result.snapshots,
              `${name} / ${family.component} / ${testCase.name}`,
            )
            const golden: CaseResult = { snapshots: result.snapshots, calls: result.calls }
            ;(recorded[name]!.cases[family.component] ??= {})[testCase.name] = golden
            ;(recordedReadable[name]!.cases[family.component] ??= {})[testCase.name] = {
              snapshots: result.readable ?? [],
              calls: result.calls,
            }
            if (!RECORD) {
              expect(goldens?.cases[family.component]?.[testCase.name], stale(name)).toEqual(golden)
            }
          })
        }
      })
    }
  })
}

afterAll(() => {
  if (!RECORD) return
  // Every feature is checked before any file is written, so an incomplete run writes nothing.
  for (const [name, feature] of Object.entries(featureCases)) {
    const expected: Record<string, string[]> = {}
    const got: Record<string, Record<string, unknown> | undefined> = {}
    if (!NARROWED) {
      expected.values = (feature.values ?? []).map((v) => v.export)
      got.values = recorded[name]?.values
    }
    for (const family of feature.families.filter((f) => runsComponent(f.component))) {
      expected[family.component] = family.cases.filter(runsCase).map((c) => c.name)
      got[family.component] = recorded[name]?.cases[family.component]
    }
    for (const family of COMPONENTS ? [] : (feature.hooks ?? [])) {
      expected[`hook ${family.hook}`] = family.cases.filter(runsCase).map((c) => c.name)
      got[`hook ${family.hook}`] = recorded[name]?.hooks?.[family.hook]
    }
    assertCompleteRecording(missingRecordings(expected, got), featureGoldensFile(name))
  }
  for (const [name, feature] of Object.entries(featureCases)) {
    // A package without hook cases records no `hooks` key.
    for (const golden of [recorded[name]!, recordedReadable[name]!])
      if (golden.hooks && Object.keys(golden.hooks).length === 0) delete golden.hooks
    const form = {
      perComponent: feature.goldensPerComponent === true,
      components: COMPONENTS,
      groups: featureGoldensGroups(feature),
    }
    if (OUT) {
      const base = join(OUT, featureCasesName(name))
      writeFeatureGoldensAt(`${base}.json`, base, recorded[name]!, { ...form, indent: 1 })
      writeFeatureGoldensAt(
        `${base}.readable.json`,
        `${base}.readable`,
        recordedReadable[name]!,
        form,
      )
      continue
    }
    writeFeatureGoldens(name, recorded[name]!, form)
    writeFeatureReadableGoldens(name, recordedReadable[name]!, form)
  }
})
