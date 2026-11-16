/**
 * `@molecule/app-feature-chapter-list-react` cases: the chapter rows — the
 * optional thumbnail, the title, the formatted timestamp, the "Now playing"
 * badge and `aria-current` on the active chapter, the seek button versus the
 * static row, the empty-state region, the translated region/seek/thumbnail
 * labels, the `rowTrailing` render function, and the two exported helpers
 * (`formatTimestamp`, `findActiveChapterIndex`).
 *
 * `rowTrailing` is a render function (`chapter` → node), so a case passes
 * `{ $fn, nodes }`, whose text and attributes interpolate `{0}` (the chapter).
 *
 * No case pins `now`: every timestamp is an absolute offset, so the rendered
 * text does not depend on the day the case runs.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** One chapter: a stable id, a title and a start offset in seconds. */
const chapter = (
  id: string,
  title: string,
  startTime: number,
  thumbnail?: string,
): { id: string; title: string; startTime: number; thumbnail?: string } =>
  thumbnail === undefined ? { id, title, startTime } : { id, title, startTime, thumbnail }

/** React's own four-chapter list: two with a thumbnail, one past the hour mark. */
const BASE = [
  chapter('c1', 'Intro', 0, 'https://example.test/a.jpg'),
  chapter('c2', 'Topic A', 120),
  chapter('c3', 'Topic B', 600, 'https://example.test/b.jpg'),
  chapter('c4', 'Outro', 3725),
]

/** A list whose start times are not ascending, so the helper's `break` is pinned. */
const UNSORTED = [chapter('a', 'Alpha', 0), chapter('b', 'Beta', 100), chapter('c', 'Gamma', 50)]

/** One chapter, so the first row is also the last and the active one. */
const SINGLE = [chapter('only', 'Only chapter', 30)]

/** React's `rowTrailing(chapter)` renderer: a trailing span carrying the chapter id. */
const rowTrailing = {
  $fn: 'rowTrailing',
  nodes: [
    {
      tag: 'span',
      attrs: { 'data-mol-id': 'custom-trailing', 'data-chapter': '{0.id}' },
      children: ['{0.title}'],
    },
  ],
}

/** The seek button of the row with this chapter id. */
const rowButton = (id: string): string => `li[data-chapter-id="${id}"] button`

/** The static row body of the row with this chapter id. */
const staticRow = (id: string): string =>
  `li[data-chapter-id="${id}"] [data-mol-id="chapter-list-row-static"]`

/** `@molecule/app-feature-chapter-list-react`. */
export const featureChapterListFeature: FeatureCases = {
  package: '@molecule/app-feature-chapter-list-react',
  families: [
    {
      component: 'ChapterList',
      cases: [
        // The default path: rows with and without thumbnails, an active row
        // inside the second chapter, and a click handler on every row.
        {
          name: 'chapters with thumbnails and an active row',
          props: { chapters: BASE, currentTime: 150 },
          callbacks: ['onSeek'],
        },
        // The active index derived from `currentTime`: before the first
        // chapter, exactly on the first, on boundaries, and past the end.
        {
          name: 'no chapter is active before the first chapter',
          props: { chapters: BASE, currentTime: -5 },
          callbacks: ['onSeek'],
        },
        {
          name: 'the first chapter is active at time zero',
          props: { chapters: BASE, currentTime: 0 },
          callbacks: ['onSeek'],
        },
        {
          name: 'the active chapter changes on an exact boundary',
          props: { chapters: BASE, currentTime: 119 },
          callbacks: ['onSeek'],
          interactions: [{ type: 'props', props: { currentTime: 120 } }],
        },
        {
          name: 'the last chapter stays active past the end',
          props: { chapters: BASE, currentTime: 99_999 },
          callbacks: ['onSeek'],
        },
        {
          name: 'one chapter is active from its start time on',
          props: { chapters: SINGLE, currentTime: 30 },
          callbacks: ['onSeek'],
        },
        // No `onSeek`: the rows render as static, non-interactive elements.
        {
          name: 'static rows when onSeek is absent',
          props: { chapters: BASE, currentTime: 600 },
        },
        {
          name: 'static rows mark the active chapter with aria-current',
          props: { chapters: BASE, currentTime: 150 },
          interactions: [{ type: 'props', props: { currentTime: 0 } }],
        },
        // Every seek button reports its own chapter's start time.
        {
          name: 'clicking every row seeks to that chapter',
          props: { chapters: BASE, currentTime: 0 },
          callbacks: ['onSeek'],
          interactions: [
            { type: 'click', selector: rowButton('c1') },
            { type: 'click', selector: rowButton('c2') },
            { type: 'click', selector: rowButton('c3') },
            { type: 'click', selector: rowButton('c4') },
          ],
        },
        {
          name: 'clicking the active row seeks to it again',
          props: { chapters: BASE, currentTime: 150 },
          callbacks: ['onSeek'],
          interactions: [{ type: 'click', selector: rowButton('c2') }],
        },
        {
          name: 'clicking a static row seeks nothing',
          props: { chapters: BASE, currentTime: 0 },
          interactions: [
            { type: 'click', selector: staticRow('c1') },
            { type: 'click', selector: staticRow('c4') },
          ],
        },
        // `onSeek` comes and goes: the row element itself changes.
        {
          name: 'onSeek removed after mount turns the rows static',
          // The handler is a prop (not a `callbacks` entry), so a later `props`
          // step can take it away again.
          props: { chapters: BASE, currentTime: 0, onSeek: { $callback: 'onSeek' } },
          interactions: [
            { type: 'click', selector: rowButton('c3') },
            { type: 'props', props: { onSeek: undefined } },
          ],
        },
        {
          name: 'onSeek added after mount turns the rows into buttons',
          props: { chapters: BASE, currentTime: 0 },
          interactions: [
            { type: 'props', props: { onSeek: { $callback: 'onSeek' } } },
            { type: 'click', selector: rowButton('c2') },
          ],
        },
        // The trailing render function, and its removal.
        {
          name: 'rowTrailing renders a trailing node per chapter',
          props: { chapters: BASE, currentTime: 150, rowTrailing },
          callbacks: ['onSeek'],
        },
        {
          name: 'rowTrailing without a thumbnail separates the two slots',
          props: { chapters: SINGLE, currentTime: 0, rowTrailing },
          callbacks: ['onSeek'],
        },
        {
          name: 'rowTrailing removed after mount drops the trailing slot',
          props: { chapters: BASE, currentTime: 150, rowTrailing },
          callbacks: ['onSeek'],
          interactions: [{ type: 'props', props: { rowTrailing: undefined } }],
        },
        {
          name: 'rowTrailing added after mount fills the trailing slot',
          props: { chapters: BASE, currentTime: 150 },
          callbacks: ['onSeek'],
          interactions: [{ type: 'props', props: { rowTrailing } }],
        },
        // className passthrough on both roots, and a change.
        {
          name: 'className on the populated list root',
          props: { chapters: BASE, currentTime: 0, className: 'parity-token' },
          callbacks: ['onSeek'],
          interactions: [{ type: 'props', props: { className: 'parity-other' } }],
        },
        {
          name: 'className on the empty region root',
          props: { chapters: [], currentTime: 0, className: 'parity-token' },
        },
        // The empty-state branch, and the array coming and going.
        { name: 'no chapters renders the empty region', props: { chapters: [], currentTime: 0 } },
        {
          name: 'chapters change from filled to empty',
          props: { chapters: BASE, currentTime: 150 },
          callbacks: ['onSeek'],
          interactions: [{ type: 'props', props: { chapters: [] } }],
        },
        {
          name: 'chapters change from empty to filled',
          props: { chapters: [], currentTime: 0 },
          interactions: [{ type: 'props', props: { chapters: SINGLE } }],
        },
        {
          name: 'new chapters re-render the rows',
          props: { chapters: BASE, currentTime: 0 },
          callbacks: ['onSeek'],
          interactions: [
            {
              type: 'props',
              props: {
                chapters: [chapter('x1', 'Fresh one', 0), chapter('x2', 'Fresh two', 90)],
                currentTime: 90,
              },
            },
          ],
        },
        // The hour-and-over timestamp format inside a row.
        {
          name: 'an hour-long chapter shows h:mm:ss',
          props: { chapters: [chapter('long', 'Marathon', 7325)], currentTime: 7325 },
          callbacks: ['onSeek'],
        },
        // Every visible string comes from the literal i18n keys.
        {
          name: 'labels follow a locale switch',
          props: { chapters: BASE, currentTime: 150, rowTrailing },
          callbacks: ['onSeek'],
          context: {
            translations: {
              fr: {
                chapterList: {
                  aria: {
                    region: 'Chapitres',
                    seek: 'Aller à {{title}} à {{timestamp}}',
                    thumbnail: 'Vignette de {{title}}',
                  },
                  empty: 'Aucun chapitre pour cet épisode.',
                  current: 'En cours',
                },
              },
            },
          },
          interactions: [{ type: 'locale', locale: 'fr' }],
        },
        {
          name: 'the empty-state message follows a locale switch',
          props: { chapters: [], currentTime: 0 },
          context: {
            translations: {
              de: { chapterList: { empty: 'Keine Kapitel für diese Folge.' } },
            },
          },
          interactions: [{ type: 'locale', locale: 'de' }],
        },
      ],
      keyedLists: [{ prop: 'chapters', selector: 'li' }],
    },
  ],
  values: [
    {
      export: 'formatTimestamp',
      calls: [
        [0],
        [5],
        [60],
        [125],
        [125.9],
        [3599.9],
        [3600],
        [3725],
        [7325],
        [-1],
        [-0.5],
        [Number.NaN],
        [Number.POSITIVE_INFINITY],
      ],
    },
    {
      export: 'findActiveChapterIndex',
      calls: [
        [[], 100],
        [BASE, -5],
        [BASE, 0],
        [BASE, 119],
        [BASE, 120],
        [BASE, 599],
        [BASE, 600],
        [BASE, 3725],
        [BASE, 99_999],
        [UNSORTED, 75],
        [UNSORTED, 0],
        [UNSORTED, 100],
      ],
    },
  ],
}
