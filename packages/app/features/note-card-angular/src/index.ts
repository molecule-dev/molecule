/**
 * Angular sticky-note style card — the counterpart of
 * `@molecule/app-note-card-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `NoteCard` — a sticky-note style card with optional color tint,
 * pinned indicator, and bottom-right actions. Use for note-taking apps,
 * digital post-its, dashboard quick-notes.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { NoteCard } from '@molecule/app-note-card-angular'
 *
 * @Component({
 *   selector: 'app-root',
 *   standalone: true,
 *   imports: [NoteCard],
 *   template: `
 *     <article
 *       mol-note-card
 *       title="Meeting notes"
 *       body="Follow up with design team on the new dashboard layout."
 *       color="#fef9c3"
 *       [pinned]="true"
 *       modifiedAt="Jun 5, 2026"
 *       [onClick]="openNote"
 *     >
 *       <button slot="actions" type="button">Edit</button>
 *     </article>
 *   `,
 * })
 * export class App {
 *   openNote(): void {
 *     // navigate to the note…
 *   }
 * }
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond — `getClassMap()` throws before wiring.
 *
 * The card intentionally keeps a paper-sticky-note look in BOTH themes:
 * its text color is fixed near-black, so `color` must be a LIGHT pastel
 * (`#fef9c3`, `#dbeafe`, `#dcfce7`, ...) — a dark `color` value makes
 * the body unreadable. The card does not re-tint with the app theme.
 *
 * `onClick` makes the whole card clickable but renders no button
 * semantics — supply your own focus/keyboard affordance (or wrap the
 * card in a button/link) when click-to-open matters for a11y.
 *
 * Node-valued props are projected content: `title`, `body` and
 * `modifiedAt` are selected by `[slot=title]` / `[slot=body]` /
 * `[slot=modifiedAt]`, `actions` by `[slot=actions]`; string inputs render
 * as text with React's truthiness branch (an empty string renders nothing).
 *
 * @module
 */

export * from './note-card.component.js'
export * from './types.js'
