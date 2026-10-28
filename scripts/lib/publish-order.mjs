/**
 * Publish order for the fleet: every package after the `@molecule` versions it
 * pins, and none published while one of those versions is missing from npm.
 *
 * In name order api-agent-transcript-autodetect went out before the three
 * packages it pins; npm then refused those three, and autodetect 1.2.3 sat on
 * the registry depending on versions that did not exist, so every install of it
 * failed ETARGET (2026-10-15).
 *
 * REQUIRED PEERS ARE INSTALL-TIME PINS TOO, and this file used to miss them.
 * npm 7+ installs a required peer automatically, so a package whose peer range
 * no published version satisfies installs nowhere — the same broken window as
 * above, entered through `peerDependencies` instead of `dependencies`.
 * `@molecule/app-auth-shell-react@3.0.0` reached npm requiring
 * `@molecule/app-react ^3.0.0` while app-react@3.0.0 was still unpublished, and
 * app-react's own `@molecule/app-forms ^2.0.0` was missing the same way
 * (2026-10-28). Two distinctions keep that fix honest:
 *
 *   - a peer marked `optional` in `peerDependenciesMeta` is NOT a requirement
 *     (286 of the fleet's peer declarations are optional), and
 *   - a range an already published version satisfies needs nothing from this
 *     run, so an old compatible peer must never be held behind — or blocked by
 *     — an unrelated new major that is failing.
 *
 * @module
 */
import semver from 'semver'

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
 * The `@molecule/*` peers a manifest REQUIRES.
 *
 * Required peers are install-time requirements for npm 7+, so they are ordered
 * and gated exactly like the exact pins above. An `optional` peer in
 * `peerDependenciesMeta` is omitted: npm does not install it, so its absence
 * breaks nothing. Peers outside the `@molecule` scope are omitted too — this
 * fleet publishes nothing that could satisfy them, and their own release train
 * is not ours to wait for.
 *
 * @param manifest - A parsed package.json.
 * @returns `{ name, range }` per required peer.
 */
export function requiredMoleculePeers(manifest) {
  const meta = manifest.peerDependenciesMeta ?? {}
  return Object.entries(manifest.peerDependencies ?? {})
    .filter(([name]) => name.startsWith('@molecule/') && meta[name]?.optional !== true)
    .map(([name, range]) => ({ name, range }))
}

/**
 * Whether one of these published versions satisfies the range.
 *
 * `null` — the registry could not be read — and a missing entry both satisfy
 * nothing. Each caller decides what an unreadable registry means, and here the
 * answers are always the conservative pair: order the queued version first, and
 * never publish a package on the strength of a read that did not happen.
 *
 * @param versions - Versions npm serves for that package, or null/undefined.
 * @param range - A semver range.
 * @returns True when a satisfying version is known to exist.
 */
function anySatisfies(versions, range) {
  return Array.isArray(versions) && versions.some((version) => semver.satisfies(version, range))
}

/**
 * The version inside `ids` that satisfies the range, or null.
 *
 * @param ids - `name@version` strings: what this run queued, or already published.
 * @param name - The package name to match.
 * @param range - A semver range.
 * @returns The satisfying version string, or null.
 */
function satisfyingVersion(ids, name, range) {
  const prefix = `${name}@`
  for (const id of ids) {
    if (!id.startsWith(prefix)) continue
    const version = id.slice(prefix.length)
    if (semver.satisfies(version, range)) return version
  }
  return null
}

/**
 * The queued package this one must wait for to satisfy a required peer.
 *
 * Waiting is needed only when the queued version satisfies the range AND no
 * known published version does. The second half is what keeps the common
 * `^1.0.1` / `>=1.0.1` shapes (satisfied by whatever is already on npm) from
 * inventing a wait, and a cycle, that the release does not have.
 *
 * @param peer - `{ name, range }` from {@link requiredMoleculePeers}.
 * @param queuedPeer - This run's queue entry for that name, if any.
 * @param registry - Published versions per package name; `null` when unreadable.
 * @returns The queue entry to wait for, or null.
 */
function queuedPeerToWaitFor(peer, queuedPeer, registry) {
  if (!queuedPeer || !semver.satisfies(queuedPeer.version, peer.range)) return null
  return anySatisfies(registry.get(peer.name), peer.range) ? null : queuedPeer
}

/**
 * Sort a publish queue so each package follows the queued versions it pins.
 * Name order is the tie-break; a cycle keeps name order. Names in `last` go as
 * late as possible, and so does every queued package that pins one of them.
 *
 * Required peers are queued versions too (see {@link requiredMoleculePeers}),
 * but only when no published version already satisfies the range.
 *
 * @param queue - `{ name, version, deps, peers }` entries.
 * @param options - `last`: names to publish after everything that does not need
 *   them. `registry`: published versions per package name, as this run read them.
 * @returns A new array in publish order.
 */
export function dependencyOrder(queue, { last = new Set(), registry = new Map() } = {}) {
  const byName = new Map(queue.map((p) => [p.name, p]))
  /**
   * The queue entries this one cannot be published before.
   *
   * @param pkg - A queue entry.
   * @returns The entries it waits for.
   */
  const waitsOn = (pkg) => {
    const waited = []
    for (const dep of pkg.deps ?? []) {
      const queued = byName.get(dep.name)
      if (queued && queued.version === dep.version) waited.push(queued)
    }
    for (const peer of pkg.peers ?? []) {
      const queued = queuedPeerToWaitFor(peer, byName.get(peer.name), registry)
      if (queued) waited.push(queued)
    }
    return waited
  }
  // Late: a `last` name, or a package pinning a late package's queued version.
  const late = new Set(queue.filter((p) => last.has(p.name)).map((p) => p.name))
  for (let grew = true; grew;) {
    grew = false
    for (const p of queue) {
      if (late.has(p.name)) continue
      if (waitsOn(p).some((dep) => late.has(dep.name))) {
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
    for (const dep of waitsOn(pkg)) visit(dep)
    ordered.push(pkg)
  }
  sorted.forEach(visit)
  return ordered
}

/**
 * Required-peer cycles among queued versions.
 *
 * Two packages that each require the other's queued version have no installable
 * publish order, and no amount of re-dispatching changes that. Detecting the
 * cycle names the cause instead of leaving a run that blocks both sides forever
 * and reads as a transient failure. Recovering is a human decision: publish one
 * side against a range an already published version satisfies, or drop one
 * requirement.
 *
 * Only waits the queue itself creates are considered, using the same rule as
 * {@link dependencyOrder} — a range an already published version satisfies is
 * not a wait. An unreadable registry (`null`) is treated as "not satisfied", so
 * a reported cycle is always one this run's own queue cannot break; the gate
 * refuses those packages individually either way.
 *
 * @param queue - `{ name, version, peers }` entries.
 * @param options - `registry`: published versions per package name.
 * @returns One array of names per cycle, sorted; empty when the queue is orderable.
 */
export function requiredPeerCycles(queue, { registry = new Map() } = {}) {
  const byName = new Map(queue.map((p) => [p.name, p]))
  const waitsOn = new Map(
    queue.map((p) => [
      p.name,
      (p.peers ?? [])
        .map((peer) => queuedPeerToWaitFor(peer, byName.get(peer.name), registry))
        .filter((queued) => queued !== null)
        .map((queued) => queued.name),
    ]),
  )
  const index = new Map()
  const low = new Map()
  const stack = []
  const onStack = new Set()
  const cycles = []
  let nextIndex = 0
  /**
   * Tarjan's strongly connected components (iterative in spirit, recursive in
   * shape: the queue is ~1000 packages deep at most).
   *
   * @param name - Package to visit.
   */
  const connect = (name) => {
    index.set(name, nextIndex)
    low.set(name, nextIndex)
    nextIndex++
    stack.push(name)
    onStack.add(name)
    for (const target of waitsOn.get(name) ?? []) {
      if (!index.has(target)) {
        connect(target)
        low.set(name, Math.min(low.get(name), low.get(target)))
      } else if (onStack.has(target)) {
        low.set(name, Math.min(low.get(name), index.get(target)))
      }
    }
    if (low.get(name) !== index.get(name)) return
    const component = []
    let member
    do {
      member = stack.pop()
      onStack.delete(member)
      component.push(member)
    } while (member !== name)
    // More than one member, or one that waits on itself: both are cycles.
    if (component.length > 1 || (waitsOn.get(name) ?? []).includes(name)) {
      cycles.push(component.sort())
    }
  }
  for (const p of queue) {
    if (!index.has(p.name)) connect(p.name)
  }
  return cycles
}

/**
 * The first install-time requirement that is not on npm, or null.
 *
 * Exact dependencies keep the rule they had: a queued version must already be
 * published by this run, and a version the scan could not read is not assumed
 * present. Required peers are checked against real published versions: a range
 * that a published (or this run's) version satisfies is fine, a range only a
 * queued-but-unpublished version would satisfy blocks until that publish lands,
 * and a range nothing known satisfies blocks with the reason it could determine.
 *
 * @param pkg - The package about to publish (`deps` from
 *   {@link exactMoleculeDeps}, `peers` from {@link requiredMoleculePeers}).
 * @param known - `queued` (name@version this run will publish), `published`
 *   (name@version this run has published), `unknown` (name@version the registry
 *   scan could not read) and `registry` (published versions per name; `null`
 *   when that package's registry entry could not be read).
 * @returns The missing requirement — `{ name, version }` for a dependency,
 *   `{ name, range, kind, why }` for a peer — or null when every requirement is
 *   satisfiable on npm.
 */
export function missingDependency(pkg, { queued, published, unknown, registry = new Map() }) {
  const missingExact = (pkg.deps ?? []).find((dep) => {
    const id = `${dep.name}@${dep.version}`
    return queued.has(id) ? !published.has(id) : unknown.has(id)
  })
  if (missingExact) return missingExact
  for (const peer of pkg.peers ?? []) {
    if (semver.validRange(peer.range) === null) {
      return { kind: 'peer', name: peer.name, range: peer.range, why: 'invalid-range' }
    }
    // Installable already — by a version this run published, or one npm serves.
    // This check comes FIRST on purpose: a requirement the registry can already
    // satisfy must never be blocked by a different, newer major that is failing.
    if (satisfyingVersion(published, peer.name, peer.range) !== null) continue
    if (anySatisfies(registry.get(peer.name), peer.range)) continue
    const pending = satisfyingVersion(queued, peer.name, peer.range)
    if (pending !== null) {
      return {
        kind: 'peer',
        name: peer.name,
        range: peer.range,
        why: 'not-published-yet',
        version: pending,
      }
    }
    return {
      kind: 'peer',
      name: peer.name,
      range: peer.range,
      why: Array.isArray(registry.get(peer.name)) ? 'no-satisfying-version' : 'registry-unknown',
    }
  }
  return null
}
