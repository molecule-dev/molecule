/**
 * Version-history authorizers.
 *
 * The version-history resource is intentionally policy-light: it captures
 * snapshots of any resource type and does not own a permission model of its
 * own. Apps wiring this resource should compose their own authorizer
 * middleware (or extend the parent resource's authorizer) when finer-grained
 * access control is required — for example, restricting version reads to
 * users who can read the parent resource. The base routes only require
 * authentication for `create` and `restore`.
 *
 * @module
 */
