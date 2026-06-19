/**
 * Parent-resource ownership-resolver registry for HTTP-driven version access.
 *
 * The version-history store is polymorphic and append-only: it captures full
 * snapshots of *any* resource type and has no permission model of its own. It
 * therefore cannot, by itself, know whether the caller is allowed to read or
 * restore a given version — that truth lives with whoever owns the **parent**
 * resource (the document/project/etc. the snapshot belongs to), not with the
 * version row's `userId` (which is merely who captured the snapshot and may be
 * `null` for system-generated versions).
 *
 * This registry lets each parent resource register a
 * {@link VersionOwnershipResolver} keyed by `resourceType` at startup, so the
 * HTTP handlers can ask "may this caller access versions of
 * `(resourceType, resourceId)`?" without baking concrete resource imports into
 * the version-history package (mirrors the trash resource's restore-callback
 * registry).
 *
 * **Fail-closed:** when no resolver is registered for a `resourceType`, the
 * handlers deny access (404, no existence leak). Apps that mount the raw
 * version-history routes MUST register a resolver for every resource type they
 * version, or compose their own ownership gate — otherwise the routes are
 * inert by design rather than open.
 *
 * @module
 */

/**
 * The context an ownership resolver receives to decide access. `userId` is the
 * authenticated caller (re-derived from `res.locals.session.userId`, never
 * client-supplied).
 */
export interface VersionOwnershipContext {
  /** The parent resource type (e.g. `'document'`, `'project'`). */
  resourceType: string
  /** The parent resource id whose versions are being accessed. */
  resourceId: string
  /** The authenticated caller's user id. */
  userId: string
}

/**
 * Resolves whether the authenticated caller may read/restore versions of a
 * given parent resource. Return `true` to allow, `false` to deny. May be
 * async (e.g. it can look the parent resource up in the database).
 *
 * @param context - The {@link VersionOwnershipContext} to authorize.
 * @returns `true` when the caller owns / may access the parent resource.
 */
export type VersionOwnershipResolver = (
  context: VersionOwnershipContext,
) => boolean | Promise<boolean>

const ownershipResolvers = new Map<string, VersionOwnershipResolver>()

/**
 * Registers an ownership resolver for a parent resource type.
 *
 * Subsequent calls with the same `resourceType` overwrite the previous
 * registration.
 *
 * @param resourceType - The parent resource type the resolver authorizes.
 * @param resolver - The resolver to invoke when authorizing access to versions
 *                   of this resource type.
 */
export function registerOwnershipResolver(
  resourceType: string,
  resolver: VersionOwnershipResolver,
): void {
  ownershipResolvers.set(resourceType, resolver)
}

/**
 * Returns the ownership resolver registered for a resource type, or
 * `undefined` if none has been registered.
 *
 * @param resourceType - The resource type to look up.
 * @returns The resolver, or `undefined`.
 */
export function getOwnershipResolver(resourceType: string): VersionOwnershipResolver | undefined {
  return ownershipResolvers.get(resourceType)
}

/**
 * Removes any registered ownership resolver for the given resource type.
 *
 * @param resourceType - The resource type whose resolver should be removed.
 * @returns `true` if a resolver was removed.
 */
export function unregisterOwnershipResolver(resourceType: string): boolean {
  return ownershipResolvers.delete(resourceType)
}

/**
 * Clears all registered ownership resolvers. Primarily useful in tests.
 */
export function clearOwnershipResolvers(): void {
  ownershipResolvers.clear()
}
