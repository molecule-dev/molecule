/**
 * Margin notes: long-form text with notes beside each paragraph — annotated
 * essays, commentary, and posts that show which paragraphs an AI wrote and the
 * prompt behind each.
 *
 * Desktop: a large-type prose column and a narrower notes column to its right;
 * each note lines up with the paragraph (or run of paragraphs) it belongs to
 * and appears once. Hovering or focusing a paragraph emphasises its notes;
 * hovering or focusing a note tints the paragraphs it covers. A paragraph can
 * carry a small mark in its left margin. Note kinds (say, "Summaries" and
 * "Prompts") each get a real switch. Phone: the notes column gives way to a bar
 * fixed to the bottom that shows the notes for the section being read and
 * follows the reader; tapping a paragraph pins its notes, tapping again lets
 * go; the switches live in the bar. A document with no notes renders centred
 * prose at full measure with no notes column, no switches and no bar.
 *
 * The example is a complete static-site post body: it takes the post's
 * `provenance.json` (written at build time by `@molecule/api-text-provenance`,
 * whose example produces exactly this shape) and a TL;DR per section, and
 * renders every block with a summary beside its section (switch ON), the prompt
 * beside the AI paragraphs it wrote (switch OFF), a margin mark on each AI
 * paragraph, the AI-share line, and the phone bar — all correct in the
 * prerendered HTML before any JavaScript runs.
 *
 * @example
 * ```tsx
 * // PostBody.tsx — a post's body with notes beside it, rendered from the post's provenance.json
 * // (written at build time by @molecule/api-text-provenance) and its section summaries.
 * import type { JSX } from 'react'
 *
 * import {
 *   type MarginNote,
 *   type MarginNoteKind,
 *   MarginNotes,
 *   type MarginNotesBlock,
 * } from '@molecule/app-margin-notes-react'
 * import { requireProvider } from '@molecule/app-markdown'
 * import { useTranslation } from '@molecule/app-react'
 * import { getClassMap } from '@molecule/app-ui'
 *
 * // One entry of provenance.json's `spans`: a block of the post's markdown, in page order.
 * export interface PostSpan {
 *   text: string
 *   origin: 'human' | 'ai'
 *   prompt?: string
 *   model?: string
 * }
 *
 * // provenance.json, as the build wrote it.
 * export interface PostProvenance {
 *   aiShare: number
 *   prompts: string[]
 *   spans: PostSpan[]
 * }
 *
 * // The span indexes that start a section: 0 (the lead), then every heading at the post's
 * // shallowest heading level. Key your summaries by these indexes.
 * export function sectionStarts(spans: PostSpan[]): number[] {
 *   const level = (text: string): number => /^(#{1,6})\s/.exec(text)?.[1].length ?? 0
 *   const top = Math.min(...spans.map((span) => level(span.text) || 7))
 *   return spans.flatMap((span, i) => (i === 0 || level(span.text) === top ? [i] : []))
 * }
 *
 * // summaries: TL;DR text per section, keyed by the section's start index from sectionStarts().
 * export function PostBody({
 *   provenance,
 *   summaries = {},
 * }: {
 *   provenance: PostProvenance
 *   summaries?: Record<number, string>
 * }): JSX.Element {
 *   const cm = getClassMap()
 *   const { t } = useTranslation()
 *   const markdown = requireProvider()
 *   const label = cm.cn(cm.textSize('xs'), cm.uppercase, cm.trackingWide, cm.fontWeight('semibold'))
 *   const starts = new Set(sectionStarts(provenance.spans))
 *   const notes: MarginNote[] = []
 *   const promptNoteIds = new Map<string, string>()
 *   let summaryId: string | undefined
 *
 *   const blocks: MarginNotesBlock[] = provenance.spans.map((span, i) => {
 *     if (starts.has(i)) {
 *       summaryId = summaries[i] ? `summary-${i}` : undefined
 *       if (summaryId) {
 *         notes.push({
 *           id: summaryId,
 *           kind: 'summary',
 *           content: (
 *             <>
 *               <p className={label}>{t('post.tldr', undefined, { defaultValue: 'TL;DR' })}</p>
 *               <p>{summaries[i]}</p>
 *             </>
 *           ),
 *         })
 *       }
 *     }
 *     const noteIds = summaryId ? [summaryId] : []
 *     if (span.origin === 'ai' && span.prompt) {
 *       let id = promptNoteIds.get(span.prompt)
 *       if (!id) {
 *         id = `prompt-${promptNoteIds.size}`
 *         promptNoteIds.set(span.prompt, id)
 *         notes.push({
 *           id,
 *           kind: 'prompt',
 *           content: (
 *             <>
 *               <p className={cm.cn(label, cm.textPrimary)}>
 *                 {t(
 *                   'post.promptBy',
 *                   { model: span.model ?? '' },
 *                   { defaultValue: 'Prompt · {{model}}' },
 *                 )}
 *               </p>
 *               <p className={cm.textPrimary}>{span.prompt}</p>
 *             </>
 *           ),
 *         })
 *       }
 *       noteIds.push(id)
 *     }
 *     return {
 *       id: `block-${i}`,
 *       content: <div dangerouslySetInnerHTML={{ __html: markdown.render(span.text).html }} />,
 *       noteIds,
 *       marked: span.origin === 'ai',
 *     }
 *   })
 *
 *   const kinds: MarginNoteKind[] = [
 *     {
 *       id: 'summary',
 *       label: t('post.summaries', undefined, { defaultValue: 'Summaries' }),
 *       defaultOn: true,
 *     },
 *     {
 *       id: 'prompt',
 *       label: t('post.prompts', undefined, { defaultValue: 'Prompts' }),
 *       defaultOn: false,
 *       panel: 'tap',
 *     },
 *   ]
 *   const percent = Math.round(provenance.aiShare * 100)
 *   const count = provenance.prompts.length
 *   const share =
 *     count === 0
 *       ? t('post.allHuman', undefined, {
 *           defaultValue: 'Every word of this post was written by a person.',
 *         })
 *       : t(
 *           count === 1 ? 'post.aiShareOne' : 'post.aiShare',
 *           { percent, count },
 *           {
 *             defaultValue:
 *               count === 1
 *                 ? '{{percent}}% of the words were written by an AI, from 1 prompt'
 *                 : '{{percent}}% of the words were written by an AI, from {{count}} prompts',
 *           },
 *         )
 *
 *   return (
 *     <div className={cm.prose}>
 *       <p
 *         className={cm.cn(cm.textCenter, cm.textMuted, cm.textSize('sm'))}
 *         data-mol-id="post-ai-share"
 *       >
 *         {share}
 *       </p>
 *       <MarginNotes
 *         blocks={blocks}
 *         notes={notes}
 *         kinds={kinds}
 *         markLabel={t('post.aiWritten', undefined, { defaultValue: 'Written with AI' })}
 *       />
 *     </div>
 *   )
 * }
 *
 * // In the Post page, in place of the single dangerouslySetInnerHTML body:
 * // <PostBody provenance={post.provenance} summaries={post.summaries} />
 * ```
 *
 * @remarks
 * - **Do NOT hand-build an annotator** — no grid of your own, no hover or
 *   scroll script, no margin dots, no bottom bar, no toggle state. This
 *   component is all of it: pass `blocks`, `notes` and `kinds`.
 * - **Do NOT set the defaults in a `useEffect` or hide notes with your own
 *   CSS.** `kinds[].defaultOn` is read in the FIRST render, so
 *   `renderToString`/prerender already ships a default-off kind with the HTML
 *   `hidden` attribute and its switch reading off; the desktop/phone split is
 *   CSS (`cm.hiddenBelow('md')` / `cm.hiddenFrom('md')`).
 * - **Do NOT render the body as one HTML string.** Pass one block per
 *   top-level markdown block (paragraph, heading, list, code), each with a
 *   stable `id` — the example renders each provenance span with
 *   `@molecule/app-markdown`. The component adds no markup inside a block.
 * - **Do NOT make one note per paragraph.** Make ONE note per prompt (or per
 *   section summary) and put its id in the `noteIds` of every block it covers:
 *   it shows once, beside the first. Consecutive blocks with the same
 *   `noteIds` form one row.
 * - **Do NOT add a second copy of the notes for phones** (inline between
 *   paragraphs, a popover). The bar is the phone's copy.
 * - **Do NOT import `@molecule/api-*` packages into the page** — they are
 *   server-only. The page reads what the build wrote (`provenance.json`, or
 *   spans passed to the prerender).
 * - The example needs `@molecule/app-markdown` and a markdown bond
 *   (`@molecule/app-markdown-marked`), bonded once at startup:
 *   `setProvider(provider)`.
 * - Section notes follow the reader; paragraph notes wait for a tap. On a
 *   phone the panel shows the kinds with `panel: 'follow'` (the default) for
 *   the section in view. A kind about ONE paragraph (a prompt, a citation)
 *   gets `panel: 'tap'`: it shows when that paragraph is tapped — even while
 *   its switch is off — and goes on the second tap.
 * - The mark is drawn on the block, as an absolutely-placed dot inside the
 *   block's own wrapper (hidden on phones). At rest a marked block is typeset
 *   exactly like an unmarked one.
 * - Controlled or not: pass `shownKinds` + `onShownKindsChange` to own the
 *   switches' state (e.g. to remember it); otherwise the component does.
 * - The phone bar reserves space at the end of the text so it never covers the
 *   last paragraph. UI strings come from the companion locale bond
 *   `@molecule/app-locales-margin-notes`; kind labels and `markLabel` are
 *   yours to translate.
 *
 * @module
 */

export * from './MarginNotes.js'
export * from './rows.js'
export * from './types.js'
