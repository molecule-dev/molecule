/**
 * `@molecule/app-action-menu-react` cases: the kebab trigger, the popover list
 * and every item branch, with open/close through click, outside mousedown and
 * Escape.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Two plain items, one of them destructive. */
const items = [
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete', destructive: true },
]

/** Two items whose click handler the case records as `itemClick`. */
const actionItems = [
  { id: 'edit', label: 'Edit', onClick: { $callback: 'itemClick' } },
  { id: 'delete', label: 'Delete', destructive: true, onClick: { $callback: 'itemClick' } },
]

const trigger = '[data-mol-id="action-menu-trigger"]'
const openMenu = { type: 'click', selector: trigger } as const

/** `@molecule/app-action-menu-react`. */
export const actionMenuFeature: FeatureCases = {
  package: '@molecule/app-action-menu-react',
  families: [
    {
      component: 'ActionMenu',
      cases: [
        { name: 'items only', props: { items }, interactions: [openMenu] },
        {
          name: 'custom trigger label',
          props: { items, triggerAriaLabel: 'Row actions' },
          interactions: [openMenu],
        },
        { name: 'left aligned', props: { items, align: 'left' }, interactions: [openMenu] },
        {
          name: 'right aligned explicitly',
          props: { items, align: 'right' },
          interactions: [openMenu],
        },
        {
          name: 'custom trigger node',
          props: { items },
          slots: { trigger: [{ tag: 'span', attrs: { 'data-trigger': '' }, children: ['More'] }] },
          interactions: [openMenu],
        },
        {
          name: 'trigger as a node prop',
          props: {
            items,
            trigger: {
              $nodes: [{ tag: 'strong', attrs: { 'data-trigger': '' }, children: ['⋯'] }],
            },
          },
        },
        {
          name: 'node labels and icons',
          props: {
            items: [
              {
                id: 'edit',
                label: { $nodes: [{ tag: 'strong', children: ['Edit'] }] },
                icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': 'edit' } }] },
              },
              {
                id: 'delete',
                label: { $nodes: [{ tag: 'em', children: ['Delete'] }] },
                icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': 'trash' } }] },
                destructive: true,
              },
            ],
          },
          interactions: [openMenu],
        },
        {
          name: 'href item',
          props: { items: [{ id: 'docs', label: 'Docs', href: '/docs' }] },
          interactions: [openMenu],
        },
        {
          name: 'divider between items',
          props: {
            items: [
              { id: 'edit', label: 'Edit', divider: true },
              { id: 'delete', label: 'Delete', destructive: true },
            ],
          },
          interactions: [openMenu],
        },
        {
          name: 'disabled item',
          props: { items: [{ id: 'edit', label: 'Edit', disabled: true }] },
          interactions: [openMenu],
        },
        {
          name: 'disabled href item',
          props: { items: [{ id: 'docs', label: 'Docs', href: '/docs', disabled: true }] },
          interactions: [openMenu],
        },
        {
          name: 'destructive href item',
          props: { items: [{ id: 'remove', label: 'Remove', href: '/remove', destructive: true }] },
          interactions: [openMenu],
        },
        {
          name: 'all item flags',
          props: {
            items: [
              { id: 'a', label: 'Edit', divider: true, destructive: true, href: '/a' },
              { id: 'b', label: 'Delete', destructive: true, disabled: true },
              {
                id: 'c',
                label: 'Archive',
                icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': '' } }] },
              },
            ],
          },
          interactions: [openMenu],
        },
        {
          name: 'className on the wrapper',
          props: { items, className: 'parity-token' },
          interactions: [openMenu],
        },
        { name: 'no items', props: { items: [] }, interactions: [openMenu] },
        {
          name: 'opens on click',
          props: { items },
          interactions: [openMenu],
        },
        {
          name: 'opens and closes on a second click',
          props: { items },
          interactions: [openMenu, openMenu],
        },
        {
          name: 'item click calls the handler and closes',
          props: { items: actionItems },
          interactions: [
            openMenu,
            { type: 'click', selector: '[data-mol-id="action-menu-item-edit"]' },
          ],
        },
        {
          name: 'destructive item click calls the handler and closes',
          props: { items: actionItems },
          interactions: [
            openMenu,
            { type: 'click', selector: '[data-mol-id="action-menu-item-delete"]' },
          ],
        },
        {
          name: 'href item click closes without calling its handler',
          props: {
            items: [
              { id: 'docs', label: 'Docs', href: '/docs', onClick: { $callback: 'itemClick' } },
              { id: 'delete', label: 'Delete', destructive: true },
            ],
          },
          interactions: [
            openMenu,
            { type: 'click', selector: '[data-mol-id="action-menu-item-docs"]' },
          ],
        },
        {
          name: 'disabled item click calls nothing and stays open',
          props: {
            items: [
              { id: 'edit', label: 'Edit', disabled: true, onClick: { $callback: 'itemClick' } },
            ],
          },
          interactions: [
            openMenu,
            { type: 'click', selector: '[data-mol-id="action-menu-item-edit"]' },
          ],
        },
        {
          name: 'escape closes the menu',
          props: { items },
          interactions: [openMenu, { type: 'keydown', selector: trigger, key: 'Escape' }],
        },
        {
          name: 'another key does not close the menu',
          props: { items },
          interactions: [openMenu, { type: 'keydown', selector: trigger, key: 'Enter' }],
        },
        {
          name: 'a mousedown outside closes the menu',
          props: { items },
          interactions: [openMenu, { type: 'pointerdown', selector: 'body' }],
        },
        {
          name: 'a mousedown inside the list keeps it open',
          props: { items },
          interactions: [
            openMenu,
            { type: 'pointerdown', selector: '[data-mol-id="action-menu-list"]' },
          ],
        },
        {
          name: 'a divider click keeps the menu open',
          props: {
            items: [
              { id: 'edit', label: 'Edit', divider: true },
              { id: 'delete', label: 'Delete' },
            ],
          },
          interactions: [
            openMenu,
            { type: 'click', selector: '[role="menu"] span[aria-hidden="true"]' },
          ],
        },
        {
          name: 'items listed while open',
          props: { items },
          interactions: [openMenu],
        },
        {
          name: 'items change while open',
          props: { items },
          interactions: [
            openMenu,
            { type: 'props', props: { items: [{ id: 'duplicate', label: 'Duplicate' }] } },
          ],
        },
        {
          name: 'align changes while open',
          props: { items, align: 'right' },
          interactions: [openMenu, { type: 'props', props: { align: 'left' } }],
        },
        {
          name: 'trigger changes',
          props: {
            items,
            trigger: { $nodes: [{ tag: 'span', attrs: { 'data-trigger': 'one' } }] },
          },
          interactions: [
            {
              type: 'props',
              props: { trigger: { $nodes: [{ tag: 'b', attrs: { 'data-trigger': 'two' } }] } },
            },
          ],
        },
        {
          name: 'trigger label changes',
          props: { items },
          interactions: [{ type: 'props', props: { triggerAriaLabel: 'More actions' } }],
        },
      ],
      keyedLists: [
        { prop: 'items', selector: '[role="menu"] li', caseName: 'items listed while open' },
      ],
    },
  ],
}
