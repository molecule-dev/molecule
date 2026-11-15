/**
 * Vue avatar-stack and user-chip components.
 *
 * Exports:
 * - `<AvatarStack>` — horizontal stack of up to `max` avatars with a trailing "+N" overflow chip.
 * - `<UserChip>` — avatar + name + optional subtitle row for dropdowns, mention pickers, and row-level user references.
 *
 * Both render on top of `<Avatar>` from `@molecule/app-ui-vue`, so
 * avatar fallbacks (text initials, color hash) come from there. It is the Vue
 * counterpart of `@molecule/app-avatar-stack-react`: same props (React names)
 * and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { AvatarStack, UserChip } from '@molecule/app-avatar-stack-vue'
 *
 * const Row = defineComponent({
 *   setup() {
 *     const people = [
 *       { name: 'Alice Kim', src: '/avatars/alice.jpg' },
 *       { name: 'Bob Lee' },
 *       { name: 'Carol Díaz', src: '/avatars/carol.jpg' },
 *     ]
 *     return () =>
 *       h('div', [
 *         // Overlapping avatar row for assignees
 *         h(AvatarStack, { people, max: 3, size: 'sm' }),
 *         // Single user row in a dropdown
 *         h(UserChip, { name: 'Alice Kim', src: '/avatars/alice.jpg' }, {
 *           subtitle: () => ['Admin'],
 *         }),
 *       ])
 *   },
 * })
 *
 * createApp(Row).mount('#app')
 * ```
 *
 * @remarks
 * The overflow chip announces "+N more" — this is the only user-visible
 * text (currently English-only). Avatar fallbacks (initials, color hash)
 * come from `<Avatar>` in `@molecule/app-ui-vue`. The overlap is an
 * inline negative left margin (`marginLeft: '-0.5rem'`), not a ClassMap
 * class: the abstract spacing scale is non-negative, so a negative margin
 * is one of the sanctioned inline-style cases. Node-valued props
 * (`subtitle`, `trailing`) arrive as a prop AND a same-named slot;
 * the component accepts either.
 *
 * @module
 */

export * from './AvatarStack.js'
export * from './types.js'
export * from './UserChip.js'
