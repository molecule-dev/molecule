/**
 * Dropdown, DropdownLabel and DropdownSeparator parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

const triggerButton = [{ tag: 'button', attrs: { type: 'button' }, children: ['Options'] }]

const ITEMS = [
  { value: 'profile', label: 'Profile' },
  { value: 'settings', label: 'Settings', shortcut: '⌘,' },
  { separator: true },
  { value: 'delete', label: 'Delete', disabled: true },
]

/** Dropdown: menu-button pattern — trigger cloning, controlled/uncontrolled open, roving tabindex, selection. */
export const dropdownCases: UIComponentCases = {
  component: 'Dropdown',
  cases: [
    {
      name: 'defaults (closed)',
      props: { items: ITEMS },
      slots: { trigger: triggerButton },
    },
    {
      name: 'click opens the menu',
      fakeTimers: true,
      props: { items: ITEMS },
      slots: { trigger: triggerButton },
      interactions: [{ type: 'click', selector: 'button' }],
    },
    {
      name: 'controlled open on mount',
      fakeTimers: true,
      props: { items: ITEMS, open: true },
      slots: { trigger: triggerButton },
    },
    {
      name: 'controlled open false',
      props: { items: ITEMS, open: false },
      slots: { trigger: triggerButton },
    },
    {
      name: 'controlled open toggles with props',
      fakeTimers: true,
      props: { items: ITEMS, open: false },
      slots: { trigger: triggerButton },
      interactions: [{ type: 'props', props: { open: true } }],
    },
    {
      name: 'text trigger gets a button wrapper',
      fakeTimers: true,
      props: { items: ITEMS },
      slots: { trigger: ['Options'] },
      interactions: [{ type: 'click', selector: '[role="button"]' }],
    },
    ...(['bottom-end', 'top-start', 'left', 'right'] as const).map((placement) => ({
      name: `placement ${placement}`,
      fakeTimers: true,
      props: { items: ITEMS, open: true, placement },
      slots: { trigger: triggerButton },
    })),
    ...(['center', 'end'] as const).map((align) => ({
      name: `align ${align}`,
      fakeTimers: true,
      props: { items: ITEMS, open: true, align },
      slots: { trigger: triggerButton },
    })),
    {
      name: 'numeric width',
      fakeTimers: true,
      props: { items: ITEMS, open: true, width: 240 },
      slots: { trigger: triggerButton },
    },
    {
      name: 'width auto',
      fakeTimers: true,
      props: { items: ITEMS, open: true, width: 'auto' },
      slots: { trigger: triggerButton },
    },
    {
      name: 'width trigger after opening',
      fakeTimers: true,
      props: { items: ITEMS, width: 'trigger' },
      slots: { trigger: triggerButton },
      interactions: [{ type: 'click', selector: 'button' }],
    },
    {
      name: 'separator and disabled items render',
      fakeTimers: true,
      props: { items: ITEMS, open: true },
      slots: { trigger: triggerButton },
    },
    {
      name: 'empty items list',
      fakeTimers: true,
      props: { items: [], open: true },
      slots: { trigger: triggerButton },
    },
    {
      name: 'selecting an item calls onSelect and closes',
      fakeTimers: true,
      props: { items: ITEMS },
      callbacks: ['onSelect'],
      slots: { trigger: triggerButton },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'click', selector: '[role="menuitem"]' },
      ],
    },
    {
      name: 'enter on a menuitem selects it',
      fakeTimers: true,
      props: { items: ITEMS },
      callbacks: ['onSelect'],
      slots: { trigger: triggerButton },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'keydown', selector: '[role="menuitem"]', key: 'Enter' },
      ],
    },
    {
      name: 'disabled item does not select',
      fakeTimers: true,
      props: { items: ITEMS, open: true },
      callbacks: ['onSelect'],
      slots: { trigger: triggerButton },
      interactions: [{ type: 'click', selector: '[aria-disabled="true"]' }],
    },
    {
      name: 'escape closes and returns focus to the trigger',
      fakeTimers: true,
      props: { items: ITEMS },
      slots: { trigger: triggerButton },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'keydown', selector: 'button', key: 'Escape' },
      ],
    },
    {
      name: 'outside click closes without refocusing',
      fakeTimers: true,
      props: { items: ITEMS },
      slots: { trigger: triggerButton },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'click', selector: 'body' },
      ],
    },
    {
      name: 'enter opens the menu',
      fakeTimers: true,
      props: { items: ITEMS },
      slots: { trigger: triggerButton },
      interactions: [{ type: 'keydown', selector: 'button', key: 'Enter' }],
    },
    {
      name: 'arrow up opens to the last item',
      fakeTimers: true,
      props: { items: ITEMS },
      slots: { trigger: triggerButton },
      interactions: [{ type: 'keydown', selector: 'button', key: 'ArrowUp' }],
    },
    {
      name: 'arrow down moves the roving tabindex',
      fakeTimers: true,
      props: { items: ITEMS },
      slots: { trigger: triggerButton },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'keydown', selector: '[role="menu"]', key: 'ArrowDown' },
      ],
    },
    {
      name: 'home and end navigate the items',
      fakeTimers: true,
      props: { items: ITEMS },
      slots: { trigger: triggerButton },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'keydown', selector: '[role="menu"]', key: 'End' },
        { type: 'keydown', selector: '[role="menu"]', key: 'Home' },
      ],
    },
    {
      name: 'tab closes the menu',
      fakeTimers: true,
      props: { items: ITEMS },
      slots: { trigger: triggerButton },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'keydown', selector: '[role="menu"]', key: 'Tab' },
      ],
    },
    {
      name: 'onOpenChange fires on mount and toggle',
      fakeTimers: true,
      props: { items: ITEMS },
      callbacks: ['onOpenChange'],
      slots: { trigger: triggerButton },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'keydown', selector: 'button', key: 'Escape' },
      ],
    },
    {
      name: 'className, style and testId',
      fakeTimers: true,
      props: {
        items: ITEMS,
        open: true,
        className: 'parity-token',
        style: { marginTop: '4px' },
        testId: 'actions',
      },
      slots: { trigger: triggerButton },
    },
    {
      name: 'item icon as a component node',
      fakeTimers: true,
      props: {
        open: true,
        items: [
          {
            value: 'save',
            label: 'Save',
            icon: { $nodes: [{ component: 'Icon', props: { name: 'check' } }] },
          },
          {
            value: 'open',
            label: 'Open',
            icon: { $nodes: [{ component: 'Icon', props: { name: 'folder' } }] },
          },
          { value: 'plain', label: 'No icon' },
        ],
      },
      slots: { trigger: triggerButton },
    },
    {
      name: 'item icon as an element node',
      fakeTimers: true,
      props: {
        open: true,
        items: [{ value: 'a', label: 'A', icon: { $nodes: [{ tag: 'strong', children: ['!'] }] } }],
      },
      slots: { trigger: triggerButton },
    },
    {
      name: 'selecting an item returns focus to the trigger',
      fakeTimers: true,
      props: { items: ITEMS },
      callbacks: ['onSelect'],
      slots: { trigger: triggerButton },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'click', selector: '[role="menuitem"]' },
      ],
    },
    {
      name: 'route change closes the open menu',
      fakeTimers: true,
      props: { items: ITEMS },
      slots: { trigger: triggerButton },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'navigate', to: '/elsewhere' },
      ],
    },
  ],
}

/** DropdownLabel: group label inside a dropdown menu. */
export const dropdownLabelCases: UIComponentCases = {
  component: 'DropdownLabel',
  cases: [
    { name: 'defaults', children: ['Actions'] },
    { name: 'element children', children: [{ tag: 'strong', children: ['Danger'] }, ' zone'] },
    { name: 'className', props: { className: 'parity-token' }, children: ['Actions'] },
  ],
}

/** DropdownSeparator: dividing rule inside a dropdown menu. */
export const dropdownSeparatorCases: UIComponentCases = {
  component: 'DropdownSeparator',
  cases: [{ name: 'defaults' }, { name: 'className', props: { className: 'parity-token' } }],
}
