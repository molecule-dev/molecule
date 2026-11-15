/**
 * `@molecule/app-diff-viewer-react` cases: the unified layout, the optional
 * filename header, line numbers, the ClassMap classes and the inline
 * add/remove highlight styles, across empty, identical, blank-line and
 * block-replacement texts.
 *
 * `DiffViewer` has no callback props and no node props, so every branch is
 * chosen by props alone; the interactions below change props instead of
 * clicking.
 *
 * @remarks
 * `mode="split"` has no case here: the React reference renders its two columns
 * with `lines.filter(…).map(…)` and returns the row elements without a `key`,
 * so React logs "Each child in a list should have a unique \"key\" prop." on
 * the first split render and the React recorder refuses a run that logs a
 * warning. The split branch is covered by each port's own unit tests (the
 * ported "uses a two-column grid layout in split mode" case) until the React
 * package's split rows are keyed.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const before = 'line one\nline two\nline three'
const after = 'line one\nline TWO\nline three'

/** `@molecule/app-diff-viewer-react`. */
export const diffViewerFeature: FeatureCases = {
  package: '@molecule/app-diff-viewer-react',
  families: [
    {
      component: 'DiffViewer',
      cases: [
        { name: 'context, removed and added lines', props: { before, after } },
        { name: 'empty texts', props: { before: '', after: '' } },
        { name: 'one empty side', props: { before: '', after: 'x' } },
        { name: 'only added lines', props: { before: '', after: 'a\nb' } },
        { name: 'only removed lines', props: { before: 'a\nb', after: '' } },
        { name: 'identical texts', props: { before: 'same\nlines', after: 'same\nlines' } },
        {
          name: 'blank lines and a trailing newline',
          props: { before: 'a\n\nb\n', after: 'a\nc\n' },
        },
        { name: 'a block replacement', props: { before: 'a\nb\nc', after: 'x\ny\nz' } },
        {
          name: 'unicode, tabs and angle brackets',
          props: { before: '<a>\nΩ →', after: '<b>\nΩ →\t&' },
        },
        { name: 'filename header', props: { before, after, filename: 'src/config.ts' } },
        { name: 'no line numbers', props: { before, after, showLineNumbers: false } },
        { name: 'explicit line numbers', props: { before, after, showLineNumbers: true } },
        {
          name: 'filename and className',
          props: { before, after, filename: 'app.ts', className: 'parity-token' },
        },
        { name: 'className passthrough', props: { before, after, className: 'parity-token' } },
        { name: 'children are ignored', props: { before, after }, children: ['Ignored child'] },
        {
          name: 'texts change',
          props: { before: 'a\nb\nc', after: 'a\nB\nc' },
          interactions: [
            { type: 'props', props: { before: 'x\ny', after: 'x\nz\ny' } },
            { type: 'props', props: { before: 'same', after: 'same' } },
            { type: 'props', props: { before: '', after: '' } },
          ],
        },
        {
          name: 'mode toggles between unified and the default',
          props: { before, after },
          interactions: [
            { type: 'props', props: { mode: 'unified' } },
            { type: 'props', props: { mode: undefined } },
          ],
        },
        {
          name: 'line numbers toggle',
          props: { before, after },
          interactions: [
            { type: 'props', props: { showLineNumbers: false } },
            { type: 'props', props: { showLineNumbers: undefined } },
            { type: 'props', props: { showLineNumbers: true } },
          ],
        },
        {
          name: 'filename appears and disappears',
          props: { before, after },
          interactions: [
            { type: 'props', props: { filename: 'one.ts' } },
            { type: 'props', props: { filename: 'two.ts' } },
            { type: 'props', props: { filename: undefined } },
          ],
        },
        {
          name: 'className changes',
          props: { before, after, className: 'first-token' },
          interactions: [
            { type: 'props', props: { className: 'second-token' } },
            { type: 'props', props: { className: undefined } },
          ],
        },
      ],
    },
  ],
}
