/**
 * `@molecule/app-root-error-boundary-react` cases: the top-level boundary
 * passing its children through untouched, across re-renders.
 *
 * The errored branch (the localized recovery alert) cannot run here: React
 * reports every caught render error on the console, and this kit refuses to
 * record a case whose React reference logs. The framework packages exercise
 * it in their own unit tests.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** `@molecule/app-root-error-boundary-react`. */
export const rootErrorBoundaryFeature: FeatureCases = {
  package: '@molecule/app-root-error-boundary-react',
  families: [
    {
      component: 'RootErrorBoundary',
      cases: [
        { name: 'text child', children: ['App content'] },
        {
          name: 'element child',
          children: [{ tag: 'main', attrs: { 'data-app': '' }, children: ['app content'] }],
        },
        {
          name: 'several children',
          children: [
            { tag: 'header', children: ['Acme'] },
            { tag: 'main', children: ['Main content'] },
            { tag: 'footer', children: ['© Acme'] },
          ],
        },
        {
          name: 'children survive a re-render',
          children: [{ tag: 'main', children: ['Main content'] }],
          interactions: [
            { type: 'mark', selector: 'main' },
            { type: 'props', props: {} },
          ],
        },
        {
          name: 'children survive a locale switch',
          children: [{ tag: 'main', children: ['Main content'] }],
          interactions: [{ type: 'locale', locale: 'en-XA' }],
        },
        { name: 'empty children', children: [] },
      ],
    },
  ],
}
