/**
 * Solid avatar-stack and user-chip components.
 *
 * Exports:
 * - `<AvatarStack>` — horizontal stack of up to `max` avatars with a trailing "+N" overflow chip.
 * - `<UserChip>` — avatar + name + optional subtitle row for dropdowns, mention pickers, and row-level user references.
 *
 * Both render on top of `<Avatar>` from `@molecule/app-ui-solid`, so
 * avatar fallbacks (text initials, color hash) come from there. It is the
 * Solid counterpart of `@molecule/app-avatar-stack-react`: same props (React
 * names) and the same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { AvatarStack, UserChip } from '@molecule/app-avatar-stack-solid'
 *
 * const people = [
 *   { name: 'Alice Kim', src: '/avatars/alice.jpg' },
 *   { name: 'Bob Lee' },
 *   { name: 'Carol Díaz', src: '/avatars/carol.jpg' },
 * ]
 *
 * export function Assignees() {
 *   return (
 *     <>
 *       <AvatarStack people={people} max={3} size="sm" />
 *       <UserChip name="Alice Kim" src="/avatars/alice.jpg" subtitle="Admin" />
 *       <UserChip name="Alice Kim" href="/people/alice" data-person="alice"
 *         nameLinkProps={{ className: 'person-name', target: '_blank', rel: 'noreferrer' }} />
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * `UserChip` with `href` renders one profile link on the displayed name, with
 * a decorative avatar outside it. Subtitle and trailing content remain outside
 * the link. `nameLinkProps` forwards anchor attributes and events (including
 * `onClick` for app routing); `className` or Solid's `class` adds link classes.
 * Remaining root attributes and events pass through to the outer div via `splitProps`.
 * Without `href`, the plain avatar/name DOM is unchanged and `nameLinkProps`
 * is ignored. An empty-string `href` still renders a link.
 *
 * The overflow chip announces "+N more" — this is the only user-visible
 * text. Both of its strings come from `useTranslation()` in
 * `@molecule/app-solid`: the chip's accessible name is the
 * `avatarStack.more` key and the sign before its count is
 * `avatarStack.overflowPrefix`. Add the companion bond
 * `@molecule/app-locales-avatar-stack` to translate them; without a
 * translation the English defaults render. Avatar fallbacks (initials, color
 * hash) come from `<Avatar>` in `@molecule/app-ui-solid`. The overlap is an
 * inline negative left margin (`margin-left: '-0.5rem'`), not a ClassMap
 * class: the abstract spacing scale is non-negative, so a negative margin
 * is one of the sanctioned inline-style cases.
 *
 * @module
 */

export * from './AvatarStack.jsx'
export * from './types.js'
export * from './UserChip.jsx'
