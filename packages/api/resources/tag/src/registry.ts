/**
 * Parent-resource ownership-resolver registry for cross-resource tag writes.
 *
 * The tag resource attaches/detaches tags on ANY resource type via the generic
 * `resource_tags` join table (`POST /:resourceType/:resourceId/tags`,
 * `DELETE /:resourceType/:resourceId/tags/:tagId`). It has no permission model
 * of its own — whether a caller may tag `(resourceType, resourceId)` is owned by
 * whoever owns that PARENT resource, not by the tag package. Without a hook,
 * auto-mounting those routes behind only `authenticate` is a cross-tenant IDOR:
 * any authenticated user could tag/untag another tenant's resources (integrity
 * tampering + a removeTag 204/404 existence oracle).
 *
 * This registry lets each parent resource register a {@link TagOwnershipResolver}
 * keyed by `resourceType` at startup, so the tag handlers can ask "may this
 * caller write tags on `(resourceType, resourceId)`?" without baking concrete
 * resource imports into the tag package (mirrors the trash / version-history
 * ownership-resolver registries).
 *
 * **Fail-closed:** when no resolver is registered for a `resourceType` (or it
 * throws), the handlers DENY with 404 (no existence leak) — a generated app that
 * mounts the tag routes without wiring ownership gets default-deny, not an open
 * cross-tenant tag-write endpoint.
 *
 * @module
 */
import { logger } from '@molecule/api-logger'

/** Inputs a {@link TagOwnershipResolver} receives to authorize a tag write. */
export interface TagOwnershipContext {
  /** The parent resource type from the URL (e.g. `'posts'`, `'products'`). */
  resourceType: string
  /** The parent resource id from the URL. */
  resourceId: string
  /** The authenticated caller's user id. */
  userId: string
}

/**
 * Answers "may this caller write tags on `(resourceType, resourceId)`?". Return
 * `true` to allow; anything else (or a throw) denies. Registered per resourceType.
 */
export type TagOwnershipResolver = (context: TagOwnershipContext) => boolean | Promise<boolean>

const ownershipResolvers = new Map<string, TagOwnershipResolver>()

/**
 * Register the ownership resolver for a parent `resourceType`. Call once at
 * startup for every resource type whose rows may be tagged.
 *
 * @param resourceType - The parent resource type (matches the route param).
 * @param resolver - Authorizes a tag write for that resource type.
 */
export function registerTagOwnershipResolver(
  resourceType: string,
  resolver: TagOwnershipResolver,
): void {
  ownershipResolvers.set(resourceType, resolver)
}

/**
 * Get the registered resolver for a `resourceType`, or `undefined`.
 *
 * @param resourceType - The parent resource type.
 * @returns The resolver, or `undefined` when none is registered.
 */
export function getTagOwnershipResolver(resourceType: string): TagOwnershipResolver | undefined {
  return ownershipResolvers.get(resourceType)
}

/**
 * Remove the resolver for a `resourceType` (returns whether one existed).
 *
 * @param resourceType - The parent resource type.
 * @returns `true` if a resolver was registered and removed.
 */
export function unregisterTagOwnershipResolver(resourceType: string): boolean {
  return ownershipResolvers.delete(resourceType)
}

/** Clear all registered resolvers (test isolation). */
export function clearTagOwnershipResolvers(): void {
  ownershipResolvers.clear()
}

/**
 * Fail-closed authorization for a cross-resource tag write. Denies (`false`)
 * when no resolver is registered for the `resourceType` or the resolver throws.
 *
 * @param context - The resource + caller to authorize.
 * @returns Whether the caller may write tags on the resource.
 */
export async function isTagWriteAuthorized(context: TagOwnershipContext): Promise<boolean> {
  const resolver = ownershipResolvers.get(context.resourceType)
  if (!resolver) return false
  try {
    return (await resolver(context)) === true
  } catch (error) {
    logger.warn('tag ownership resolver threw; denying tag write', {
      resourceType: context.resourceType,
      resourceId: context.resourceId,
      error,
    })
    return false
  }
}
