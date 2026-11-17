/**
 * `ChatItemBoundary` cases: the per-item boundary passing its timeline item
 * through untouched.
 *
 * The errored branch (the localized inline notice) cannot run here: React
 * reports every caught render error on the console, and this kit refuses to
 * record a case whose React reference logs — exactly why the root boundary's
 * cases (`cases/root-error-boundary.ts`) hold only the pass-through branch
 * too. The framework packages exercise the fallback, the `onError` report and
 * the containment guarantee in their own unit tests.
 *
 * The item arrives as a render function (`render`), not children: React's
 * `RenderSlot` invokes it from a child so the boundary can catch a throw from
 * the item body itself.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `ChatItemBoundary`. */
export const chatItemBoundaryCases: FeatureComponentCases = {
  component: 'ChatItemBoundary',
  cases: [
    {
      name: 'renders the timeline item untouched',
      props: {
        render: {
          $fn: 'render',
          nodes: [{ tag: 'span', attrs: { 'data-item': '' }, children: ['timeline item'] }],
        },
      },
      callbacks: ['onError'],
    },
    {
      name: 'several nodes render one after another, and onError may be absent',
      props: {
        render: {
          $fn: 'render',
          nodes: [
            { tag: 'header', children: ['Acme'] },
            { tag: 'main', children: ['Timeline item'] },
            { tag: 'footer', children: ['end'] },
          ],
        },
      },
    },
    {
      name: 'a plain text item renders as bare text',
      props: { render: { $fn: 'render', nodes: ['plain item text'] } },
      callbacks: ['onError'],
    },
    {
      name: 'an empty item renders nothing',
      props: { render: { $fn: 'render', nodes: [] } },
      callbacks: ['onError'],
    },
    {
      name: 'an equal re-render keeps the rendered item',
      props: {
        render: { $fn: 'render', nodes: [{ tag: 'main', children: ['Timeline item'] }] },
      },
      callbacks: ['onError'],
      interactions: [
        { type: 'mark', selector: 'main' },
        { type: 'props', props: {} },
      ],
    },
    {
      name: 'a new render prop renders the new item',
      props: {
        render: { $fn: 'renderA', nodes: [{ tag: 'main', children: ['First item'] }] },
      },
      callbacks: ['onError'],
      interactions: [
        {
          type: 'props',
          props: {
            render: { $fn: 'renderB', nodes: [{ tag: 'main', children: ['Second item'] }] },
          },
        },
      ],
    },
    {
      name: 'a locale switch keeps the item',
      props: {
        render: { $fn: 'render', nodes: [{ tag: 'main', children: ['Timeline item'] }] },
      },
      callbacks: ['onError'],
      interactions: [{ type: 'locale', locale: 'en-XA' }],
    },
  ],
}
