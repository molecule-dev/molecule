/**
 * `@molecule/app-detail-page-layout-react` cases: the breadcrumb + top bar +
 * [main column + optional sidebar] detail-page scaffold.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const breadcrumb = [{ tag: 'nav', attrs: { 'data-crumb': '' }, children: ['Home'] }]
const topBar = [{ tag: 'div', attrs: { 'data-topbar': '' }, children: ['Title'] }]
const main = [{ tag: 'div', attrs: { 'data-main': '' }, children: ['Body'] }]
const sidebar = [{ tag: 'div', attrs: { 'data-sidebar': '' }, children: ['Related'] }]

/** `@molecule/app-detail-page-layout-react`. */
export const detailPageLayoutFeature: FeatureCases = {
  package: '@molecule/app-detail-page-layout-react',
  families: [
    {
      component: 'DetailPageLayout',
      cases: [
        { name: 'main only', slots: { main } },
        {
          name: 'breadcrumb, top bar and right sidebar',
          slots: { main, breadcrumb, topBar, sidebar },
        },
        {
          name: 'left sidebar',
          props: { sidebarPosition: 'left' },
          slots: { main, sidebar },
        },
        {
          name: 'narrow sidebar with classes and an id',
          props: { sidebarWidth: 'sm', className: 'parity-token', dataMolId: 'detail' },
          slots: { main, sidebar },
        },
        {
          name: 'wide sidebar',
          props: { sidebarWidth: 'lg' },
          slots: { main, sidebar },
        },
        {
          name: 'sidebar position changes',
          props: { sidebarPosition: 'right' },
          slots: { main, sidebar },
          interactions: [{ type: 'props', props: { sidebarPosition: 'left' } }],
        },
        {
          name: 'sidebar width changes',
          props: { sidebarWidth: 'md' },
          slots: { main, sidebar },
          interactions: [{ type: 'props', props: { sidebarWidth: 'lg' } }],
        },
      ],
    },
  ],
}
