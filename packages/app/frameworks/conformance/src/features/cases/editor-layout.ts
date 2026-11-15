/**
 * `@molecule/app-editor-layout-react` cases: the top bar / canvas / side panel
 * editor scaffold.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const topBar = [{ tag: 'div', attrs: { 'data-topbar': '' }, children: ['Toolbar'] }]
const canvas = [{ tag: 'div', attrs: { 'data-canvas': '' }, children: ['Canvas'] }]
const sidePanel = [{ tag: 'div', attrs: { 'data-panel': '' }, children: ['Panel'] }]

/** `@molecule/app-editor-layout-react`. */
export const editorLayoutFeature: FeatureCases = {
  package: '@molecule/app-editor-layout-react',
  families: [
    {
      component: 'EditorLayout',
      cases: [
        { name: 'top bar and canvas', slots: { topBar, canvas } },
        { name: 'side panel on the right', slots: { topBar, canvas, sidePanel } },
        {
          name: 'side panel on the left',
          slots: { topBar, canvas, sidePanel },
          props: { sidePanelPosition: 'left' },
        },
        {
          name: 'side panel closed',
          slots: { topBar, canvas, sidePanel },
          props: { sidePanelOpen: false },
        },
        {
          name: 'classes and an id',
          slots: { topBar, canvas },
          props: { className: 'parity-editor', dataMolId: 'editor' },
        },
        {
          name: 'panel moves to the other side',
          slots: { topBar, canvas, sidePanel },
          props: { sidePanelPosition: 'left' },
          interactions: [{ type: 'props', props: { sidePanelPosition: 'right' } }],
        },
        {
          name: 'panel toggles',
          slots: { topBar, canvas, sidePanel },
          props: { sidePanelOpen: true },
          interactions: [
            { type: 'props', props: { sidePanelOpen: false } },
            { type: 'props', props: { sidePanelOpen: true } },
          ],
        },
      ],
    },
  ],
}
