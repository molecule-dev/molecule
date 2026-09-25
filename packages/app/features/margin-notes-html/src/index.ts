/**
 * Long-form reading layout with notes beside each paragraph, as plain HTML —
 * for static sites and server-rendered pages that have no React.
 *
 * `renderMarginNotes()` turns your blocks (paragraphs, headings) and notes
 * (summaries, prompts, citations…) into HTML: on a wide screen a prose column
 * with a narrower notes column beside it, each note lined up with the block it
 * covers and sticky while its section scrolls past; on a phone a bar fixed to
 * the bottom with the switches and a panel that shows the notes for the
 * section being read. `marginNotesCss` styles it and `marginNotesScript` makes
 * it interactive (switches, two-way hover, the phone panel following the
 * reader, tap to pin). Defaults are in the HTML, so the page reads correctly
 * with no JavaScript. The same layout for React apps is
 * `@molecule/app-margin-notes-react`.
 *
 * @example
 * ```typescript
 * // A static-site build step: one post page, notes from provenance + summaries.
 * import {
 *   marginNotesCss,
 *   marginNotesScriptTag,
 *   renderMarginNotes,
 *   type MarginNote,
 *   type MarginNotesBlock,
 * } from '@molecule/app-margin-notes-html'
 *
 * interface Span { text: string; origin: 'human' | 'ai'; prompt?: string; model?: string }
 *
 * // spans: one per top-level markdown block, in page order (e.g. provenance.json).
 * // summaries: TL;DR text keyed by the index of the span that starts each section.
 * // renderBlock: your markdown renderer, one block → HTML.
 * export function postBody(
 *   spans: Span[],
 *   summaries: Record<number, string>,
 *   renderBlock: (markdown: string) => string,
 * ): { body: string; switches: string } {
 *   const notes: MarginNote[] = []
 *   const promptIds = new Map<string, string>()
 *   let summaryId: string | undefined
 *   const blocks: MarginNotesBlock[] = spans.map((span, i) => {
 *     if (/^#{1,6}\s/.test(span.text) || i === 0) {
 *       // A new section: its summary covers every block until the next heading.
 *       summaryId = summaries[i] ? `summary-${i}` : undefined
 *       if (summaryId) notes.push({ id: summaryId, kind: 'summary', label: 'TL;DR', html: `<p>${summaries[i]}</p>` })
 *     }
 *     const noteIds = summaryId ? [summaryId] : []
 *     if (span.origin === 'ai' && span.prompt) {
 *       let id = promptIds.get(span.prompt)
 *       if (!id) {
 *         id = `prompt-${promptIds.size}`
 *         promptIds.set(span.prompt, id)
 *         notes.push({ id, kind: 'prompt', label: `Prompt · ${span.model ?? ''}`, html: `<p>${span.prompt}</p>` })
 *       }
 *       noteIds.push(id)
 *     }
 *     return { id: `block-${i}`, html: renderBlock(span.text), noteIds, marked: span.origin === 'ai' }
 *   })
 *   const { html, switchesHtml } = renderMarginNotes({
 *     blocks,
 *     notes,
 *     kinds: [
 *       { id: 'summary', label: 'Summaries', defaultOn: true },
 *       { id: 'prompt', label: 'Prompts', defaultOn: false, panel: 'tap' },
 *     ],
 *     markLabel: 'Written with AI',
 *   })
 *   return { body: html, switches: switchesHtml }
 * }
 *
 * // In the page template: the switches under the title, the body, then the
 * // stylesheet (once, e.g. appended to your site CSS file) and the script (once, end of <body>):
 * //   <header><h1>…</h1>${switches}</header>${body}${marginNotesScriptTag()}
 * //   fs.appendFileSync('dist/styles.css', marginNotesCss)
 * ```
 *
 * @remarks
 * - **Do NOT hand-build any of it** — no grid of your own, no hover, scroll or
 *   IntersectionObserver script, no margin dots, no bottom bar, no switch
 *   markup or toggle state. `renderMarginNotes` + `marginNotesCss` +
 *   `marginNotesScript` are all of it.
 * - **Put `switchesHtml` where the page's toggles go** (e.g. centred under the
 *   title). It is `''` when no block has a note — then there is no gutter, no
 *   bar and nothing to toggle, and the prose is centred at the reading
 *   measure. At phone width the side switches are hidden and the bar's
 *   switches are the only ones: never render a second set yourself.
 * - **Defaults live in `kinds[].defaultOn`, not in CSS or a script**: a
 *   default-off kind's notes are rendered with the `hidden` attribute and its
 *   switches read `aria-checked="false"` in the HTML.
 * - **One block per top-level markdown block** (paragraph, heading, list,
 *   code), each with a stable `id`; ONE note per prompt or per section summary,
 *   its id in the `noteIds` of every block it covers — it shows once, beside
 *   the first. Consecutive blocks with the same `noteIds` form one row.
 * - Kinds are told apart by colour alone (same font, same size): each kind
 *   gets `--mn-accent-<position>` or its own `accent`. A note's `label` is a
 *   small uppercase line above it (e.g. `TL;DR`, `Prompt · <model>`).
 * - `html` on blocks and notes is inserted as is — pass HTML from your own
 *   renderer, and escape any plain text you put in it (`escapeHtml`).
 * - Style by overriding the `--mn-*` custom properties (see `marginNotesCss`):
 *   measure, gutter, prose size, note scale, accents, and `--mn-sticky-top`
 *   (set it to your sticky header's height). The stylesheet selects on
 *   `data-mn-*` attributes only.
 * - `renderMarginNotes` runs anywhere (Node at build time, a server, a
 *   browser); the script needs a browser. UI strings (switch group, notes
 *   landmark, phone panel, "Hide notes") come from `@molecule/app-i18n` with
 *   the keys of `@molecule/app-locales-margin-notes`; kind labels, note
 *   labels and `markLabel` are yours to translate.
 * - One layout per page by default; give each an `id` if you render more.
 *
 * @module
 */

export * from './client.js'
export * from './render.js'
export * from './rows.js'
export * from './styles.js'
export * from './types.js'
