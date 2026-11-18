/**
 * `@molecule/app-embed-snippet-react` cases: the embed-code panel with its
 * substituted snippet, copy button and optional width / height / theme
 * controls.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const TEMPLATE =
  '<iframe src="https://example.com/embed" width="{{width}}" height="{{height}}" data-theme="{{theme}}" />'

const THEME_OPTIONS = [
  { value: 'sunrise', label: 'Sunrise' },
  { value: 'midnight', label: 'Midnight' },
]

/** `@molecule/app-embed-snippet-react`. */
export const embedSnippetFeature: FeatureCases = {
  package: '@molecule/app-embed-snippet-react',
  families: [
    {
      component: 'EmbedSnippet',
      cases: [
        { name: 'template only', props: { template: TEMPLATE } },
        { name: 'language iframe', props: { template: TEMPLATE, language: 'iframe' } },
        { name: 'language react', props: { template: TEMPLATE, language: 'react' } },
        { name: 'language html explicit', props: { template: TEMPLATE, language: 'html' } },
        {
          name: 'substituted values',
          props: {
            template: TEMPLATE,
            values: { width: 640, height: '480px', theme: 'dark' },
          },
        },
        {
          name: 'css length dimensions and no theme',
          props: { template: TEMPLATE, values: { width: '100%', height: '60vh' } },
        },
        {
          name: 'zero dimensions',
          props: { template: TEMPLATE, values: { width: 0, height: 0 } },
        },
        {
          name: 'heading and eyebrow overrides',
          props: {
            template: TEMPLATE,
            heading: '3D Model',
            eyebrow: 'Share this view',
          },
        },
        {
          name: 'heading and eyebrow removed',
          props: { template: TEMPLATE, heading: 'Embed this', eyebrow: 'Copy me' },
          interactions: [
            { type: 'props', props: { heading: undefined } },
            { type: 'props', props: { eyebrow: undefined } },
          ],
        },
        { name: 'custom mol-id', props: { template: TEMPLATE, molId: 'my-embed' } },
        { name: 'className', props: { template: TEMPLATE, className: 'parity-token' } },
        {
          name: 'className changes',
          props: { template: TEMPLATE, className: 'first-token' },
          interactions: [{ type: 'props', props: { className: 'second-token' } }],
        },
        {
          name: 'children are ignored',
          props: { template: TEMPLATE },
          children: ['Ignored child'],
        },
        {
          name: 'width and height controls',
          props: {
            template: TEMPLATE,
            controls: { width: true, height: true },
            values: { width: 640, height: 480 },
          },
          callbacks: ['onChange'],
        },
        {
          name: 'theme control with the default options',
          props: { template: TEMPLATE, controls: { theme: true }, values: { theme: 'light' } },
          callbacks: ['onChange'],
        },
        {
          name: 'theme control with no selection',
          props: { template: TEMPLATE, controls: { theme: true } },
          callbacks: ['onChange'],
        },
        {
          name: 'theme control with caller options',
          props: {
            template: TEMPLATE,
            controls: { theme: THEME_OPTIONS },
            values: { theme: 'sunrise' },
          },
          callbacks: ['onChange'],
        },
        {
          name: 'theme control with an empty option array',
          props: { template: TEMPLATE, controls: { theme: [] } },
          callbacks: ['onChange'],
        },
        {
          name: 'controls present but nothing enabled',
          props: { template: TEMPLATE, controls: { width: false, height: false, theme: false } },
        },
        {
          name: 'controls removed and replaced',
          props: {
            template: TEMPLATE,
            controls: { width: true },
            values: { width: 640 },
          },
          callbacks: ['onChange'],
          interactions: [
            { type: 'props', props: { controls: undefined } },
            { type: 'props', props: { controls: { height: true } } },
          ],
        },
        {
          name: 'typing in the width and height inputs',
          props: {
            template: TEMPLATE,
            controls: { width: true, height: true },
            values: { width: 640, height: 480 },
          },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: '[data-mol-id="embed-snippet-input-width"]', value: '800' },
            {
              type: 'input',
              selector: '[data-mol-id="embed-snippet-input-height"]',
              value: '600',
            },
            { type: 'props', props: { values: { width: '800', height: '600' } } },
          ],
        },
        {
          name: 'width input focus, key press and blur',
          props: { template: TEMPLATE, controls: { width: true }, values: { width: 640 } },
          callbacks: ['onChange'],
          interactions: [
            { type: 'focus', selector: '[data-mol-id="embed-snippet-input-width"]' },
            { type: 'keydown', selector: '[data-mol-id="embed-snippet-input-width"]', key: 'Tab' },
            { type: 'blur', selector: '[data-mol-id="embed-snippet-input-width"]' },
          ],
        },
        {
          name: 'changing the default theme select',
          props: { template: TEMPLATE, controls: { theme: true }, values: { theme: 'light' } },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: '[data-mol-id="embed-snippet-input-theme"]', value: 'dark' },
            { type: 'props', props: { values: { theme: 'auto' } } },
            {
              type: 'input',
              selector: '[data-mol-id="embed-snippet-input-theme"]',
              value: 'light',
            },
          ],
        },
        {
          name: 'changing the caller theme select',
          props: {
            template: TEMPLATE,
            controls: { theme: THEME_OPTIONS },
            values: { theme: 'sunrise' },
          },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'input',
              selector: '[data-mol-id="embed-snippet-input-theme"]',
              value: 'midnight',
            },
            { type: 'props', props: { values: { theme: 'midnight' } } },
          ],
        },
        {
          name: 'copy click',
          props: {
            template: TEMPLATE,
            values: { width: 640, height: 480, theme: 'dark' },
          },
          callbacks: ['onCopy'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="embed-snippet-copy-button"]' },
            { type: 'focus', selector: '[data-mol-id="embed-snippet-copy-button"]' },
            {
              type: 'keydown',
              selector: '[data-mol-id="embed-snippet-copy-button"]',
              key: 'Enter',
            },
            { type: 'blur', selector: '[data-mol-id="embed-snippet-copy-button"]' },
          ],
        },
        {
          name: 'copy click under fake timers with a custom feedbackMs',
          props: { template: TEMPLATE, values: { width: 640 }, feedbackMs: 300 },
          callbacks: ['onCopy'],
          fakeTimers: true,
          interactions: [
            { type: 'click', selector: '[data-mol-id="embed-snippet-copy-button"]' },
            { type: 'advance', ms: 300 },
          ],
        },
        {
          name: 'values change and disappear',
          props: {
            template: TEMPLATE,
            controls: { width: true, height: true, theme: true },
            values: { width: 640, height: 480, theme: 'light' },
          },
          callbacks: ['onChange'],
          interactions: [
            { type: 'props', props: { values: { width: 900, height: 500, theme: 'dark' } } },
            { type: 'props', props: { values: undefined } },
          ],
        },
        {
          name: 'template changes',
          props: { template: '<iframe width="{{width}}" />', values: { width: 320 } },
          interactions: [
            { type: 'props', props: { template: '<div>{{theme}}</div>' } },
            { type: 'props', props: { template: TEMPLATE } },
          ],
        },
      ],
    },
  ],
  values: [
    {
      export: 'coerceDimension',
      calls: [[undefined], [null], [''], [640], [0], [-10], [12.5], ['100%'], ['480px'], ['60vh']],
    },
    {
      export: 'substituteTemplate',
      calls: [
        [TEMPLATE],
        [TEMPLATE, {}],
        [TEMPLATE, { width: 640, height: '480px', theme: 'dark' }],
        ['w={{ width }} h={{height }}', { width: 100, height: 50 }],
        ['id={{id}} w={{width}}', { width: 100 }],
        ['{{theme}}/{{theme}}', { theme: 'dark' }],
        ['{{WIDTH}} {{widths}} {{width}}', { width: 1 }],
        ['no placeholders at all', { width: 1, height: 2, theme: 'dark' }],
        ['{{ theme }}{{width}}', { theme: '', width: '' }],
      ],
    },
  ],
}
