/**
 * `@molecule/app-file-card-react` cases: `<FileCard>` (grid + row layouts with
 * icon/thumbnail, size, relative modified date and the actions slot),
 * `<FileIcon>` (one glyph per `FileKind`), and the `bytes` / `sizeParts` /
 * `relativeBucket` helpers.
 *
 * Every rendering case pins `now`, so the relative text and the absolute date
 * read the same on every day the case runs.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The instant every case's `Date.now()` is pinned to (2026-05-13T12:00:00Z). */
const NOW = Date.UTC(2026, 4, 13, 12, 0, 0)

/** An ISO timestamp `n` minutes before `NOW` (fractions allowed). */
const minutesAgo = (n: number): string => new Date(NOW - n * 60_000).toISOString()

/** An ISO timestamp `n` hours before `NOW`. */
const hoursAgo = (n: number): string => new Date(NOW - n * 3_600_000).toISOString()

/** An ISO timestamp `n` days before `NOW`. */
const daysAgo = (n: number): string => new Date(NOW - n * 86_400_000).toISOString()

/** The document file most cases render (471 KB, modified 5 min before `NOW`). */
const document = {
  id: 'f-1',
  name: 'Q3-report.pdf',
  size: 482_137,
  kind: 'document',
  modifiedAt: minutesAgo(5),
}

/** The same file with a thumbnail and an image kind. */
const thumbnail = { ...document, kind: 'image', thumbnail: 'https://example.test/q3.png' }

/** The kebab button the cases place in the actions slot. */
const kebab = {
  tag: 'button',
  attrs: { type: 'button', 'data-mol-id': 'card-kebab' },
  children: ['…'],
}

/** The row-action marker span. */
const rowAction = { tag: 'span', attrs: { 'data-mol-id': 'row-action' }, children: ['x'] }

/** `@molecule/app-file-card-react`. */
export const fileCardFeature: FeatureCases = {
  package: '@molecule/app-file-card-react',
  families: [
    {
      component: 'FileCard',
      cases: [
        // The first case also runs again with a pseudo-locale switch
        // ("…, then a locale switch"): every label translates through `t()`,
        // so the switched snapshot's text is the pseudo-locale's `⟦…⟧`.
        {
          name: 'grid tile with defaults',
          props: { file: document },
          now: NOW,
        },
        {
          name: 'row layout',
          props: { file: document, layout: 'row' },
          now: NOW,
        },
        {
          name: 'a thumbnail replaces the icon in a grid tile',
          props: { file: thumbnail },
          now: NOW,
        },
        {
          name: 'a thumbnail replaces the icon in a row',
          props: { file: thumbnail, layout: 'row' },
          now: NOW,
        },
        {
          name: 'a folder omits the size',
          props: { file: { id: 'd-1', name: 'Designs', size: 0, kind: 'folder' } },
          now: NOW,
        },
        {
          name: 'a folder in a row still shows its modified date',
          props: {
            file: { id: 'd-2', name: 'Archive', size: 0, kind: 'folder', modifiedAt: daysAgo(2) },
            layout: 'row',
          },
          now: NOW,
        },
        {
          name: 'just now',
          props: { file: { ...document, modifiedAt: minutesAgo(0.5) } },
          now: NOW,
        },
        {
          name: 'one minute ago',
          props: { file: { ...document, modifiedAt: minutesAgo(1) } },
          now: NOW,
        },
        {
          name: 'one hour ago',
          props: { file: { ...document, modifiedAt: hoursAgo(1) } },
          now: NOW,
        },
        {
          name: 'three hours ago',
          props: { file: { ...document, modifiedAt: hoursAgo(3) } },
          now: NOW,
        },
        {
          name: 'yesterday',
          props: { file: { ...document, modifiedAt: daysAgo(1) } },
          now: NOW,
        },
        {
          name: 'two days ago',
          props: { file: { ...document, modifiedAt: daysAgo(2) } },
          now: NOW,
        },
        {
          name: 'one week ago',
          props: { file: { ...document, modifiedAt: daysAgo(7) } },
          now: NOW,
        },
        {
          name: 'two weeks ago',
          props: { file: { ...document, modifiedAt: daysAgo(14) } },
          now: NOW,
        },
        {
          name: 'one month ago',
          props: { file: { ...document, modifiedAt: daysAgo(30) } },
          now: NOW,
        },
        {
          name: 'two months ago',
          props: { file: { ...document, modifiedAt: daysAgo(60) } },
          now: NOW,
        },
        {
          name: 'an older timestamp renders an absolute date',
          props: { file: { ...document, modifiedAt: daysAgo(400) } },
          now: NOW,
        },
        {
          name: 'an absent modified date omits the meta row',
          props: { file: { ...document, modifiedAt: undefined } },
          now: NOW,
        },
        {
          name: 'an explicit now Date pins the relative text',
          props: { file: { ...document, modifiedAt: minutesAgo(3) }, now: new Date(NOW) },
          now: NOW,
        },
        {
          name: 'a clickable grid card',
          props: { file: document, selected: true },
          callbacks: ['onClick'],
          now: NOW,
          interactions: [{ type: 'click', selector: '[data-mol-id="file-card-select"]' }],
        },
        {
          name: 'a clickable unselected card reports aria-pressed false',
          props: { file: document },
          callbacks: ['onClick'],
          now: NOW,
          interactions: [{ type: 'click', selector: '[data-mol-id="file-card-select"]' }],
        },
        {
          name: 'a clickable row card keeps the actions outside the select button',
          props: { file: document, layout: 'row' },
          slots: { actions: [kebab, rowAction] },
          callbacks: ['onClick'],
          now: NOW,
          interactions: [
            { type: 'click', selector: '[data-mol-id="file-card-select"]' },
            { type: 'click', selector: '[data-mol-id="card-kebab"]' },
          ],
        },
        {
          name: 'actions in a grid card do not fire onClick',
          props: { file: document },
          slots: { actions: [kebab] },
          callbacks: ['onClick'],
          now: NOW,
          interactions: [{ type: 'click', selector: '[data-mol-id="card-kebab"]' }],
        },
        {
          name: 'actions render without a select button when there is no onClick',
          props: { file: document, layout: 'row' },
          slots: { actions: [kebab] },
          now: NOW,
        },
        {
          name: 'a right click fires onContextMenu',
          props: { file: document },
          callbacks: ['onContextMenu'],
          now: NOW,
          interactions: [
            {
              type: 'event',
              selector: '[data-mol-id="file-card-f-1"]',
              event: 'contextmenu',
              bubbles: true,
            },
          ],
        },
        {
          name: 'className merges onto the root',
          props: { file: document, className: 'parity-token' },
          now: NOW,
        },
        {
          name: 'dataMolId overrides the root marker',
          props: { file: document, dataMolId: 'attachment-1' },
          now: NOW,
        },
        {
          name: 'switching the layout re-renders',
          props: { file: document },
          now: NOW,
          interactions: [{ type: 'props', props: { layout: 'row' } }],
        },
        {
          name: 'selecting re-renders',
          props: { file: document, selected: false },
          callbacks: ['onClick'],
          now: NOW,
          interactions: [{ type: 'props', props: { selected: true } }],
        },
        {
          name: 'swapping the file re-renders',
          props: { file: document },
          now: NOW,
          interactions: [
            {
              type: 'props',
              props: {
                file: { id: 'f-2', name: 'photo.jpg', size: 2048, kind: 'image' },
              },
            },
          ],
        },
        {
          name: 'removing className re-renders',
          props: { file: document, className: 'parity-token' },
          now: NOW,
          interactions: [{ type: 'props', props: { className: undefined } }],
        },
      ],
    },
    {
      component: 'FileIcon',
      cases: [
        // The first case also runs again with a pseudo-locale switch (it has
        // no translated text, so the snapshot is unchanged by the switch).
        {
          name: 'defaults to 24px and hides from assistive tech',
          props: { kind: 'image' },
        },
        { name: 'video glyph', props: { kind: 'video' } },
        { name: 'audio glyph', props: { kind: 'audio' } },
        { name: 'document glyph', props: { kind: 'document' } },
        { name: 'archive glyph', props: { kind: 'archive' } },
        { name: 'code glyph', props: { kind: 'code' } },
        { name: 'folder glyph', props: { kind: 'folder' } },
        { name: 'other glyph', props: { kind: 'other' } },
        { name: 'a custom size', props: { kind: 'folder', size: 48 } },
        { name: 'an aria label names the icon', props: { kind: 'audio', ariaLabel: 'Voice memo' } },
      ],
    },
  ],
  values: [
    {
      export: 'bytes',
      calls: [
        [0],
        [1],
        [420],
        [1023],
        [1024],
        [1536],
        [50 * 1024],
        [99 * 1024 + 512],
        [2 * 1024 * 1024],
        [2.3 * 1024 * 1024],
        [4.7 * 1024 * 1024 * 1024],
        [1024 ** 4],
        [1.23 * 1024 ** 5],
        [3 * 1024 ** 6],
        [150 * 1024],
        [999 * 1024],
        [Number.NaN],
        [Number.POSITIVE_INFINITY],
        [-1],
      ],
    },
    {
      export: 'sizeParts',
      // The same inputs as `bytes`: the two halves whose join it is. The card
      // renders the unit through `t()` (one literal key per unit), so every
      // framework must split identically.
      calls: [
        [0],
        [1],
        [420],
        [1023],
        [1024],
        [1536],
        [50 * 1024],
        [99 * 1024 + 512],
        [2 * 1024 * 1024],
        [2.3 * 1024 * 1024],
        [4.7 * 1024 * 1024 * 1024],
        [1024 ** 4],
        [1.23 * 1024 ** 5],
        [3 * 1024 ** 6],
        [150 * 1024],
        [999 * 1024],
        [Number.NaN],
        [Number.POSITIVE_INFINITY],
        [-1],
      ],
    },
    {
      export: 'relativeBucket',
      calls: [
        // Just-now (under a minute).
        ['2026-05-13T11:59:30Z', new Date(NOW)],
        [NOW - 59_999, new Date(NOW)],
        // Minutes, singular and plural.
        [minutesAgo(1), new Date(NOW)],
        [minutesAgo(5), new Date(NOW)],
        [minutesAgo(59), new Date(NOW)],
        // Hours, singular and plural.
        [hoursAgo(1), new Date(NOW)],
        [hoursAgo(3), new Date(NOW)],
        [hoursAgo(23), new Date(NOW)],
        // Days, singular (yesterday's bucket) and plural.
        [daysAgo(1), new Date(NOW)],
        [daysAgo(2), new Date(NOW)],
        [daysAgo(6), new Date(NOW)],
        // Weeks and months.
        [daysAgo(7), new Date(NOW)],
        [daysAgo(14), new Date(NOW)],
        [daysAgo(30), new Date(NOW)],
        [daysAgo(60), new Date(NOW)],
        // Older than a year: an absolute ISO date.
        [daysAgo(400), new Date(NOW)],
        // Every input shape: a Date, an ms timestamp, an ISO string.
        [new Date(NOW - 5 * 60_000), new Date(NOW)],
        [NOW - 5 * 60_000, new Date(NOW)],
        ['2026-05-13T11:55:00Z', new Date(NOW)],
        // Bucket boundaries: exactly a minute / hour / day / week / month / year.
        [NOW - 60_000, new Date(NOW)],
        [NOW - 3_600_000, new Date(NOW)],
        [NOW - 86_400_000, new Date(NOW)],
        [NOW - 7 * 86_400_000, new Date(NOW)],
        [NOW - 30 * 86_400_000, new Date(NOW)],
        [NOW - 365 * 86_400_000, new Date(NOW)],
        // A future timestamp is not "just now": its ms difference is negative,
        // past the minute bucket, so it reads as minutes 0.
        [NOW + 5 * 60_000, new Date(NOW)],
        // An unparseable timestamp falls to the absolute bucket with its input.
        ['not-a-date', new Date(NOW)],
      ],
    },
  ],
}
