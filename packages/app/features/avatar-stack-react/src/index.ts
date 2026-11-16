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
 *
 * // A byline or assignment row has one canonical profile link, on the name.
 * // The adjacent avatar stays outside that link; actions stay in the trailing slot.
 * <UserChip
 *   name="Alice Kim"
 *   src="/avatars/alice.jpg"
 *   href="/people/alice"
 *   nameLinkProps={{ className: 'person-name' }}
 *   subtitle="Maintenance lead"
 * />
 * ```
 *
 * @remarks
 * Use `UserChip` with `href` for linked bylines and row-level identities. It renders one
 * name link, a decorative avatar and separate subtitle/actions, so callers do not need
 * to duplicate the name-link selector or accessible name on an avatar link. Link props
 * can attach the app's router click handler and styling. Repeated identity rows in a
 * header/footer or a list remain separate rows; scope selectors to the intended row.
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
