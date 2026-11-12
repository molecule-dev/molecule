/**
 * Native test selection without reading application or test implementation.
 * @module
 */
import type { FeedbackProject, FeedbackSpec } from './playwright-feedback-types.js'

/**
 * Keep the caller's test inventory order and attach the paths that triggered this run.
 * Background passes run the file whose latest run finished longest ago first; an explicit
 * checkpoint runs files that actually failed first. Source syntax, route names and spec prose
 * never decide which test runs or what it should report.
 * @param project - The caller's runnable test inventory.
 * @param changed - Source paths observed by the caller, not an inferred failure location.
 * @returns Every known spec, with the same triggering paths.
 */
export function selectFeedbackSpecs(
  project: FeedbackProject,
  changed: readonly string[],
): Array<{ spec: FeedbackSpec; sourceFiles: string[] }> {
  return project.specs.map((spec) => ({ spec, sourceFiles: [...changed] }))
}
