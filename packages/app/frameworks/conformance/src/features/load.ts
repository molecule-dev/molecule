/**
 * Finds and loads React feature packages' cases files one at a time. Importing this module
 * loads no cases file, so a run narrowed to one feature (`CONFORMANCE_FEATURE`) reads only
 * that feature's cases: a cases file another worker is part-way through writing cannot break
 * it. `./all.js` builds every feature's cases from these, for the checks that look across all
 * features.
 *
 * @module
 */

import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { featureCasesName } from './run.js'
import type { FeatureCases } from './spec.js'

/** Where each React feature package's cases file lives. */
export const FEATURE_CASES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'cases')

/**
 * The cases files, by base name (`tag-input` for `cases/tag-input.ts`).
 *
 * @param dir - The cases directory (the kit's own by default).
 * @returns Sorted base names.
 */
export function featureCaseFileNames(dir: string = FEATURE_CASES_DIR): string[] {
  return readdirSync(dir)
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
 * @param dir - The cases directory (the kit's own by default).
 * @returns Its cases, as written (no derived cases).
 */
export async function loadFeatureCases(
  name: string,
  dir: string = FEATURE_CASES_DIR,
): Promise<FeatureCases> {
  const module: Record<string, unknown> = await import(pathToFileURL(join(dir, `${name}.ts`)).href)
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
