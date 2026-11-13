/**
 * PanelCloseProvider parity cases: the panel-close context provider.
 *
 * The provider renders its children with NO wrapper DOM — that invisible fact
 * is the parity contract (Vue/Solid/Svelte/Angular must also render the
 * children unwrapped). A `usePanelClose` probe child clicks the provided close
 * callback, recording it; consumers inside `UserMenu` / `SidebarUserCard`
 * drawers are covered by those families' probe cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** PanelCloseProvider: children render without any provider DOM; the context close callback fires. */
export const panelCloseProviderCases: UIComponentCases = {
  component: 'PanelCloseProvider',
  cases: [
    {
      name: 'renders children without wrapper dom',
      callbacks: ['close'],
      children: [
        { tag: 'div', attrs: { 'data-mol-id': 'settings-panel' }, children: ['Panel body'] },
      ],
    },
    {
      name: 'multiple children of mixed kinds',
      children: [
        { tag: 'h2', children: ['Settings'] },
        { tag: 'p', children: ['Panel content'] },
        'trailing text',
      ],
    },
    {
      name: 'usePanelClose probe records the provided close callback',
      callbacks: ['close'],
      children: [
        { probe: 'usePanelClose', label: 'dismiss panel' },
        { tag: 'p', children: ['Panel body'] },
      ],
      interactions: [{ type: 'click', selector: '[data-parity-probe="dismiss panel"]' }],
    },
    {
      name: 'usePanelClose probe renders with no provider wrapper',
      callbacks: ['close'],
      children: [{ probe: 'usePanelClose', label: 'dismiss panel' }],
    },
  ],
}
