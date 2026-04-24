/**
 * React avatar-stack and user-chip components.
 *
 * Exports:
 * - `<AvatarStack>` — horizontal stack of up to `max` avatars with a trailing "+N" overflow chip.
 * - `<UserChip>` — avatar + name + optional subtitle row for dropdowns, mention pickers, and row-level user references.
 *
 * Both render on top of `<Avatar>` from `@molecule/app-ui-react`, so
 * avatar fallbacks (text initials, color hash) come from there.
 *
 * @module
 */

export * from './AvatarStack.js'
export * from './UserChip.js'
