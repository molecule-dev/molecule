/**
 * Svelte avatar-stack and user-chip components — the Svelte counterpart of
 * `@molecule/app-avatar-stack-react`, with the same props and the same DOM.
 *
 * Exports:
 * - `<AvatarStack>` — horizontal stack of up to `max` avatars with a trailing "+N" overflow chip.
 * - `<UserChip>` — avatar + name + optional subtitle row for dropdowns, mention pickers, and row-level user references.
 *
 * Both render on top of `<Avatar>` from `@molecule/app-ui-svelte`, so
 * avatar fallbacks (text initials, color hash) come from there.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { AvatarStack, UserChip } from '@molecule/app-avatar-stack-svelte'
 *
 *   const people = [
 *     { name: 'Alice Kim', src: '/avatars/alice.jpg' },
 *     { name: 'Bob Lee' },
 *     { name: 'Carol Díaz', src: '/avatars/carol.jpg' },
 *   ]
 * </script>
 *
 * <!-- Overlapping avatar row for assignees -->
 * <AvatarStack {people} max={3} size="sm" />
 *
 * <!-- Single user row in a dropdown -->
 * <UserChip name="Alice Kim" src="/avatars/alice.jpg">
 *   {#snippet subtitle()}Admin{/snippet}
 * </UserChip>
 *
 * <!-- Linked byline: only the name is a profile link. -->
 * <UserChip name="Alice Kim" href="/people/alice" data-person="alice"
 *   nameLinkProps={{ className: 'person-name', target: '_blank', rel: 'noreferrer' }} />
 * ```
 *
 * @remarks
 * `UserChip` with `href` renders one profile link on the displayed name, with
 * a decorative avatar outside it. Subtitle and trailing snippets remain outside
 * the link. `nameLinkProps` forwards anchor attributes and events; use `className`
 * and `onClick`, or Svelte's native `class` and `onclick`, for styling and routing.
 * Remaining attributes and native event handlers spread onto the outer div;
 * the root also accepts the React-compatible `onClick` alias.
 * Without `href`, the plain avatar/name DOM is unchanged and `nameLinkProps`
 * is ignored. An empty-string `href` still renders a link.
 *
 * The overflow chip announces "+N more" — this is the only user-visible
 * text (currently English-only). Avatar fallbacks (initials, color hash)
 * come from `<Avatar>` in `@molecule/app-ui-svelte`. The overlap is an
 * inline negative left margin (`margin-left: -0.5rem`), not a ClassMap
 * class: the abstract spacing scale is non-negative, so a negative margin
 * is one of the sanctioned inline-style cases. Node-valued props
 * (`subtitle`, `trailing`) are snippets.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
