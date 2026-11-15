/**
 * `@molecule/app-code-block-react` cases: the read-only code panel with its
 * optional filename + language header, line numbers and copy button.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const code = 'const x = 1\nconst y = 2\nconsole.log(x + y)'

/** `@molecule/app-code-block-react`. */
export const codeBlockFeature: FeatureCases = {
  package: '@molecule/app-code-block-react',
  families: [
    {
      component: 'CodeBlock',
      cases: [
        { name: 'code only', props: { code } },
        {
          name: 'filename, language and className',
          props: { code, filename: 'sum.ts', language: 'ts', className: 'parity-token' },
        },
        { name: 'language only', props: { code, language: 'ts' } },
        { name: 'filename only', props: { code, filename: 'main.ts' } },
        { name: 'no line numbers', props: { code, showLineNumbers: false } },
        { name: 'no copy button', props: { code, showCopy: false } },
        {
          name: 'no copy button with a filename',
          props: { code, filename: 'a.ts', showCopy: false },
        },
        {
          name: 'no line numbers, no copy and no header',
          props: { code, showLineNumbers: false, showCopy: false },
        },
        { name: 'empty code', props: { code: '' } },
        { name: 'blank lines and a trailing newline', props: { code: 'a\n\nb\n' } },
        { name: 'single line', props: { code: 'const z = 3' } },
        {
          name: 'angle brackets, quotes and unicode',
          props: { code: '<script>alert("x")</script>\nΩ → & <code>' },
        },
        {
          name: 'code and language change',
          props: { code: 'let a = 1', language: 'ts' },
          interactions: [
            { type: 'props', props: { code: 'let b = 2\nlet c = 3' } },
            { type: 'props', props: { language: 'js' } },
            { type: 'props', props: { language: undefined } },
          ],
        },
        {
          name: 'header pieces appear and disappear',
          props: { code, filename: 'one.ts' },
          interactions: [
            { type: 'props', props: { filename: undefined, language: 'ts' } },
            { type: 'props', props: { language: undefined, showCopy: false } },
            { type: 'props', props: { showCopy: true } },
          ],
        },
        {
          name: 'explicit undefined restores the defaults',
          props: { code, showCopy: false, showLineNumbers: false, filename: 'f.ts' },
          interactions: [
            { type: 'props', props: { showCopy: undefined } },
            { type: 'props', props: { showLineNumbers: undefined } },
            { type: 'props', props: { filename: undefined } },
          ],
        },
        {
          name: 'click, focus and key presses on the copy button',
          props: { code, filename: 'sum.ts', language: 'ts' },
          interactions: [
            { type: 'click', selector: 'button' },
            { type: 'focus', selector: 'button' },
            { type: 'keydown', selector: 'button', key: 'Enter' },
            { type: 'click', selector: 'button' },
            { type: 'blur', selector: 'button' },
          ],
        },
        {
          name: 'className changes',
          props: { code, className: 'first-token' },
          interactions: [{ type: 'props', props: { className: 'second-token' } }],
        },
        {
          name: 'children are ignored',
          props: { code: 'only this' },
          children: ['Ignored child'],
        },
      ],
    },
  ],
}
