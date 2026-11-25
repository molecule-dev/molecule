/**
 * `@molecule/app-margin-notes-react` cases: the reading layout — rows that
 * pair a run of blocks with the notes shown beside it, the two-way hover and
 * focus relationship, the per-kind switches (uncontrolled and controlled), the
 * margin mark, the phone bar's panel and pin/dismiss buttons, the notes that
 * follow the reader, and every default (`measure`, `gutterWidth`, which kinds
 * show, a document with no notes).
 *
 * Each block's rendered content and each note's body are node values, so the
 * same document renders through every framework's own node type. The three
 * pure exports (`buildRows`, `mergeRepeatedNotes`, `defaultShownKinds`) are
 * compared by value over plain data.
 *
 * @module
 */

import type { Interaction } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** A block's rendered content: a paragraph of plain text. */
const para = (text: string): Record<string, unknown> => ({
  $nodes: [{ tag: 'p', children: [text] }],
})

/** A note body: two paragraphs, the first a label. */
const noteBody = (label: string, text: string): Record<string, unknown> => ({
  $nodes: [
    { tag: 'p', children: [label] },
    { tag: 'p', children: [text] },
  ],
})

/**
 * One configured block of the text.
 *
 * @param id - The block's stable id.
 * @param text - Its paragraph's text.
 * @param extra - `noteIds` / `marked`, when set.
 * @returns The block.
 */
const block = (
  id: string,
  text: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id,
  content: para(text),
  ...extra,
})

/** The switchable kinds: a section summary (on by default) and a paragraph prompt (off, tap). */
const kinds = [
  { id: 'summary', label: 'Summaries', defaultOn: true },
  { id: 'prompt', label: 'Prompts', defaultOn: false, panel: 'tap' },
]

/** A third kind with every default: shown, and following the reader in the phone panel. */
const asideKind = { id: 'aside', label: 'Asides' }

/** The annotated document: one section (a summary over three paragraphs) and a closing paragraph. */
const doc = {
  blocks: [
    block('p1', 'Human opening paragraph.', { noteIds: ['s1'] }),
    block('p2', 'An AI-written paragraph.', { noteIds: ['s1', 'q1'], marked: true }),
    block('p3', 'Another AI paragraph, same prompt.', { noteIds: ['s1', 'q1'], marked: true }),
    block('p4', 'Closing words.'),
  ],
  notes: [
    { id: 's1', kind: 'summary', content: noteBody('SUMMARY-ONE', 'The section, in a line.') },
    { id: 'q1', kind: 'prompt', content: noteBody('PROMPT-ONE', 'Write the second paragraph.') },
  ],
}

/** Two annotated sections, so the phone panel has a later noted row to reach. */
const twoSections = {
  blocks: [
    block('h1', 'First section', { noteIds: ['s1'] }),
    block('a1', 'First body.', { noteIds: ['s1'] }),
    block('h2', 'Second section', { noteIds: ['s2'] }),
    block('b1', 'Second body.', { noteIds: ['s2', 'q2'], marked: true }),
  ],
  notes: [
    { id: 's1', kind: 'summary', content: 'FIRST-SUMMARY' },
    { id: 's2', kind: 'summary', content: 'SECOND-SUMMARY' },
    { id: 'q2', kind: 'prompt', content: 'SECOND-PROMPT' },
  ],
}

/** The selectors the interactions use. */
const sidePrompt = '[data-mol-id="margin-notes-switch-side-prompt"]'
const sideSummary = '[data-mol-id="margin-notes-switch-side-summary"]'
const barPrompt = '[data-mol-id="margin-notes-switch-bar-prompt"]'
const barSummary = '[data-mol-id="margin-notes-switch-bar-summary"]'
const pinP2 = '[data-mol-id="margin-notes-pin-p2"]'
const dismiss = '[data-mol-id="margin-notes-dismiss"]'
const noteQ1 = '[data-mol-id="margin-note-gutter-q1"]'
const noteS1 = '[data-mol-id="margin-note-gutter-s1"]'
const blockP2 = '[data-mol-id="margin-notes-block-p2"]'
const blockP1 = '[data-mol-id="margin-notes-block-p1"]'

/** The plain-data blocks the value checks call the pure functions with. */
const plainBlocks = [
  { id: 'p1', content: 'one', noteIds: ['s', 'q1'] },
  { id: 'p2', content: 'two', noteIds: ['s', 'q1'] },
  { id: 'p3', content: 'three', noteIds: ['t'] },
  { id: 'p4', content: 'four' },
]

/** The plain-data notes those blocks refer to. */
const plainNotes = [
  { id: 's', kind: 'summary', content: 'Section summary' },
  { id: 't', kind: 'summary', content: 'Trailing summary' },
  { id: 'q1', kind: 'prompt', content: 'Write the intro' },
  { id: 'q2', kind: 'prompt', content: 'Write the intro' },
]

/** `@molecule/app-margin-notes-react`. */
export const marginNotesFeature: FeatureCases = {
  package: '@molecule/app-margin-notes-react',
  values: [
    {
      export: 'buildRows',
      calls: [
        // Shared notes hold a row together; each note appears once, in its first row.
        [plainBlocks, plainNotes],
        // A repeated plain-text note collapses into the first copy (one prompt, one row).
        [[plainBlocks[0], { id: 'p9', content: 'nine', noteIds: ['q2'] }], plainNotes],
        // No notes at all: every block is its own row.
        [plainBlocks, []],
        // Note order is irrelevant; ids with no note are ignored.
        [[{ id: 'a', content: 'a', noteIds: ['q1', 's', 'ghost'] }], plainNotes],
      ],
    },
    {
      export: 'mergeRepeatedNotes',
      calls: [
        // The same plain-text note on consecutive blocks points every later block at the first.
        [
          [
            { id: 'a', content: 'a', noteIds: ['q1'] },
            { id: 'b', content: 'b', noteIds: ['q2'] },
          ],
          plainNotes,
        ],
        // The same text again after a different note is a new act and keeps its own note.
        [
          [
            { id: 'a', content: 'a', noteIds: ['q1'] },
            { id: 'b', content: 'b', noteIds: ['s'] },
            { id: 'c', content: 'c', noteIds: ['q2'] },
          ],
          plainNotes,
        ],
        [plainBlocks, plainNotes],
      ],
    },
    {
      export: 'defaultShownKinds',
      calls: [
        [],
        [[{ id: 'summary', defaultOn: true }, { id: 'prompt', defaultOn: false }, asideKind]],
      ],
    },
  ],
  families: [
    {
      component: 'MarginNotes',
      cases: [
        {
          name: 'defaults: a summary on, a prompt off, a mark on the AI paragraphs',
          props: { blocks: doc.blocks, notes: doc.notes, kinds, markLabel: 'Written with AI' },
        },
        {
          name: 'a document with no notes is centred prose: no gutter, switches or bar',
          props: { blocks: [block('only', 'Only prose.')] },
        },
        {
          name: 'an empty document renders its empty frame',
          props: { blocks: [] },
        },
        {
          name: 'notes without kinds: a gutter and a bar, no switches',
          props: { blocks: doc.blocks, notes: doc.notes, markLabel: 'Written with AI' },
        },
        {
          name: 'kinds without notes: neither switches nor a bar',
          props: { blocks: [block('only', 'Only prose.')], kinds },
        },
        {
          name: 'a kind with no defaultOn shows before the reader touches it',
          props: { blocks: doc.blocks, notes: doc.notes, kinds: [...kinds, asideKind] },
        },
        {
          name: 'custom measure and gutter width',
          props: {
            blocks: doc.blocks,
            notes: doc.notes,
            kinds,
            measure: '30rem',
            gutterWidth: '14rem',
          },
        },
        {
          name: 'className and style passthrough',
          props: {
            blocks: doc.blocks,
            notes: doc.notes,
            kinds,
            className: 'parity-token',
            style: { background: 'red', color: 'blue' },
          },
        },
        {
          name: 'id and aria-label passthrough',
          props: {
            blocks: doc.blocks,
            notes: doc.notes,
            kinds,
            id: 'essay',
            'aria-label': 'An annotated essay',
          },
        },
        {
          name: 'consecutive blocks without notes share one row',
          props: {
            blocks: [
              block('a', 'One'),
              block('b', 'Two'),
              block('c', 'Three', { noteIds: ['s1'] }),
              block('d', 'Four'),
            ],
            notes: [{ id: 's1', kind: 'summary', content: 'ABOUT THREE' }],
          },
        },
        {
          name: 'one prompt written for two consecutive paragraphs shows once',
          props: {
            blocks: [
              block('a', 'First AI paragraph.', { noteIds: ['qa'], marked: true }),
              block('b', 'Second AI paragraph.', { noteIds: ['qb'], marked: true }),
            ],
            notes: [
              { id: 'qa', kind: 'prompt', content: 'Write both paragraphs' },
              { id: 'qb', kind: 'prompt', content: 'Write both paragraphs' },
            ],
            kinds,
          },
        },
        {
          name: 'a note id with no note still makes its block interactive',
          props: {
            blocks: [block('a', 'A paragraph with a ghost note.', { noteIds: ['ghost'] })],
            notes: [],
            kinds,
          },
        },
        {
          name: 'two annotated sections: the phone panel starts on the later noted section',
          props: {
            blocks: twoSections.blocks,
            notes: twoSections.notes,
            kinds,
            markLabel: 'Written with AI',
          },
        },
        {
          name: 'the mark is drawn on marked blocks only',
          props: {
            blocks: [
              block('m', 'A marked paragraph.', { marked: true }),
              block('u', 'An unmarked paragraph.'),
            ],
            markLabel: 'Written with AI',
          },
        },
        {
          name: 'a marked block without a mark label hides its mark from assistive technology',
          props: { blocks: [block('m', 'A marked paragraph.', { marked: true })] },
        },
        {
          name: 'clicking a switch shows and hides its kind in the gutter',
          props: { blocks: doc.blocks, notes: doc.notes, kinds },
          interactions: [
            { type: 'click', selector: sidePrompt },
            { type: 'click', selector: sideSummary },
          ],
        },
        {
          name: 'the phone bar switch toggles the same kind',
          props: { blocks: doc.blocks, notes: doc.notes, kinds },
          interactions: [
            { type: 'click', selector: barPrompt },
            { type: 'click', selector: barPrompt },
          ],
        },
        {
          name: 'clicking a hidden kind switch twice returns to the start',
          props: { blocks: doc.blocks, notes: doc.notes, kinds },
          interactions: [
            { type: 'click', selector: sideSummary },
            { type: 'click', selector: sideSummary },
            { type: 'click', selector: sidePrompt },
          ],
        },
        {
          name: 'hovering a block emphasises its notes, and leaving clears it',
          props: { blocks: doc.blocks, notes: doc.notes, kinds },
          interactions: [
            { type: 'mouseenter', selector: blockP2 },
            { type: 'mouseleave', selector: blockP2 },
          ],
        },
        {
          name: 'hovering a note tints the blocks it covers, and leaving clears it',
          props: { blocks: doc.blocks, notes: doc.notes, kinds },
          interactions: [
            { type: 'mouseenter', selector: noteQ1 },
            { type: 'mouseleave', selector: noteQ1 },
          ],
        },
        {
          name: 'touch and its compatibility mouse events do not hover a block or note',
          props: {
            blocks: [block('p2', 'Annotated paragraph.', { noteIds: ['q1'] })],
            notes: [{ id: 'q1', kind: 'prompt', content: 'Write the paragraph.' }],
          },
          interactions: [blockP2, noteQ1].flatMap((selector): Interaction[] => [
            { type: 'pointer', selector, event: 'pointerover', pointerType: 'touch' },
            { type: 'pointer', selector, event: 'pointerout', pointerType: 'touch' },
            { type: 'event', selector, event: 'mouseover', bubbles: true },
            { type: 'event', selector, event: 'mouseenter' },
            { type: 'event', selector, event: 'mouseout', bubbles: true },
            { type: 'event', selector, event: 'mouseleave' },
            { type: 'pointer', selector, event: 'pointerover', pointerType: 'mouse' },
            { type: 'mouseenter', selector },
            { type: 'pointer', selector, event: 'pointerout', pointerType: 'mouse' },
            { type: 'mouseleave', selector },
          ]),
        },
        {
          name: 'focusing a note tints its blocks and blur clears it',
          props: { blocks: doc.blocks, notes: doc.notes, kinds },
          interactions: [
            { type: 'focus', selector: noteS1 },
            { type: 'blur', selector: noteS1 },
          ],
        },
        {
          name: 'focusing a block emphasises its notes and blur clears it',
          props: { blocks: doc.blocks, notes: doc.notes, kinds },
          interactions: [
            { type: 'focus', selector: blockP1 },
            { type: 'blur', selector: blockP1 },
          ],
        },
        {
          name: 'hovering a block with no notes does nothing',
          props: { blocks: doc.blocks, notes: doc.notes, kinds },
          interactions: [
            { type: 'mouseenter', selector: '[data-mol-id="margin-notes-block-p4"]' },
            { type: 'mouseleave', selector: '[data-mol-id="margin-notes-block-p4"]' },
          ],
        },
        {
          name: 'the pin pins a block’s notes and a second press lets go',
          props: { blocks: doc.blocks, notes: doc.notes, kinds },
          interactions: [
            { type: 'click', selector: pinP2 },
            { type: 'click', selector: pinP2 },
          ],
        },
        {
          name: 'the dismiss button clears a pin',
          props: { blocks: doc.blocks, notes: doc.notes, kinds },
          interactions: [
            { type: 'click', selector: pinP2 },
            { type: 'click', selector: dismiss },
          ],
        },
        {
          name: 'a pin shows a tap-kind note while its switch is off',
          props: { blocks: doc.blocks, notes: doc.notes, kinds },
          interactions: [{ type: 'click', selector: pinP2 }],
        },
        {
          name: 'a pinned follow-kind note still obeys its switch',
          props: { blocks: doc.blocks, notes: doc.notes, kinds },
          interactions: [
            { type: 'click', selector: barSummary },
            { type: 'click', selector: pinP2 },
          ],
        },
        {
          name: 'a tap kind switched on follows the reader without a pin',
          props: { blocks: doc.blocks, notes: doc.notes, kinds },
          interactions: [{ type: 'click', selector: barPrompt }],
        },
        {
          name: 'a controlled shownKinds reports the next list on a switch click',
          props: {
            blocks: doc.blocks,
            notes: doc.notes,
            kinds,
            shownKinds: ['prompt'],
          },
          callbacks: ['onShownKindsChange'],
          interactions: [{ type: 'click', selector: sideSummary }],
        },
        {
          name: 'a controlled shownKinds follows its prop',
          props: {
            blocks: doc.blocks,
            notes: doc.notes,
            kinds,
            shownKinds: ['prompt'],
          },
          callbacks: ['onShownKindsChange'],
          interactions: [
            { type: 'props', props: { shownKinds: ['summary'] } },
            { type: 'props', props: { shownKinds: [] } },
          ],
        },
        {
          name: 'a controlled switch click without a callback is harmless',
          props: {
            blocks: doc.blocks,
            notes: doc.notes,
            kinds,
            shownKinds: ['summary'],
          },
          interactions: [{ type: 'click', selector: sidePrompt }],
        },
        {
          name: 'blocks, notes, kinds and labels change after mount',
          props: { blocks: doc.blocks, notes: doc.notes, kinds, markLabel: 'Written with AI' },
          interactions: [
            {
              type: 'props',
              props: {
                blocks: [block('x', 'A different paragraph.', { noteIds: ['sx'], marked: true })],
                notes: [{ id: 'sx', kind: 'summary', content: 'A DIFFERENT NOTE' }],
                kinds: [{ id: 'summary', label: 'TL;DRs', defaultOn: true }],
                markLabel: 'Made with AI',
              },
            },
            { type: 'props', props: { notes: [], kinds: [] } },
          ],
        },
        {
          name: 'the measure changes after mount',
          props: { blocks: doc.blocks, notes: doc.notes, kinds, measure: '38rem' },
          interactions: [{ type: 'props', props: { measure: '24rem' } }],
        },
        {
          name: 'a locale switch re-translates the built-in strings',
          props: { blocks: doc.blocks, notes: doc.notes, kinds },
          context: {
            translations: {
              'en-XA': {
                marginNotes: {
                  aria: {
                    pin: 'PIN-TRANSLATED',
                    notes: 'NOTES-TRANSLATED',
                    toggles: 'TOGGLES-TRANSLATED',
                    panel: 'PANEL-TRANSLATED',
                  },
                  dismiss: 'DISMISS-TRANSLATED',
                },
              },
            },
          },
          interactions: [{ type: 'locale', locale: 'en-XA' }],
        },
      ],
    },
  ],
}
