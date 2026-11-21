/**
 * Vue inbox / email message list row.
 *
 * Exports `<InboxRow>` and the `InboxRowProps` type — the Vue counterpart of
 * `@molecule/app-inbox-row-react`: the same props (React names) and the same
 * DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { InboxRow } from '@molecule/app-inbox-row-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     return () =>
 *       h(InboxRow, {
 *         sender: 'Alice Johnson',
 *         senderAvatarSrc: 'https://example.com/alice.jpg',
 *         subject: 'Q3 report is ready',
 *         preview: "Hi, I've attached the final numbers for review...",
 *         timestamp: '10:42 AM',
 *         unread: true,
 *         starred: false,
 *         hasAttachment: true,
 *         onClick: () => openMessage(msg.id),
 *         onToggleStar: () => toggleStar(msg.id),
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * - With `onClick` set, the whole row is clickable through a transparent
 *   native button laid over it, named by the sender and the subject (two ids,
 *   `aria-labelledby="<senderId> <subjectId>"`); the inner controls (the star
 *   toggle, the selection slot, the labels slot) sit above it and keep their
 *   own clicks. A native button turns Enter and Space into a click itself, so
 *   the row's open action needs no key handler.
 * - Star/attachment indicators use fixed colors and emoji. Their aria-labels
 *   ("Star"/"Unstar"/"Has attachment") route through `t()` under `inboxRow.*`,
 *   translated by the `@molecule/app-locales-inbox-row` companion bond; they
 *   are read through `useTranslation()`, so a locale switch re-renders them.
 * - When `sender` is not a plain string, the avatar's accessible name falls
 *   back to the translated "Sender" (`inboxRow.sender`) — pass a string
 *   `sender` (or your own `selectionSlot`) when screen-reader naming matters.
 * - `unread` bolds the row via an inline `fontWeight: 600` and renders a fixed
 *   blue dot — the dot color does not follow the theme.
 * - `getClassMap()` requires a bonded ClassMap; `<Avatar>` comes from
 *   `@molecule/app-ui-vue`.
 * - Node-valued props (`sender`, `subject`, `preview`, `timestamp`, `labels`,
 *   `selectionSlot`) accept a prop or a same-named slot; a given prop wins.
 *
 * @module
 */

export * from './InboxRow.js'
export * from './types.js'
