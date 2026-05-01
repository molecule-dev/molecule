/**
 * Workspace authorizers.
 *
 * Workspace operations enforce role-based access in-handler via
 * `assertMember(workspaceId, userId, minRole)`. No additional authorizers
 * are needed at the router level beyond the standard `authenticate`
 * middleware.
 *
 * @module
 */

export {}
