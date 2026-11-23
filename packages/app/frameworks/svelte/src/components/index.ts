/**
 * The components that are not tied to one service: `BodyPortal`, React's
 * `createPortal` for `document.body`, as a Svelte component, and
 * `PresentWhileContent`, an element in the page only while its content renders
 * something (React's `slot(children) !== undefined && <div>…</div>`).
 *
 * @module
 */

export { default as BodyPortal } from './BodyPortal.svelte'
export { default as PresentWhileContent } from './PresentWhileContent.svelte'
