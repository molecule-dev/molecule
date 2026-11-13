/**
 * UserMenuPopover parity cases: the inline popover account menu — the root
 * (which owns open state and auto-dismiss) plus, through compositions, its
 * Trigger, Panel and SignOut sub-components.
 *
 * The sub-components read a context only the root provides (`<Trigger>`
 * outside `<UserMenuPopover>` throws by design), so their props are exercised
 * as children of the root; see the layout report for the case-language gap
 * (`mountInside`) that blocks standalone sub-component families.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

const ADA = {
  status: 'authenticated' as const,
  user: { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com' },
}

const navLinks = [
  { tag: 'a', attrs: { href: '/settings' }, children: ['Settings'] },
  { tag: 'a', attrs: { href: '/datasets' }, children: ['My datasets'] },
]

const menu = [
  { component: 'UserMenuPopoverTrigger' },
  {
    component: 'UserMenuPopoverPanel',
    children: [...navLinks, { component: 'UserMenuPopoverSignOut' }],
  },
]

/** UserMenuPopover: identity from auth, disclosure open/close, sign-out service call. */
export const userMenuPopoverCases: UIComponentCases = {
  component: 'UserMenuPopover',
  cases: [
    {
      name: 'closed by default',
      context: { auth: ADA },
      children: menu,
    },
    {
      name: 'trigger click opens the panel',
      context: { auth: ADA },
      children: menu,
      interactions: [{ type: 'click', selector: '[data-mol-id="user-menu"]' }],
    },
    {
      name: 'second click closes the panel',
      context: { auth: ADA },
      children: menu,
      interactions: [
        { type: 'click', selector: '[data-mol-id="user-menu"]' },
        { type: 'click', selector: '[data-mol-id="user-menu"]' },
      ],
    },
    {
      name: 'escape closes the panel',
      context: { auth: ADA },
      children: menu,
      interactions: [
        { type: 'click', selector: '[data-mol-id="user-menu"]' },
        { type: 'keydown', selector: '[data-mol-id="user-menu"]', key: 'Escape' },
      ],
    },
    {
      name: 'click outside closes the panel',
      context: { auth: ADA },
      children: menu,
      interactions: [
        { type: 'click', selector: '[data-mol-id="user-menu"]' },
        { type: 'click', selector: 'body' },
      ],
    },
    {
      name: 'sign out closes the panel and calls auth.logout',
      context: { auth: ADA },
      children: menu,
      interactions: [
        { type: 'click', selector: '[data-mol-id="user-menu"]' },
        { type: 'click', selector: '[data-mol-id="user-menu-sign-out"]' },
      ],
    },
    {
      name: 'guest falls back to the Account label',
      context: { auth: { status: 'unauthenticated' } },
      children: menu,
    },
    {
      name: 'custom guest name',
      context: { auth: { status: 'unauthenticated' } },
      props: { guestName: 'Analyst' },
      children: menu,
    },
    {
      name: 'user without email hides the email lines',
      context: { auth: { status: 'authenticated', user: { id: 'u2', name: 'Alan' } } },
      children: menu,
      interactions: [{ type: 'click', selector: '[data-mol-id="user-menu"]' }],
    },
    {
      name: 'user with only an email uses it as the name',
      context: {
        auth: { status: 'authenticated', user: { id: 'u3', email: 'grace@example.com' } },
      },
      children: menu,
    },
    {
      name: 'trigger aria label, id and class overrides',
      context: { auth: ADA },
      children: [
        {
          component: 'UserMenuPopoverTrigger',
          props: {
            ariaLabelKey: 'nav.account',
            ariaLabelDefault: 'Open account',
            dataMolId: 'account-trigger',
            className: 'parity-token',
          },
        },
        { component: 'UserMenuPopoverPanel', children: navLinks },
      ],
      interactions: [{ type: 'click', selector: '[data-mol-id="account-trigger"]' }],
    },
    {
      name: 'panel aria label, id, class and nav children',
      context: { auth: ADA },
      children: [
        { component: 'UserMenuPopoverTrigger' },
        {
          component: 'UserMenuPopoverPanel',
          props: {
            ariaLabelKey: 'nav.menu',
            ariaLabelDefault: 'Account links',
            dataMolId: 'account-panel',
            className: 'parity-token',
          },
          children: navLinks,
        },
      ],
      interactions: [{ type: 'click', selector: '[data-mol-id="user-menu"]' }],
    },
    {
      name: 'sign out label and id overrides',
      context: { auth: ADA },
      children: [
        { component: 'UserMenuPopoverTrigger' },
        {
          component: 'UserMenuPopoverPanel',
          children: [
            {
              component: 'UserMenuPopoverSignOut',
              props: {
                labelKey: 'nav.exit',
                labelDefault: 'Log out',
                dataMolId: 'exit-button',
                className: 'parity-token',
              },
            },
          ],
        },
      ],
      interactions: [
        { type: 'click', selector: '[data-mol-id="user-menu"]' },
        { type: 'click', selector: '[data-mol-id="exit-button"]' },
      ],
    },
    {
      name: 'container className',
      context: { auth: ADA },
      props: { className: 'parity-token' },
      children: menu,
    },
    {
      name: 'route change closes the open panel',
      context: { auth: ADA },
      children: menu,
      interactions: [
        { type: 'click', selector: '[data-mol-id="user-menu"]' },
        { type: 'navigate', to: '/elsewhere' },
      ],
    },
    {
      name: 'panel closes itself through useUserMenuPopoverClose',
      context: { auth: ADA },
      children: [
        { component: 'UserMenuPopoverTrigger' },
        {
          component: 'UserMenuPopoverPanel',
          children: [...navLinks, { probe: 'useUserMenuPopoverClose', label: 'dismiss popover' }],
        },
      ],
      interactions: [
        { type: 'click', selector: '[data-mol-id="user-menu"]' },
        { type: 'click', selector: '[data-parity-probe="dismiss popover"]' },
      ],
    },
  ],
}
