/**
 * `@molecule/app-word-cloud-react` cases: the SVG weighted-vocabulary cloud and
 * the pure spiral-packing helpers it exports.
 *
 * `WordCloud` is the package's only component; `estimateBBox`,
 * `bboxesIntersect`, `scaleFontSize` and `packWords` are its plain-function
 * exports.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const three = [
  { text: 'alpha', value: 10 },
  { text: 'beta', value: 5 },
  { text: 'gamma', value: 1 },
]

const eight = [
  { text: 'one', value: 8 },
  { text: 'two', value: 7 },
  { text: 'three', value: 6 },
  { text: 'four', value: 5 },
  { text: 'five', value: 4 },
  { text: 'six', value: 3 },
  { text: 'seven', value: 2 },
  { text: 'eight', value: 1 },
]

/** `@molecule/app-word-cloud-react`. */
export const wordCloudFeature: FeatureCases = {
  package: '@molecule/app-word-cloud-react',
  families: [
    {
      component: 'WordCloud',
      cases: [
        // The family's first case also derives the locale-switch case, so it
        // carries a translated aria label.
        { name: 'defaults with one word', props: { words: [{ text: 'hello', value: 1 }] } },
        { name: 'three words sized by value', props: { words: three } },
        { name: 'no words shows the empty label', props: { words: [] } },
        {
          name: 'custom size, label and classes',
          props: {
            words: three,
            width: 600,
            height: 400,
            ariaLabel: 'Topic cloud',
            className: 'parity-token',
          },
        },
        {
          name: 'an explicit per-word color overrides the palette',
          props: { words: [{ text: 'red', value: 1, color: '#ff0000' }] },
        },
        {
          name: 'the palette cycles and wraps',
          props: {
            words: [
              { text: 'a', value: 9 },
              { text: 'b', value: 7 },
              { text: 'c', value: 5 },
              { text: 'd', value: 3 },
            ],
            colorScale: ['#111111', '#222222', '#333333'],
            width: 600,
            height: 400,
          },
        },
        {
          name: 'an empty palette leaves un-colored words unfilled',
          props: { words: [{ text: 'bare', value: 2 }], colorScale: [] },
        },
        {
          name: 'mixed orientation rotates every fourth word',
          props: { words: eight, orientation: 'mixed', width: 600, height: 400 },
        },
        {
          name: 'horizontal orientation keeps every word flat',
          props: { words: eight, orientation: 'horizontal', width: 600, height: 400 },
        },
        {
          name: 'custom font-size range',
          props: {
            words: [
              { text: 'a', value: 1 },
              { text: 'big', value: 100 },
            ],
            minFontSize: 10,
            maxFontSize: 50,
          },
        },
        {
          name: 'a too-small box drops words it cannot fit',
          props: {
            words: [
              { text: 'truncated', value: 9 },
              { text: 'spillover', value: 7 },
              { text: 'overflowing', value: 5 },
            ],
            width: 40,
            height: 30,
          },
        },
        {
          name: 'clickable words invoke onWordClick',
          props: { words: [{ text: 'click-me', value: 9 }] },
          callbacks: ['onWordClick'],
          interactions: [{ type: 'click', selector: '[data-mol-id="word-cloud-word-click-me"]' }],
        },
        {
          name: 'onWordClick receives the source word, color included',
          props: { words: [{ text: 'tinted', value: 4, color: '#123456' }] },
          callbacks: ['onWordClick'],
          interactions: [{ type: 'click', selector: '[data-mol-id="word-cloud-word-tinted"]' }],
        },
        {
          name: 'without a handler words are not clickable',
          props: { words: [{ text: 'static', value: 3 }] },
          interactions: [{ type: 'click', selector: '[data-mol-id="word-cloud-word-static"]' }],
        },
        {
          name: 'keyboard on a clickable word changes nothing',
          props: { words: [{ text: 'focused', value: 3 }] },
          callbacks: ['onWordClick'],
          interactions: [
            { type: 'focus', selector: '[data-mol-id="word-cloud-word-focused"]' },
            { type: 'keydown', selector: '[data-mol-id="word-cloud-word-focused"]', key: 'Enter' },
          ],
        },
        {
          name: 'words change reshapes the cloud',
          props: { words: three, width: 600, height: 400 },
          interactions: [
            {
              type: 'props',
              props: {
                words: [
                  { text: 'delta', value: 12 },
                  { text: 'epsilon', value: 4 },
                ],
              },
            },
          ],
        },
        {
          name: 'size changes',
          props: { words: three },
          interactions: [{ type: 'props', props: { width: 600, height: 400 } }],
        },
        {
          name: 'orientation changes from horizontal to mixed',
          props: { words: eight, width: 600, height: 400 },
          interactions: [{ type: 'props', props: { orientation: 'mixed' } }],
        },
        {
          name: 'label changes and clears',
          props: { words: three, ariaLabel: 'First' },
          interactions: [
            { type: 'props', props: { ariaLabel: 'Second' } },
            { type: 'props', props: { ariaLabel: undefined } },
          ],
        },
        {
          name: 'palette changes',
          props: { words: three, colorScale: ['#111111'] },
          interactions: [{ type: 'props', props: { colorScale: ['#222222', '#333333'] } }],
        },
        {
          name: 'className is added and removed',
          props: { words: three, className: 'parity-token' },
          interactions: [
            { type: 'props', props: { className: 'parity-other' } },
            { type: 'props', props: { className: undefined } },
          ],
        },
      ],
    },
  ],
  values: [
    {
      export: 'estimateBBox',
      calls: [
        ['hello', 20, 0, 100, 100],
        ['hello', 20, 90, 100, 100],
        ['hi', 12, 0, 0, 0],
        ['', 16, 0, 50, 60],
        ['wide word', 64, 90, 200, 150],
      ],
    },
    {
      export: 'bboxesIntersect',
      calls: [
        [
          { x: 0, y: 0, w: 10, h: 10 },
          { x: 5, y: 5, w: 10, h: 10 },
        ],
        [
          { x: 0, y: 0, w: 10, h: 10 },
          { x: 10, y: 0, w: 10, h: 10 },
        ],
        [
          { x: 0, y: 0, w: 10, h: 10 },
          { x: 100, y: 100, w: 10, h: 10 },
        ],
        [
          { x: 0, y: 0, w: 10, h: 10 },
          { x: 2, y: 2, w: 2, h: 2 },
        ],
        [
          { x: -5, y: -5, w: 30, h: 30 },
          { x: 10, y: 10, w: 30, h: 30 },
        ],
      ],
    },
    {
      export: 'scaleFontSize',
      calls: [
        [1, 1, 10, 12, 64],
        [10, 1, 10, 12, 64],
        [5.5, 1, 10, 12, 64],
        [7, 7, 7, 12, 64],
        [0, 0, 0, 10, 20],
        [3, 2, 12, 14, 48],
      ],
    },
    {
      export: 'packWords',
      calls: [
        [[], { width: 400, height: 300, minFontSize: 12, maxFontSize: 64 }],
        [
          [{ text: 'solo', value: 5 }],
          { width: 400, height: 300, minFontSize: 12, maxFontSize: 64 },
        ],
        [
          [
            { text: 'small', value: 1 },
            { text: 'big', value: 100 },
            { text: 'mid', value: 50 },
          ],
          { width: 400, height: 300, minFontSize: 12, maxFontSize: 64 },
        ],
        [
          [
            { text: 'a', value: 8 },
            { text: 'b', value: 7 },
            { text: 'c', value: 6 },
            { text: 'd', value: 5 },
            { text: 'e', value: 4 },
          ],
          { width: 600, height: 400, minFontSize: 14, maxFontSize: 32, orientation: 'mixed' },
        ],
        [
          [
            { text: 'one', value: 10 },
            { text: 'two', value: 10 },
            { text: 'three', value: 2 },
          ],
          { width: 400, height: 300, minFontSize: 12, maxFontSize: 40 },
        ],
        [
          [
            { text: 'truncated', value: 9 },
            { text: 'spillover', value: 7 },
          ],
          { width: 40, height: 30, minFontSize: 12, maxFontSize: 64 },
        ],
      ],
    },
  ],
}
