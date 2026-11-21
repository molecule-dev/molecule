/**
 * Every React feature package's cases, read from `cases/*.ts`: for the React
 * recorder (`features-goldens.test.ts`) and the kit checks that look across all
 * features. A framework package's conformance test imports only its own cases
 * file (`@molecule/app-framework-conformance/features/cases/<feature>`), so it
 * never loads this module.
 *
 * The loaders are in `./load.js`, which loads nothing at import time; a run narrowed to one
 * feature imports them from there.
 *
 * There is no index of the cases files to keep in step: a new `cases/<feature>.ts`
 * is found from the directory, and each file must export exactly one
 * {@link FeatureCases} whose package is `@molecule/app-<feature>-react` (or, for a React
 * package named without a framework suffix, `@molecule/app-<feature>`).
 *
 * @module
 */

import { featureCaseFileNames, loadFeatureCases } from './load.js'
import { featureCaseSet } from './run.js'
import type { FeatureCases } from './spec.js'

export * from './load.js'

/** Every feature package's cases, keyed by its React package, each family with its derived cases. */
export const featureCases: Record<string, FeatureCases> = Object.fromEntries(
  (await Promise.all(featureCaseFileNames().map((name) => loadFeatureCases(name))))
    .sort((a, b) => a.package.localeCompare(b.package))
    .map((feature) => [feature.package, featureCaseSet(feature)]),
)
