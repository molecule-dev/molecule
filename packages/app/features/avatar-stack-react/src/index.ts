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
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * setClassMap(classMap) // once, at startup
 *
 * const assignees = [
 *   { name: 'Alice Kim', src: '/avatars/alice.jpg' },
 *   { name: 'Bob Lee' },
 *   { name: 'Carol Díaz', src: '/avatars/carol.jpg' },
 *   { name: 'Dan Wu' },
 *   { name: 'Eve Ortiz' },
 * ]
 *
 * export function TaskAssignees() {
 *   return (
 *     <div>
 *       <AvatarStack people={assignees} max={3} size="sm" />
 *       <UserChip name="Alice Kim" src="/avatars/alice.jpg" subtitle="Admin" />
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * Both components call `getClassMap()`, which throws until the app called
 * `setClassMap(...)` from `@molecule/app-ui`; `@molecule/app-ui-react` is a
 * peer dependency. `max` defaults to 4 and `size` to `'sm'`; people beyond
 * `max` are NOT rendered, only counted. Neither component is interactive —
 * wrap `UserChip` in your own button/menu item for click handling.
 *
 * The overflow chip announces "+N more" — this is the only user-visible
 * text (currently English-only). Avatar fallbacks (initials, color hash)
 * come from `<Avatar>` in `@molecule/app-ui-react`. The overlap is an
 * inline negative left margin (`marginLeft: '-0.5rem'`), not a ClassMap
 * class: the abstract spacing scale is non-negative, so a negative margin
 * is one of the sanctioned inline-style cases.
 *
 * @module
 */

export * from './AvatarStack.js'
export * from './UserChip.js'
