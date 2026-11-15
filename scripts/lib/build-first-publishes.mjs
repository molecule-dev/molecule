/**
 * Builds the packages trust:new is about to publish for the first time, in ONE build.js call.
 *
 * `build.js --only=<name>` builds that package and every internal package it depends on, and
 * the new packages of one wave share most of those (the UI core, the framework binding, the
 * locale core). One call per package therefore rebuilt the same dependencies again for each:
 * about 80 s a package on 2026-11-15, so 89 new packages kept the owner waiting about two hours
 * for the first code request. One call builds each dependency once.
 *
 * When the joint build fails, the list is split in halves and each half is built the same way,
 * so one broken package holds back only itself and costs about two calls per halving. Building
 * each package alone instead cost one call per package: 2026-11-15, one package that could not
 * build in the committed tree sent a 277-package run through 277 separate calls (hours).
 * When every package fails (a shared dependency is broken), the halves cost about twice the
 * calls of building each alone, but build.js stops at the first failure, so each fails early.
 */
import console from 'node:console'

/**
 * Builds `names` in one call; when that call fails, builds each half of `names` the same way,
 * down to the single packages that fail.
 *
 * @param names - Package names to build.
 * @param options - `build(names)` runs build.js for those names and throws when it fails
 *   (build.js prints the reason); `log` receives progress.
 * @returns `{ built, failed }`: the names that built and the names that did not, each in the
 *   order of `names`.
 */
export function buildFirstPublishes(names, { build, log = console }) {
  const built = new Set()
  const failed = new Set()
  const attempt = (group) => {
    try {
      build(group)
      for (const name of group) built.add(name)
      return
    } catch (_error) {
      // build.js printed the reason. A lone package is the one that failed; a larger group
      // is split below to find which.
      if (group.length === 1) {
        failed.add(group[0])
        return
      }
    }
    if (group.length === names.length)
      log.error(
        `  the joint build of ${names.length} packages failed (reason above); splitting it in halves to find which`,
      )
    const middle = Math.ceil(group.length / 2)
    attempt(group.slice(0, middle))
    attempt(group.slice(middle))
  }
  if (names.length) attempt([...names])
  return {
    built: names.filter((name) => built.has(name)),
    failed: names.filter((name) => failed.has(name)),
  }
}
