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
 * The card's paper is a theme tone: the documented note tints (yellow
 * `#fef9c3`, green `#dcfce7`, blue `#dbeafe`, red `#fee2e2`, amber
 * `#fef3c7`) render as the theme's light tint of the matching tone, so the
 * card and its text (the theme's ink) follow the app theme. A `color` with
 * no tone is data: it is applied as given, over the tone's paper.
 *
 * `onClick` makes the whole card clickable through a transparent native
 * button over it — Enter and Space included, natively — named by the title
 * when there is one, else the body; the card's inner controls (the `actions`
 * slot) sit above it and keep their own clicks.
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
