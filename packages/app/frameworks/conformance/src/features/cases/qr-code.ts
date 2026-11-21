/**
 * `@molecule/app-qr-code-react` cases: the QR code SVG in every prop
 * combination, the optional center logo, and the pure path builder.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A dark/light matrix stand-in for `qrcode-generator`'s QR code, for the path builder. */
interface Matrix {
  getModuleCount: () => number
  isDark: (row: number, col: number) => boolean
}

/**
 * Builds a stand-in QR matrix from a predicate over its cells.
 *
 * @param size - Width and height in modules.
 * @param dark - Whether the cell at (row, col) is dark.
 * @returns The matrix the path builder reads.
 */
const matrix = (size: number, dark: (row: number, col: number) => boolean): Matrix => ({
  getModuleCount: () => size,
  isDark: dark,
})

/** `@molecule/app-qr-code-react`. */
export const qrCodeFeature: FeatureCases = {
  package: '@molecule/app-qr-code-react',
  families: [
    {
      component: 'QrCode',
      cases: [
        { name: 'default link', props: { value: 'https://example.com/redeem/ABC123' } },
        { name: 'custom size', props: { value: 'ticket-42', size: 320 } },
        { name: 'empty value', props: { value: '' } },
        { name: 'unicode value', props: { value: 'héllo ✓ 世界' } },
        {
          name: 'error correction L',
          props: { value: 'https://example.com/longish-link-1', errorCorrection: 'L' },
        },
        {
          name: 'error correction Q',
          props: { value: 'https://example.com/longish-link-1', errorCorrection: 'Q' },
        },
        {
          name: 'error correction H',
          props: { value: 'https://example.com/longish-link-1', errorCorrection: 'H' },
        },
        {
          name: 'custom colors',
          props: { value: 'x', fgColor: '#0066ff', bgColor: '#ff0' },
        },
        { name: 'no quiet-zone margin', props: { value: 'x', margin: 0 } },
        { name: 'wide quiet-zone margin', props: { value: 'x', margin: 6 } },
        {
          name: 'logo with alt text',
          props: {
            value: 'x',
            errorCorrection: 'H',
            logo: { src: 'data:image/png;base64,iVBORw0KGgo=', alt: 'Brand' },
          },
        },
        { name: 'logo without alt text', props: { value: 'x', logo: { src: '/logo.png' } } },
        {
          name: 'logo with its own size',
          props: {
            value: 'x',
            size: 320,
            errorCorrection: 'H',
            logo: { src: '/logo.png', size: 64, alt: 'Brand' },
          },
        },
        {
          name: 'explicit aria label',
          props: { value: 'ignored', ariaLabel: 'Scan to redeem' },
        },
        { name: 'extra class', props: { value: 'x', className: 'parity-token' } },
        {
          name: 'value and size change',
          props: { value: 'https://example.com/a', size: 128 },
          interactions: [{ type: 'props', props: { value: 'https://example.com/b', size: 256 } }],
        },
        {
          name: 'error correction changes',
          props: { value: 'https://example.com/longish-link-1', errorCorrection: 'L' },
          interactions: [{ type: 'props', props: { errorCorrection: 'H' } }],
        },
        {
          name: 'logo appears then goes away',
          props: { value: 'x' },
          interactions: [
            { type: 'props', props: { logo: { src: '/logo.png', alt: 'Brand' } } },
            { type: 'props', props: { logo: undefined } },
          ],
        },
        {
          name: 'colors and margin change',
          props: { value: 'x' },
          interactions: [
            { type: 'props', props: { fgColor: '#123456', bgColor: '#abcdef', margin: 4 } },
          ],
        },
        {
          name: 'aria label removed',
          props: { value: 'x', ariaLabel: 'Scan' },
          interactions: [{ type: 'props', props: { ariaLabel: undefined } }],
        },
      ],
    },
  ],
  values: [
    {
      export: 'buildQrPath',
      calls: [
        // One run per fully dark row, and the quiet-zone offset.
        [matrix(3, () => true), 0],
        [matrix(1, () => true), 4],
        // Light cells are skipped; each dark stretch is its own run.
        [matrix(4, (_row, col) => col === 1 || col === 3), 0],
        // A checkerboard with a margin: alternating single-cell runs.
        [matrix(5, (row, col) => (row + col) % 2 === 0), 2],
        // An all-light matrix draws nothing.
        [matrix(2, () => false), 1],
      ],
    },
  ],
}
