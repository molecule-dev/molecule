/**
 * Publish order for the fleet: every package after the `@molecule` versions it
 * pins, and none published while one of those versions is missing from npm.
 *
 * In name order api-agent-transcript-autodetect went out before the three
 * packages it pins; npm then refused those three, and autodetect 1.2.3 sat on
 * the registry depending on versions that did not exist, so every install of it
 * failed ETARGET (2026-10-15).
 *
 * @module
 */

/**
 * The exact `@molecule/*` versions a manifest installs (dependencies and
 * optionalDependencies; ranges and devDependencies are not install-time pins).
 *
 * @param manifest - A parsed package.json.
 * @returns `{ name, version }` per exact pin.
 */
export function exactMoleculeDeps(manifest) {
  return Object.entries({ ...manifest.optionalDependencies, ...manifest.dependencies })
    .filter(([name, range]) => name.startsWith('@molecule/') && /^\d+\.\d+\.\d+$/.test(range))
    .map(([name, version]) => ({ name, version }))
}

/**
 * Sort a publish queue so each package follows the queued versions it pins.
 * Name order is the tie-break; a cycle keeps name order. Names in `last` go as
 * late as possible, and so does every queued package that pins one of them.
 *
 * @param queue - `{ name, version, deps }` entries.
 * @param options - `last`: names to publish after everything that does not need them.
 * @returns A new array in publish order.
 */
export function dependencyOrder(queue, { last = new Set() } = {}) {
  const byName = new Map(queue.map((p) => [p.name, p]))
  // Late: a `last` name, or a package pinning a late package's queued version.
  const late = new Set(queue.filter((p) => last.has(p.name)).map((p) => p.name))
  for (let grew = true; grew;) {
    grew = false
    for (const p of queue) {
      if (late.has(p.name)) continue
      if (
        (p.deps ?? []).some((d) => late.has(d.name) && byName.get(d.name)?.version === d.version)
      ) {
        late.add(p.name)
        grew = true
      }
    }
  }
  const sorted = [...queue].sort(
    (a, b) => Number(late.has(a.name)) - Number(late.has(b.name)) || a.name.localeCompare(b.name),
  )
  const seen = new Set()
  const ordered = []
  const visit = (pkg) => {
    if (seen.has(pkg.name)) return
    seen.add(pkg.name)
    for (const dep of pkg.deps ?? []) {
      const next = byName.get(dep.name)
      if (next && next.version === dep.version) visit(next)
    }
    ordered.push(pkg)
  }
  sorted.forEach(visit)
  return ordered
}

/**
 * The first pinned dependency that is not on npm, or null.
 *
 * @param pkg - The package about to publish (`deps` from {@link exactMoleculeDeps}).
 * @param known - `queued` (name@version this run will publish), `published`
 *   (name@version this run has published) and `unknown` (name@version the
 *   registry scan could not read).
 * @returns The missing `{ name, version }`, or null when every pin is on npm.
 */
export function missingDependency(pkg, { queued, published, unknown }) {
  return (
    (pkg.deps ?? []).find((dep) => {
      const id = `${dep.name}@${dep.version}`
      return queued.has(id) ? !published.has(id) : unknown.has(id)
    }) ?? null
  )
}
