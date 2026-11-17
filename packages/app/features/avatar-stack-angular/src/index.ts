/**
 * Angular avatar-stack and user-chip components — the counterpart of
 * `@molecule/app-avatar-stack-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports:
 * - `<div mol-avatar-stack>` — horizontal stack of up to `max` avatars with a trailing "+N" overflow chip.
 * - `<div mol-user-chip>` — avatar + name + optional subtitle row for dropdowns, mention pickers, and row-level user references.
 *
 * Both render on top of `<div mol-avatar>` from `@molecule/app-ui-angular`, so
 * avatar fallbacks (text initials, color hash) come from there.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { AvatarStack, UserChip } from '@molecule/app-avatar-stack-angular'
 *
 * @Component({
 *   selector: 'app-assignees',
 *   standalone: true,
 *   imports: [AvatarStack, UserChip],
 *   template: `
 *     <div mol-avatar-stack [people]="people" [max]="3" size="sm"></div>
 *     <div mol-user-chip name="Alice Kim" src="/avatars/alice.jpg">
 *       <span slot="subtitle">Admin</span>
 *     </div>
 *     <div mol-user-chip name="Alice Kim" href="/people/alice" data-person="alice"
 *       [nameLinkProps]="{ className: 'person-name', target: '_blank', rel: 'noreferrer' }">
 *     </div>
 *   `,
 * })
 * export class Assignees {
 *   people = [
 *     { name: 'Alice Kim', src: '/avatars/alice.jpg' },
 *     { name: 'Bob Lee' },
 *     { name: 'Carol Díaz', src: '/avatars/carol.jpg' },
 *   ]
 * }
 * ```
 *
 * @remarks
 * `UserChip` with `href` renders one profile link on the displayed name, with
 * a decorative avatar outside it. Subtitle and trailing projections remain outside
 * the link. The `nameLinkProps` input forwards anchor attributes and events
 * (including `onClick` for app routing); `className` or `class` adds link classes.
 * The host div is the root: bind ordinary attributes and events directly on it.
 * Without `href`, the plain avatar/name DOM is unchanged and `nameLinkProps`
 * is ignored. An empty-string `href` still renders a link.
 *
 * The overflow chip announces "+N more" — this is the only user-visible
 * text (currently English-only). Avatar fallbacks (initials, color hash)
 * come from `<div mol-avatar>` in `@molecule/app-ui-angular`. The overlap is
 * an inline negative left margin (`margin-left: -0.5rem`), not a ClassMap
 * class: the abstract spacing scale is non-negative, so a negative margin is
 * one of the sanctioned inline-style cases. Node props are projected
 * content: `[slot=subtitle]` and `[slot=trailing]`.
 *
 * @module
 */

export * from './avatar-stack.component.js'
export * from './types.js'
export * from './user-chip.component.js'
