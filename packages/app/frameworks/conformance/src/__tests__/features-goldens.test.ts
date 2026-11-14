/**
 * The React reference for feature packages: every feature case renders in its
 * React package without errors or warnings, every runtime export is covered
 * (rendered by a case, compared by value, or named as framework-shaped), and
 * the committed goldens equal what React renders today.
 *
 * `RECORD_GOLDENS=1 npx vitest run src/__tests__/features-goldens.test.ts`
 * rewrites `src/features/goldens.json` (and a local, never-committed readable
 * copy with real class names). Recording changes the contract: every
 * framework's counterpart then has to match it.
 *
 * @module
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import '../ui/setup.js'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as AuthUi from '@molecule/app-auth-ui-react'
import * as Footer from '@molecule/app-footer-react'
import * as Header from '@molecule/app-header-react'
import * as OAuthButtons from '@molecule/app-oauth-buttons-react'
import * as OAuthLogos from '@molecule/app-oauth-logos-react'
import * as Push from '@molecule/app-push'
import * as Query from '@molecule/app-query'
import * as QueryReact from '@molecule/app-query-react'
import * as ReactBindings from '@molecule/app-react'
import * as SettingsPanel from '@molecule/app-settings-panel-react'
import * as ShellLayout from '@molecule/app-shell-layout-react'
import * as ReactUI from '@molecule/app-ui-react'

import { type HookCaseResult, runHookCase } from '../bindings/index.js'
import {
  FEATURE_READABLE_GOLDENS,
  featureAppComposition,
  featureCases,
  type FeatureGoldens,
  featureGoldens,
  featureValue,
  sharedExportProblems,
} from '../features/index.js'
import { caseExports, type CaseResult } from '../ui/index.js'
import { createReactAdapter } from './react-adapter.js'
import { createReactBindingAdapter } from './react-bindings-adapter.js'
import { assertCompleteRecording, missingRecordings } from './recording.js'

/** Each React feature package, by name. */
const MODULES: Record<string, Record<string, unknown>> = {
  '@molecule/app-auth-ui-react': AuthUi,
  '@molecule/app-footer-react': Footer,
  '@molecule/app-header-react': Header,
  '@molecule/app-oauth-buttons-react': OAuthButtons,
  '@molecule/app-oauth-logos-react': OAuthLogos,
  '@molecule/app-query-react': QueryReact,
  '@molecule/app-settings-panel-react': SettingsPanel,
  '@molecule/app-shell-layout-react': ShellLayout,
}

/** The framework-neutral packages feature packages re-export from (each feature's `shared` field). */
const SHARED_MODULES: Record<string, Record<string, unknown>> = {
  '@molecule/app-push': Push,
  '@molecule/app-query': Query,
}

const RECORD = process.env.RECORD_GOLDENS === '1'
const here = dirname(fileURLToPath(import.meta.url))
const GOLDENS_FILE = join(here, '..', 'features', 'goldens.json')
const recorded: Record<string, FeatureGoldens> = {}
const recordedReadable: Record<string, FeatureGoldens> = {}

describe('feature cases cover the React packages', () => {
  it('every React feature package with cases is imported here, and the other way round', () => {
    expect(Object.keys(featureCases).sort()).toEqual(Object.keys(MODULES).sort())
  })
})

for (const [name, module] of Object.entries(MODULES)) {
  const feature = featureCases[name]!
  const exportNames = Object.keys(module).sort()
  const adapter = createReactAdapter({
    ...(ReactUI as unknown as Record<string, unknown>),
    ...module,
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
      expect([...covered].filter((e) => !exportNames.includes(e) && !(e in ReactUI))).toEqual([])
    })

    it('re-exports each shared export from its framework-neutral package', () => {
      expect(sharedExportProblems(feature.shared ?? {}, module, SHARED_MODULES)).toEqual([])
    })

    it.skipIf(RECORD)('the committed goldens list the React exports', () => {
      expect(featureGoldens[name]?.exports).toEqual(exportNames)
    })

    for (const check of feature.values ?? []) {
      it(`value: ${check.export}`, () => {
        const value = featureValue(check, module[check.export])
        recorded[name]!.values[check.export] = value
        recordedReadable[name]!.values[check.export] = value
        if (!RECORD) expect(featureGoldens[name]?.values[check.export]).toEqual(value)
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

    for (const family of feature.hooks ?? []) {
      describe(`hook ${family.hook}`, () => {
        it('has unique case names', () => {
          const names = family.cases.map((c) => c.name)
          expect(new Set(names).size).toBe(names.length)
        })
        for (const testCase of family.cases) {
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
              expect(
                featureGoldens[name]?.hooks?.[family.hook]?.[testCase.name],
                'goldens are stale: run RECORD_GOLDENS=1 npx vitest run src/__tests__/features-goldens.test.ts in packages/app/frameworks/conformance',
              ).toEqual(golden)
            }
          })
        }
      })
    }

    for (const family of feature.families) {
      describe(family.component, () => {
        it('has unique case names', () => {
          const names = family.cases.map((c) => c.name)
          expect(new Set(names).size).toBe(names.length)
        })
        for (const testCase of family.cases) {
          it(testCase.name, async () => {
            const result = await adapter.run(
              family.component,
              testCase,
              feature.composition === 'app' ? { app: featureAppComposition } : undefined,
            )
            expect(errors, 'React logged errors or warnings').toEqual([])
            expect(result.snapshots.length).toBe((testCase.interactions ?? []).length + 1)
            const golden: CaseResult = { snapshots: result.snapshots, calls: result.calls }
            ;(recorded[name]!.cases[family.component] ??= {})[testCase.name] = golden
            ;(recordedReadable[name]!.cases[family.component] ??= {})[testCase.name] = {
              snapshots: result.readable ?? [],
              calls: result.calls,
            }
            if (!RECORD) {
              expect(
                featureGoldens[name]?.cases[family.component]?.[testCase.name],
                'goldens are stale: run RECORD_GOLDENS=1 npx vitest run src/__tests__/features-goldens.test.ts in packages/app/frameworks/conformance',
              ).toEqual(golden)
            }
          })
        }
      })
    }
  })
}

afterAll(() => {
  if (!RECORD) return
  const expected: Record<string, string[]> = {}
  const got: Record<string, Record<string, unknown> | undefined> = {}
  for (const [name, feature] of Object.entries(featureCases)) {
    expected[`${name} values`] = (feature.values ?? []).map((v) => v.export)
    got[`${name} values`] = recorded[name]?.values
    for (const family of feature.families) {
      expected[`${name} ${family.component}`] = family.cases.map((c) => c.name)
      got[`${name} ${family.component}`] = recorded[name]?.cases[family.component]
    }
    for (const family of feature.hooks ?? []) {
      expected[`${name} hook ${family.hook}`] = family.cases.map((c) => c.name)
      got[`${name} hook ${family.hook}`] = recorded[name]?.hooks?.[family.hook]
    }
  }
  assertCompleteRecording(missingRecordings(expected, got), GOLDENS_FILE)
  // A package without hook cases records no `hooks` key.
  for (const golden of [...Object.values(recorded), ...Object.values(recordedReadable)])
    if (golden.hooks && Object.keys(golden.hooks).length === 0) delete golden.hooks
  writeFileSync(GOLDENS_FILE, `${JSON.stringify(recorded, null, 1)}\n`)
  mkdirSync(dirname(FEATURE_READABLE_GOLDENS), { recursive: true })
  writeFileSync(FEATURE_READABLE_GOLDENS, JSON.stringify(recordedReadable))
})
