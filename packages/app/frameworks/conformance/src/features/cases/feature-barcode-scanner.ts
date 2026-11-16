/**
 * `@molecule/app-feature-barcode-scanner-react` cases: the scanner region —
 * the `<video>` frame, the status overlay with its localized message, the
 * `onError` dispatch for a browser without camera support, the `className`
 * passthrough, the `width`/`height` frame geometry, the acquisition restarts
 * that the effect's dependencies drive (a changed format list, the cadence
 * props, the injected `barcodeDetector`/`loadZxing` markers) against the ones
 * it must not drive (an equal-content format list, `dedupeMs`), the teardown
 * on unmount, and the two framework-free exports (`DEFAULT_FORMATS`,
 * `buildZxingHints`).
 *
 * jsdom exposes neither `navigator.mediaDevices` nor `BarcodeDetector`, so
 * every mount lands on the `'unsupported'` error overlay through the same
 * synchronous branch a browser without camera support takes; the detector and
 * fallback loops themselves are exercised by each package's own unit tests
 * with injected stubs.
 *
 * No case pins `now`: nothing the component renders depends on the clock.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** zxing's `BarcodeFormat` enum, mirrored from `@zxing/library` (its real values). */
const ZXING_BARCODE_FORMAT: Record<string, number> = {
  AZTEC: 0,
  CODABAR: 1,
  CODE_39: 2,
  CODE_93: 3,
  CODE_128: 4,
  DATA_MATRIX: 5,
  EAN_8: 6,
  EAN_13: 7,
  ITF: 8,
  PDF_417: 10,
  QR_CODE: 11,
  UPC_A: 14,
  UPC_E: 15,
}

/** zxing's `DecodeHintType` enum, mirrored from `@zxing/library` (its real values). */
const ZXING_DECODE_HINT_TYPE: Record<string, number> = { POSSIBLE_FORMATS: 2 }

/** `@molecule/app-feature-barcode-scanner-react`. */
export const featureBarcodeScannerFeature: FeatureCases = {
  package: '@molecule/app-feature-barcode-scanner-react',
  families: [
    {
      component: 'BarcodeScanner',
      cases: [
        // The default mount in a browser without camera support: the localized
        // overlay and one onError dispatch. The derived pseudo-locale case
        // rides on this one.
        {
          name: 'the scanner reports a browser without camera support',
          callbacks: ['onScan', 'onError'],
        },
        // The same failure with no handlers passed: identical DOM, no calls.
        {
          name: 'without onError the failure stays on the overlay',
        },
        // className passthrough on the region root, and a change of it.
        {
          name: 'className passes through to the region root',
          props: { className: 'parity-scan' },
          callbacks: ['onScan', 'onError'],
          interactions: [{ type: 'props', props: { className: 'parity-other' } }],
        },
        // The frame geometry: max-width and aspect-ratio follow width/height,
        // and a change re-acquires (a second onError dispatch).
        {
          name: 'width and height set the frame geometry',
          props: { width: 1280, height: 720 },
          callbacks: ['onError'],
          interactions: [{ type: 'props', props: { width: 320, height: 240 } }],
        },
        // A changed format list re-acquires; passing undefined restores the
        // DEFAULT_FORMATS key.
        {
          name: 'a changed format list restarts the acquisition',
          props: { formats: ['qr_code', 'code_128'] },
          callbacks: ['onError'],
          interactions: [
            { type: 'props', props: { formats: ['ean_13'] } },
            { type: 'props', props: { formats: undefined } },
          ],
        },
        // An equal-content list must NOT re-acquire (the effect keys on the
        // joined formats, not the array identity).
        {
          name: 'an equal format list keeps the camera as it is',
          props: { formats: ['qr_code', 'code_128'] },
          callbacks: ['onError'],
          interactions: [{ type: 'props', props: { formats: ['qr_code', 'code_128'] } }],
        },
        // The cadence props are effect dependencies: a scanIntervalMs change
        // re-acquires, in continuous mode.
        {
          name: 'a cadence change restarts the scan loop',
          props: { continuous: true, scanIntervalMs: 100, dedupeMs: 500 },
          callbacks: ['onError'],
          interactions: [{ type: 'props', props: { scanIntervalMs: 250 } }],
        },
        // dedupeMs is read through a ref, NOT a dependency: changing it keeps
        // the camera as it is (one dispatch only).
        {
          name: 'a dedupe change does not restart the camera',
          props: { continuous: true, dedupeMs: 1000 },
          callbacks: ['onError'],
          interactions: [{ type: 'props', props: { dedupeMs: 5000 } }],
        },
        // The injected-detector markers are dependencies too: null (force the
        // fallback) and undefined (read the browser global) are distinct values.
        {
          name: 'an injected-detector change restarts the acquisition',
          props: { barcodeDetector: null },
          callbacks: ['onError'],
          interactions: [{ type: 'props', props: { barcodeDetector: undefined } }],
        },
        // The forced-off fallback loader: the mount still lands on the overlay.
        {
          name: 'a forced-off fallback loader keeps the overlay',
          props: { loadZxing: null },
          callbacks: ['onError'],
        },
        // Teardown: nothing is called after unmount and the page is left empty.
        {
          name: 'leaving the page tears the camera down',
          callbacks: ['onScan', 'onError'],
          interactions: [{ type: 'unmount' }],
        },
      ],
    },
  ],
  values: [
    { export: 'DEFAULT_FORMATS' },
    {
      export: 'buildZxingHints',
      calls: [
        [['upc_a', 'ean_13'], ZXING_BARCODE_FORMAT, ZXING_DECODE_HINT_TYPE],
        [['pdf417', 'qr_code', 'code_128'], ZXING_BARCODE_FORMAT, ZXING_DECODE_HINT_TYPE],
        [
          ['aztec', 'codabar', 'code_39', 'code_93', 'data_matrix', 'ean_8', 'itf', 'upc_e'],
          ZXING_BARCODE_FORMAT,
          ZXING_DECODE_HINT_TYPE,
        ],
        [[], ZXING_BARCODE_FORMAT, ZXING_DECODE_HINT_TYPE],
        [['not_a_format'], ZXING_BARCODE_FORMAT, ZXING_DECODE_HINT_TYPE],
      ],
    },
  ],
}
