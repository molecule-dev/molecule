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
 * @example
 * ```tsx
 * import { AvatarStack, UserChip } from '@molecule/app-avatar-stack-react'
 *
 * // Overlapping avatar row for assignees
 * <AvatarStack
 *   people={[
 *     { name: 'Alice Kim', src: '/avatars/alice.jpg' },
 *     { name: 'Bob Lee' },
 *     { name: 'Carol Díaz', src: '/avatars/carol.jpg' },
 *   ]}
 *   max={3}
 *   size="sm"
 * />
 *
 * // Single user row in a dropdown
 * <UserChip name="Alice Kim" src="/avatars/alice.jpg" subtitle="Admin" />
 * ```
 *
 * @module
 */

export * from './AvatarStack.js'
export * from './UserChip.js'
