/**
 * Angular margin notes: long-form text with notes beside each paragraph —
 * annotated essays, commentary, and posts that show which paragraphs an AI
 * wrote and the prompt behind each.
 *
 * Angular counterpart of `@molecule/app-margin-notes-react`: the same exports,
 * the same props (React names), the same ClassMap tokens, the same i18n keys
 * and the same DOM for the same input, so an app switches framework by changing
 * only the package name in its imports.
 *
 * Desktop: a large-type prose column and a narrower notes column to its right;
 * each note lines up with the paragraph (or run of paragraphs) it belongs to
 * and appears once. Hovering or focusing a paragraph emphasises its notes;
 * hovering or focusing a note tints the paragraphs it covers. A paragraph can
 * carry a small mark in its left margin. Note kinds (say, "Summaries" and
 * "Prompts") each get a real switch. Phone: the notes column gives way to a bar
 * fixed to the bottom that shows the notes for the section being read and
 * follows the reader; a noted paragraph's pin button pins its notes, a second
 * press lets go; the switches live in the bar. A document with no notes renders
 * centred prose at full measure with no notes column, no switches and no bar.
 *
 * The example renders a post's body from its `provenance.json` (written at
 * build time by `@molecule/api-text-provenance`): a summary beside each
 * section (switch ON), the prompt beside the AI paragraphs it wrote (switch
 * OFF), a margin mark on each AI paragraph, and the phone bar.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { MarginNotes } from '@molecule/app-margin-notes-angular'
 *
 * // One entry of provenance.json's `spans`: a block of the post's markdown, in page order.
 * interface PostSpan {
 *   text: string
 *   origin: 'human' | 'ai'
 *   prompt?: string
 *   model?: string
 * }
 *
 * // The span indexes that start a section: 0 (the lead), then every heading at the post's
 * // shallowest heading level. Key your summaries by these indexes.
 * function sectionStarts(spans: PostSpan[]): number[] {
 *   const level = (text: string): number => text.match(/^#{1,6}(?=\s)/)?.[0].length ?? 0
 *   const top = Math.min(...spans.map((span) => level(span.text) || 7))
 *   return spans.flatMap((span, i) => (i === 0 || level(span.text) === top ? [i] : []))
 * }
 *
 * // In the Post page, in place of the single innerHTML body: build one block per
 * // provenance span (each with a stable id), one note per prompt and per section summary,
 * // and put each note's id in the noteIds of every block it covers.
 * @Component({
 *   selector: 'app-post-body',
 *   standalone: true,
 *   imports: [MarginNotes],
 *   template: `
 *     <div mol-margin-notes
 *          [blocks]="blocks"
 *          [notes]="notes"
 *          [kinds]="kinds"
 *          markLabel="Written with AI">
 *     </div>
 *   `,
 * })
 * export class PostBody {
 *   readonly spans: PostSpan[] = [
 *     { text: 'Why logs first', origin: 'human' },
 *     { text: 'Logs show what did happen.', origin: 'ai', prompt: 'Write the logs section.' },
 *   ]
 *   readonly blocks = this.spans.map((span, i) => ({
 *     id: `block-${i}`,
 *     content: `<div>${span.text}</div>`,
 *     noteIds: span.prompt ? [`prompt-0`] : [],
 *     marked: span.origin === 'ai',
 *   }))
 *   readonly notes = [{ id: 'prompt-0', kind: 'prompt', content: 'Write the logs section.' }]
 *   readonly kinds = [
 *     { id: 'summary', label: 'Summaries', defaultOn: true },
 *     { id: 'prompt', label: 'Prompts', defaultOn: false, panel: 'tap' as const },
 *   ]
 *   readonly sectionStarts = sectionStarts(this.spans)
 * }
 * ```
 *
 * @remarks
 * - **Do NOT hand-build an annotator** — no grid of your own, no hover or
 *   scroll script, no margin dots, no bottom bar, no toggle state. This
 *   component is all of it: pass `blocks`, `notes` and `kinds`.
 * - **Do NOT set the defaults in a lifecycle hook or hide notes with your own
 *   CSS.** `kinds[].defaultOn` is read in the FIRST render; the desktop/phone
 *   split is CSS (`cm.hiddenBelow('md')` / `cm.hiddenFrom('md')`).
 * - **Do NOT render the body as one HTML string.** Pass one block per
 *   top-level markdown block (paragraph, heading, list, code), each with a
 *   stable `id` and a template (or plain text). The component adds no markup
 *   inside a block.
 * - **Do NOT make one note per paragraph.** Make ONE note per prompt (or per
 *   section summary) and put its id in the `noteIds` of every block it covers:
 *   it shows once, beside the first. Consecutive blocks with the same
 *   `noteIds` form one row.
 * - **Do NOT add a second copy of the notes for phones** (inline between
 *   paragraphs, a popover). The bar is the phone's copy.
 * - **Do NOT import `@molecule/api-*` packages into the page** — they are
 *   server-only. The page reads what the build wrote (`provenance.json`, or
 *   spans passed to the prerender).
 * - Section notes follow the reader; paragraph notes wait for the pin. On a
 *   phone the panel shows the kinds with `panel: 'follow'` (the default) for
 *   the section in view. A kind about ONE paragraph (a prompt, a citation)
 *   gets `panel: 'tap'`: while its switch is off it shows only when that
 *   paragraph's pin button is pressed (and goes on the second press); once its
 *   switch is ON it follows the section in view like a `'follow'` kind, so the
 *   switch always shows something.
 * - The mark is drawn on the block, as an absolutely-placed dot inside the
 *   block's own wrapper (hidden on phones). At rest a marked block is typeset
 *   exactly like an unmarked one.
 * - Controlled or not: pass `shownKinds` + `onShownKindsChange` to own the
 *   switches' state (e.g. to remember it); otherwise the component does.
 * - The phone bar reserves space at the end of the text so it never covers the
 *   last paragraph. UI strings come from the companion locale bond
 *   `@molecule/app-locales-margin-notes`; kind labels and `markLabel` are
 *   yours to translate.
 * - Node-valued props (`blocks[].content`, `notes[].content`) are
 *   `TemplateRef`s (or plain text); every other prop keeps React's name and
 *   value shape.
 *
 * @module
 */

export * from './margin-notes.component.js'
export * from './rows.js'
export * from './types.js'
