/**
 * Room-type authorizers.
 *
 * Mutation routes use the `authenticate` middleware declared in route
 * definitions, so no custom authorizers are needed at this time. Property
 * ownership checks (e.g. "the caller must own the property they are adding
 * a room type to") should be enforced by a downstream wrapper that has
 * access to a property bond.
 *
 * @module
 */
