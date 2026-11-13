/**
 * UserMenu parity cases: the avatar trigger that opens the app settings panel
 * in a drawer.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

const panel = [
  { tag: 'div', attrs: { 'data-mol-id': 'settings-panel' }, children: ['Settings panel body'] },
]

/** UserMenu: trigger variants, disabled and intercepted clicks, drawer sides. */
export const userMenuCases: UIComponentCases = {
  component: 'UserMenu',
  cases: [
    { name: 'defaults', children: panel },
    {
      name: 'custom aria label key and default',
      props: { ariaLabelKey: 'nav.account', ariaLabelDefault: 'Open account' },
      children: panel,
    },
    {
      name: 'custom trigger icon and size',
      props: { triggerIcon: 'gear', triggerIconSize: 24 },
      children: panel,
    },
    {
      name: 'dataMolId and className',
      props: { dataMolId: 'header-user-menu', className: 'parity-token' },
      children: panel,
    },
    {
      name: 'click opens the drawer',
      children: panel,
      interactions: [{ type: 'click', selector: '[data-mol-id="user-menu"]' }],
    },
    {
      name: 'drawer close button closes',
      children: panel,
      interactions: [
        { type: 'click', selector: '[data-mol-id="user-menu"]' },
        { type: 'click', selector: '[data-mol-id="modal-close"]' },
      ],
    },
    {
      name: 'drawer opens from the left side',
      props: { side: 'left' },
      children: panel,
      interactions: [{ type: 'click', selector: '[data-mol-id="user-menu"]' }],
    },
    {
      name: 'drawer opens from the right side',
      props: { side: 'right' },
      children: panel,
      interactions: [{ type: 'click', selector: '[data-mol-id="user-menu"]' }],
    },
    {
      name: 'disabled click does not open the drawer',
      props: { disabled: true },
      children: panel,
      interactions: [{ type: 'click', selector: '[data-mol-id="user-menu"]' }],
    },
    {
      name: 'custom onClick intercepts instead of opening',
      callbacks: ['onClick'],
      children: panel,
      interactions: [{ type: 'click', selector: '[data-mol-id="user-menu"]' }],
    },
    {
      name: 'panel children render inside the drawer',
      children: [
        {
          component: 'PanelCloseProvider',
          children: [{ tag: 'p', children: ['Nested panel copy'] }],
        },
      ],
      interactions: [{ type: 'click', selector: '[data-mol-id="user-menu"]' }],
    },
    {
      // Focusing the trigger first makes it the opener the drawer must return
      // focus to when the route change closes it.
      name: 'route change closes the drawer and restores focus to the trigger',
      children: panel,
      interactions: [
        { type: 'focus', selector: '[data-mol-id="user-menu"]' },
        { type: 'click', selector: '[data-mol-id="user-menu"]' },
        { type: 'navigate', to: '/elsewhere' },
      ],
    },
    {
      name: 'panel closes itself through usePanelClose',
      children: [{ probe: 'usePanelClose', label: 'dismiss drawer' }],
      interactions: [
        { type: 'click', selector: '[data-mol-id="user-menu"]' },
        { type: 'click', selector: '[data-parity-probe="dismiss drawer"]' },
      ],
    },
  ],
}
