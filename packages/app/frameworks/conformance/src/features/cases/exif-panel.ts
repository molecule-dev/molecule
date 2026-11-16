/**
 * `@molecule/app-exif-panel-react` cases: the EXIF metadata panel, its props
 * and branches, plus the pure formatting helpers compared by value.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A fully populated EXIF object: every field the panel can render. */
const fullExif = {
  make: 'Canon',
  model: 'EOS R5',
  lensModel: 'RF 24-70mm F2.8 L IS USM',
  fNumber: 2.8,
  exposureTime: 0.008,
  iso: 800,
  focalLength: 50,
  focalLength35mm: 50,
  dateTimeOriginal: '2024-06-15T12:30:45Z',
  gpsLatitude: 37.4219983,
  gpsLongitude: -122.084,
  software: 'Adobe Lightroom 13',
  copyright: '© 2024 Photographer',
}

/** A GPS coordinate pair the panel turns into a map link. */
const gps = { gpsLatitude: 37.4219983, gpsLongitude: -122.084 }

/** `@molecule/app-exif-panel-react`. */
export const exifPanelFeature: FeatureCases = {
  package: '@molecule/app-exif-panel-react',
  families: [
    {
      component: 'ExifPanel',
      cases: [
        { name: 'full metadata', props: { exif: fullExif } },
        {
          name: 'minimal metadata',
          props: { exif: { make: 'Apple', model: 'iPhone 15 Pro' } },
        },
        { name: 'no metadata at all', props: { exif: {} } },
        { name: 'model only', props: { exif: { model: 'a7 III' } } },
        { name: 'make only', props: { exif: { make: 'Sony' } } },
        {
          name: 'duplicated make in the model',
          props: { exif: { make: 'Sony', model: 'Sony a7 III' } },
        },
        {
          name: 'whitespace-only optional text is skipped',
          props: {
            exif: {
              ...fullExif,
              lensModel: '   ',
              software: '  ',
              copyright: ' ',
            },
          },
        },
        { name: 'compact', props: { exif: fullExif, compact: true } },
        { name: 'compact explicitly false', props: { exif: fullExif, compact: false } },
        { name: 'gps hidden', props: { exif: fullExif, showGps: false } },
        {
          name: 'gps coordinates missing',
          props: { exif: { ...fullExif, gpsLatitude: undefined, gpsLongitude: undefined } },
        },
        {
          name: 'latitude without longitude',
          props: { exif: { ...fullExif, gpsLongitude: undefined } },
        },
        {
          name: '35 mm equivalent differs',
          props: { exif: { ...fullExif, focalLength: 35, focalLength35mm: 52 } },
        },
        {
          name: '35 mm equivalent without a focal length',
          props: {
            exif: { ...fullExif, focalLength: undefined, focalLength35mm: 84 },
          },
        },
        {
          name: 'exposure without a focal length',
          props: { exif: { ...fullExif, focalLength: undefined, focalLength35mm: undefined } },
        },
        {
          name: 'invalid exposure values are skipped',
          props: {
            exif: {
              ...fullExif,
              fNumber: 0,
              exposureTime: -1,
              iso: 0,
            },
          },
        },
        {
          name: 'timestamp as a Date',
          props: { exif: { ...fullExif, dateTimeOriginal: new Date('2023-01-02T03:04:05Z') } },
        },
        {
          name: 'timestamp as epoch milliseconds',
          props: {
            exif: { ...fullExif, dateTimeOriginal: Date.UTC(2022, 10, 5, 6, 7, 8) },
          },
        },
        {
          name: 'unparseable timestamp is skipped',
          props: { exif: { ...fullExif, dateTimeOriginal: 'not-a-date' } },
        },
        {
          name: 'custom heading',
          props: { exif: fullExif, heading: 'Capture details' },
        },
        { name: 'empty heading', props: { exif: fullExif, heading: '' } },
        {
          name: 'className on the panel root',
          props: { exif: fullExif, className: 'parity-token' },
        },
        {
          name: 'compact toggles',
          props: { exif: fullExif, compact: false },
          interactions: [{ type: 'props', props: { compact: true } }],
        },
        {
          name: 'metadata changes',
          props: { exif: fullExif },
          interactions: [
            { type: 'props', props: { exif: { make: 'Apple', model: 'iPhone 15 Pro' } } },
          ],
        },
        {
          name: 'gps appears',
          props: { exif: { ...fullExif, gpsLatitude: undefined, gpsLongitude: undefined } },
          interactions: [{ type: 'props', props: { exif: { ...fullExif, ...gps } } }],
        },
        {
          name: 'heading changes',
          props: { exif: fullExif },
          interactions: [
            { type: 'props', props: { heading: 'Second heading' } },
            { type: 'props', props: { heading: undefined } },
          ],
        },
      ],
    },
  ],
  values: [
    {
      export: 'formatAperture',
      calls: [[2.8], [8], [5.6], [2.83], [2.85], [undefined], [0], [-1], [Number.NaN], [Infinity]],
    },
    {
      export: 'formatShutter',
      calls: [
        [0.008],
        [1 / 1000],
        [1 / 60],
        [0.0079],
        [1],
        [2],
        [2.5],
        [30],
        [undefined],
        [0],
        [-1],
        [Number.NaN],
      ],
    },
    {
      export: 'formatIso',
      calls: [[100], [1600], [204.6], [undefined], [0], [-100]],
    },
    {
      export: 'formatFocalLength',
      calls: [[50], [200], [35.5], [undefined], [0], [-50]],
    },
    {
      export: 'formatDms',
      calls: [
        [37.4219983, 'lat'],
        [-33.8688, 'lat'],
        [151.2093, 'lon'],
        [-122.084, 'lon'],
        [0, 'lat'],
        [0, 'lon'],
        [undefined, 'lat'],
        [Number.NaN, 'lon'],
      ],
    },
    {
      export: 'formatGps',
      calls: [
        [37.4219983, -122.084],
        [37, undefined],
        [undefined, -122],
        [undefined, undefined],
      ],
    },
    {
      export: 'buildMapLink',
      calls: [
        [37.421998, -122.084],
        [37, undefined],
        [undefined, -122],
        [undefined, undefined],
      ],
    },
    {
      export: 'formatTimestamp',
      calls: [
        ['2024-06-15T12:30:45Z'],
        [Date.UTC(2024, 5, 15, 12, 30, 45)],
        [new Date(Date.UTC(2020, 0, 2, 3, 4, 5))],
        [undefined],
        ['not-a-date'],
      ],
    },
    {
      export: 'formatCamera',
      calls: [
        ['Canon', 'EOS R5'],
        ['Sony', 'Sony a7 III'],
        ['NIKON', 'NIKON Z 9'],
        ['Canon', undefined],
        [undefined, 'EOS R5'],
        [undefined, undefined],
        ['', ''],
      ],
    },
  ],
}
