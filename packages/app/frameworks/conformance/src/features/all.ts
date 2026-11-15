/**
 * Every React feature package's cases, read from `cases/*.ts`: for the React
 * recorder (`features-goldens.test.ts`) and the kit checks that look across all
 * features. A framework package's conformance test imports only its own cases
 * file (`@molecule/app-framework-conformance/features/cases/<feature>`), so it
 * never loads this module.
 *
 * There is no index of the cases files to keep in step: a new `cases/<feature>.ts`
 * is found from the directory, and each file must export exactly one
 * {@link FeatureCases} whose package is `@molecule/app-<feature>-react` (or, for a React
 * package named without a framework suffix, `@molecule/app-<feature>`).
 *
 * @module
 */

import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { featureCaseSet, featureCasesName } from './run.js'
import type { FeatureCases } from './spec.js'

/** Where each React feature package's cases file lives. */
export const FEATURE_CASES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'cases')

/**
 * The cases files, by base name (`tag-input` for `cases/tag-input.ts`).
 *
 * @returns Sorted base names.
 */
export function featureCaseFileNames(): string[] {
  return readdirSync(FEATURE_CASES_DIR)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => file.slice(0, -'.ts'.length))
    .sort()
}

/**
 * Whether a module export is a feature's cases.
 *
 * @param value - The export.
 * @returns True for an object with a `package` name and a `families` list.
 */
function isFeatureCases(value: unknown): value is FeatureCases {
  if (typeof value !== 'object' || value === null) return false
  return 'package' in value && typeof value.package === 'string' && 'families' in value
}

/**
 * Loads one cases file.
 *
 * @param name - The file's base name (`tag-input`).
 * @returns Its cases, as written (no derived cases).
 */
export async function loadFeatureCases(name: string): Promise<FeatureCases> {
  const module: Record<string, unknown> = await import(join(FEATURE_CASES_DIR, `${name}.ts`))
  const found = Object.values(module).filter(isFeatureCases)
  if (found.length !== 1)
    throw new Error(
      `framework-conformance: cases/${name}.ts must export exactly one FeatureCases (found ${found.length})`,
    )
  const cases = found[0]!
  if (featureCasesName(cases.package) !== name)
    throw new Error(
      `framework-conformance: cases/${name}.ts holds ${cases.package}'s cases; name the file ${featureCasesName(cases.package)}.ts`,
    )
  return cases
}

/** Every feature package's cases, keyed by its React package, each family with its derived cases. */
export const featureCases: Record<string, FeatureCases> = Object.fromEntries(
  (await Promise.all(featureCaseFileNames().map(loadFeatureCases)))
    .sort((a, b) => a.package.localeCompare(b.package))
    .map((feature) => [feature.package, featureCaseSet(feature)]),
)
