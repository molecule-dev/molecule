/**
 * Lock entries whose dependency resolves to a version outside the range it is required at.
 *
 * `npm ci` installs a lock file as written and `npm ci --dry-run` trusts it, so an entry that
 * resolves to the wrong major is installed without complaint and fails only when the code runs.
 * On 2026-11-06 molecule's lock held `workbox-build`'s nested `fs-extra@9.1.0` (needs
 * `jsonfile` ^6.0.1) with no nested `jsonfile`, so it resolved the hoisted `jsonfile@4.0.0`
 * and every Vite build that loaded `vite-plugin-pwa` died with "Cannot find module
 * 'jsonfile/utils'" in CI only. `legacy-peer-deps=true` let it in: `vite-plugin-pwa` lists
 * `workbox-build` as a peer too, so npm stopped managing that subtree.
 *
 * @module
 */

/**
 * The lock path Node's resolution reaches for `dep` required from the entry at `from`: the
 * entry's own `node_modules`, then each enclosing `node_modules`, then the root.
 *
 * @param packages - The lock file's `packages` map.
 * @param from - Lock path of the requiring entry.
 * @param dep - Dependency name.
 * @returns The resolved lock path, or null when nothing provides it.
 */
export function resolveLockPath(packages, from, dep) {
  let base = from
  for (;;) {
    const candidate = base ? `${base}/node_modules/${dep}` : `node_modules/${dep}`
    if (packages[candidate]) return candidate
    if (!base) return null
    const cut = base.lastIndexOf('/node_modules/')
    base = cut >= 0 ? base.slice(0, cut) : ''
  }
}

/**
 * Every `dependencies` edge in the lock whose resolved entry's version does not satisfy the
 * declared range. Missing entries are left to the resolvability check; ranges that are not
 * semver ranges (aliases, file:, git, tags) are skipped by `satisfies`. A root `overrides` entry
 * replaces the range it governs (`{ dep: version }` everywhere, `{ parent: { dep: version } }`
 * under that parent): npm installs the override on purpose, so the edge must match it instead.
 *
 * @param packages - The lock file's `packages` map.
 * @param satisfies - Semver check for one edge.
 * @param [overrides] - Root package.json `overrides`.
 * @returns Each unsatisfied edge as `{ from, dep, range, at, version }`.
 */
export function unsatisfiedDependencies(packages, satisfies, overrides = {}) {
  const problems = []
  for (const [from, info] of Object.entries(packages)) {
    if (!from || info.link) continue
    const name = info.name ?? from.slice(from.lastIndexOf('node_modules/') + 'node_modules/'.length)
    const scoped = typeof overrides[name] === 'object' ? overrides[name] : {}
    for (const [dep, declared] of Object.entries(info.dependencies ?? {})) {
      const forced = typeof scoped[dep] === 'string' ? scoped[dep] : overrides[dep]
      // A `$name` override points at the root's own dependency; its range is the declared one.
      const range = typeof forced === 'string' && !forced.startsWith('$') ? forced : declared
      const at = resolveLockPath(packages, from, dep)
      if (!at) continue
      const entry = packages[at]
      const version = entry.link ? packages[entry.resolved]?.version : entry.version
      if (version && !satisfies(version, range)) problems.push({ from, dep, range, at, version })
    }
  }
  return problems
}
