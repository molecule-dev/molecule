/**
 * `CommitCardItem` cases: the expandable, tool-call-style card a commit renders
 * in the chat timeline.
 *
 * The cases cover the three lifecycle dots (done / running / error), the label
 * that strips the co-author trailer while keeping the body, a card with and
 * without files, the file count under the label, the chevron's row-hover
 * affordance, expanding and collapsing the file list — which must sit inside the
 * card's flex row, where React renders it — the revert/redo control a done
 * commit with a hash offers (click, keyboard, hover, its in-flight wait, and the
 * coarse-pointer hit box), the commits that offer no control, and a locale
 * switch re-labelling the card and the control's tooltip.
 *
 * @module
 */

import type { CommitCard } from '@molecule/app-ide-panel-logic/panels'

import type { FeatureComponentCases } from '../../spec.js'

/** The card's row button (the only `<button>` the card renders). */
const ROW = 'button'
/** The revert/redo control beside the row (a `role="button"` span, never inside it). */
const REVERT = '[role="button"]'

/**
 * One commit card.
 *
 * @param overrides - Fields over the successful two-file commit.
 * @returns The card.
 */
const card = (overrides: Partial<CommitCard> = {}): CommitCard => ({
  id: 'c1',
  message: 'feat: add login page',
  files: ['src/Login.tsx', 'src/Footer.tsx'],
  timestamp: 1_700_000_000_000,
  status: 'done',
  hash: 'abc1234',
  ...overrides,
})

/** `CommitCardItem`. */
export const commitCardItemCases: FeatureComponentCases = {
  component: 'CommitCardItem',
  cases: [
    // ── The card at rest ────────────────────────────────────────────────────
    {
      name: 'a done commit shows its subject, file count and chevron',
      props: { card: card() },
    },
    {
      name: 'a running commit says it is committing',
      props: { card: card({ status: 'running', hash: undefined, files: ['src/Login.tsx'] }) },
    },
    {
      name: 'a failed commit shows the error dot',
      props: { card: card({ status: 'error', hash: undefined, files: [] }) },
    },
    {
      name: 'a commit with no files draws no chevron and does not expand',
      props: { card: card({ files: [], hash: undefined }) },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'an empty message renders the bare commit label',
      props: { card: card({ message: '' }) },
    },

    // ── The label ───────────────────────────────────────────────────────────
    {
      name: 'the label strips the co-author trailer but keeps the body',
      props: {
        card: card({
          message:
            'feat: add login page\n\nWires the OAuth callback.\n\nCo-authored-by: Synthase <synthase@molecule.dev>',
        }),
      },
    },

    // ── Expanding the file list ─────────────────────────────────────────────
    {
      name: 'expanding the card lists each file inside the flex row',
      props: { card: card() },
      interactions: [{ type: 'click', selector: ROW }],
    },
    {
      name: 'expanding and collapsing hides the file list again',
      props: { card: card() },
      interactions: [
        { type: 'click', selector: ROW },
        { type: 'click', selector: ROW },
      ],
    },

    // ── Hover affordances ───────────────────────────────────────────────────
    {
      name: 'hovering the row raises the chevron until the pointer leaves',
      props: { card: card() },
      interactions: [
        { type: 'mouseenter', selector: ROW },
        { type: 'mouseleave', selector: ROW },
      ],
    },

    // ── The revert control ──────────────────────────────────────────────────
    {
      name: 'a done commit with a hash offers its revert control',
      props: { card: card() },
      callbacks: ['onRevert'],
    },
    {
      name: 'a running commit offers no revert control',
      props: { card: card({ status: 'running' }) },
      callbacks: ['onRevert'],
    },
    {
      name: 'a done commit with no hash offers no revert control',
      props: { card: card({ hash: undefined }) },
      callbacks: ['onRevert'],
    },
    {
      name: 'clicking revert applies it and the control becomes redo',
      props: { card: card() },
      callbacks: ['onRevert'],
      callbackResults: { onRevert: { resolve: 'def5678' } },
      interactions: [{ type: 'click', selector: REVERT }],
    },
    {
      name: 'clicking redo re-applies the commit after a revert',
      props: { card: card() },
      callbacks: ['onRevert'],
      callbackResults: { onRevert: { resolve: 'def5678' } },
      interactions: [
        { type: 'click', selector: REVERT },
        { type: 'click', selector: REVERT },
      ],
    },
    {
      name: 'Enter and Space work the revert control',
      props: { card: card() },
      callbacks: ['onRevert'],
      callbackResults: { onRevert: { resolve: 'def5678' } },
      interactions: [
        { type: 'keydown', selector: REVERT, key: 'Enter' },
        { type: 'keydown', selector: REVERT, key: ' ' },
      ],
    },
    {
      name: 'an in-flight revert waits and then becomes redo',
      props: { card: card() },
      callbacks: ['onRevert'],
      callbackResults: { onRevert: { defer: true } },
      interactions: [
        { type: 'click', selector: REVERT },
        { type: 'settle', callback: 'onRevert', value: 'def5678' },
      ],
    },
    {
      name: 'hovering the revert control tints it until the pointer leaves',
      props: { card: card() },
      callbacks: ['onRevert'],
      interactions: [
        { type: 'mouseenter', selector: ROW },
        { type: 'mouseenter', selector: REVERT },
        { type: 'mouseleave', selector: REVERT },
      ],
    },
    {
      name: 'a coarse pointer gives the revert control a 32px box',
      props: { card: card() },
      callbacks: ['onRevert'],
      pointer: 'coarse',
    },

    // ── Locale ──────────────────────────────────────────────────────────────
    {
      name: 'a locale switch re-labels the card and the revert tooltip',
      props: { card: card({ files: ['src/Login.tsx'] }) },
      callbacks: ['onRevert'],
      context: {
        translations: {
          fr: {
            ide: {
              chat: {
                commitLabel: 'Valider',
                committing: 'Validation…',
                fileCount: '{{count}} fichier(s)',
                revertCommit: 'Rétablir ce commit',
                redoCommit: 'Réappliquer ce commit',
              },
            },
          },
        },
      },
      interactions: [
        { type: 'mouseenter', selector: ROW },
        { type: 'locale', locale: 'fr' },
      ],
    },
  ],
}
