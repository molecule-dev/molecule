/**
 * Builds the packages trust:new is about to publish for the first time, in ONE build.js call.
 *
 * `build.js --only=<name>` builds that package and every internal package it depends on, and
 * the new packages of one wave share most of those (the UI core, the framework binding, the
 * locale core). One call per package therefore rebuilt the same dependencies again for each:
 * about 80 s a package on 2026-11-15, so 89 new packages kept the owner waiting about two hours
 * for the first code request. One call builds each dependency once.
 *
 * When the joint build fails, each package is built alone, so one broken package holds back
 * only itself.
 */
import console from 'node:console'

/**
 * Builds `names` in one call, or each alone when that call fails.
 *
 * @param names - Package names to build.
 * @param options - `build(names)` runs build.js for those names and throws when it fails
 *   (build.js prints the reason); `log` receives progress.
 * @returns `{ built, failed }`: the names that built and the names that did not.
 */
export function buildFirstPublishes(names, { build, log = console }) {
  if (!names.length) return { built: [], failed: [] }
  try {
    build(names)
    return { built: [...names], failed: [] }
  } catch (_error) {
    // build.js printed the reason. A lone package is the one that failed; otherwise build
    // each alone to find which ones.
    if (names.length === 1) return { built: [], failed: [...names] }
  }
  log.error(
    `  the joint build of ${names.length} packages failed (reason above); building each alone to find which`,
  )
  const built = []
  const failed = []
  for (const name of names) {
    try {
      build([name])
      built.push(name)
    } catch (_error) {
      // build.js printed this package's reason; the caller reports it as not publishable.
      failed.push(name)
    }
  }
  return { built, failed }
}
