/**
 * SidebarUserCard parity cases: the sidebar-resident account trigger and its
 * settings drawer.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

const ADA = {
  status: 'authenticated' as const,
  user: { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', avatarUrl: null },
}

const panel = [
  { tag: 'div', attrs: { 'data-mol-id': 'settings-panel' }, children: ['Settings panel body'] },
]

/** SidebarUserCard: identity from auth or props, avatar/initials, drawer open/close. */
export const sidebarUserCardCases: UIComponentCases = {
  component: 'SidebarUserCard',
  cases: [
    {
      name: 'authenticated user with name and email',
      context: { auth: ADA },
      children: panel,
    },
    {
      name: 'explicit name and secondary line override auth',
      context: { auth: ADA },
      props: { name: 'Grace Hopper', secondaryLine: 'Premium member' },
      children: panel,
    },
    {
      name: 'avatar image replaces initials',
      context: { auth: ADA },
      props: { avatarUrl: 'data:image/png;base64,AAAA' },
      children: panel,
    },
    {
      name: 'guest user falls back to the guest label',
      context: { auth: { status: 'unauthenticated' } },
      children: panel,
    },
    {
      name: 'user with only an email',
      context: {
        auth: { status: 'authenticated', user: { id: 'u2', email: 'grace@example.com' } },
      },
      children: panel,
    },
    {
      name: 'no email renders no secondary line',
      context: { auth: { status: 'authenticated', user: { id: 'u3', name: 'Alan' } } },
      children: panel,
    },
    {
      name: 'custom aria label key and default',
      context: { auth: ADA },
      props: { ariaLabelKey: 'sidebar.account', ariaLabelDefault: 'Open account settings' },
      children: panel,
    },
    {
      name: 'dataMolId, className and extra button attributes',
      context: { auth: ADA },
      props: {
        dataMolId: 'sidebar-account',
        className: 'parity-token',
        'data-track': 'account-card',
        title: 'Account',
      },
      children: panel,
    },
    {
      name: 'click opens the settings drawer',
      context: { auth: ADA },
      children: panel,
      interactions: [{ type: 'click', selector: '[data-mol-id="sidebar-user-card"]' }],
    },
    {
      name: 'drawer close button closes',
      context: { auth: ADA },
      children: panel,
      interactions: [
        { type: 'click', selector: '[data-mol-id="sidebar-user-card"]' },
        { type: 'click', selector: '[data-mol-id="modal-close"]' },
      ],
    },
    {
      name: 'secondary line hides when auth has no email',
      context: { auth: { status: 'authenticated', user: { id: 'u4', name: 'Linus' } } },
      props: { secondaryLine: 'Maintainer' },
      children: panel,
    },
    {
      // Focusing the trigger first makes it the opener the drawer must return
      // focus to when the route change closes it.
      name: 'route change closes the drawer and restores focus to the trigger',
      context: { auth: ADA },
      children: panel,
      interactions: [
        { type: 'focus', selector: '[data-mol-id="sidebar-user-card"]' },
        { type: 'click', selector: '[data-mol-id="sidebar-user-card"]' },
        { type: 'navigate', to: '/elsewhere' },
      ],
    },
    {
      name: 'panel closes itself through usePanelClose',
      context: { auth: ADA },
      children: [{ probe: 'usePanelClose', label: 'dismiss drawer' }],
      interactions: [
        { type: 'click', selector: '[data-mol-id="sidebar-user-card"]' },
        { type: 'click', selector: '[data-parity-probe="dismiss drawer"]' },
      ],
    },
  ],
}
