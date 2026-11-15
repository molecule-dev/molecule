/**
 * `@molecule/app-bulk-action-toolbar-react` cases: the selection count, the
 * per-action buttons (icons, labels, variants, disabled), the clear button,
 * the sticky positions and the callbacks.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const archiveClick = { $callback: 'archiveClick' }
const deleteClick = { $callback: 'deleteClick' }
const exportClick = { $callback: 'exportClick' }

const archive = { id: 'archive', label: 'Archive', onClick: archiveClick }
const remove = {
  id: 'delete',
  label: 'Delete',
  onClick: deleteClick,
  destructive: true,
}
const archiveWithIcon = {
  id: 'archive',
  label: 'Archive',
  onClick: archiveClick,
  icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': '' } }] },
}
const removeWithIcon = {
  id: 'delete',
  label: 'Delete',
  onClick: deleteClick,
  destructive: true,
  icon: { $nodes: [{ tag: 'svg', attrs: { 'data-icon': 'trash' }, children: [] }] },
}
const exportOnly = { id: 'export', label: 'Export', onClick: exportClick }

/** `@molecule/app-bulk-action-toolbar-react`. */
export const bulkActionToolbarFeature: FeatureCases = {
  package: '@molecule/app-bulk-action-toolbar-react',
  families: [
    {
      component: 'BulkActionToolbar',
      cases: [
        { name: 'count zero renders nothing', props: { count: 0, actions: [] } },
        { name: 'negative count renders nothing', props: { count: -1, actions: [archive] } },
        {
          name: 'two plain actions',
          props: { count: 2, actions: [archive, remove] },
        },
        {
          name: 'icons on the actions',
          props: { count: 3, actions: [archiveWithIcon, removeWithIcon] },
        },
        {
          name: 'node labels',
          props: {
            count: 1,
            actions: [
              {
                id: 'first',
                label: { $nodes: [{ tag: 'strong', children: ['First'] }] },
                onClick: archiveClick,
              },
              exportOnly,
            ],
          },
        },
        {
          name: 'an empty label renders the icon only',
          props: {
            count: 1,
            actions: [
              {
                id: 'mute',
                label: '',
                onClick: exportClick,
                icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': 'mute' } }] },
              },
            ],
          },
        },
        {
          name: 'an icon-only action without a label',
          props: {
            count: 1,
            actions: [
              {
                id: 'mute',
                onClick: exportClick,
                icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': 'mute' } }] },
              },
            ],
          },
        },
        {
          name: 'a disabled action',
          props: {
            count: 1,
            actions: [{ id: 'x', label: 'X', onClick: exportClick, disabled: true }],
          },
        },
        { name: 'no actions renders the count only', props: { count: 1, actions: [] } },
        {
          name: 'className passthrough',
          props: { count: 1, actions: [archive], className: 'parity-token' },
        },
        {
          name: 'sticky-top position',
          props: { count: 1, actions: [archive], position: 'sticky-top' },
        },
        {
          name: 'inline position renders no style',
          props: { count: 1, actions: [archive], position: 'inline' },
        },
        {
          name: 'the clear button renders only with onClearSelection',
          props: { count: 1, actions: [archive] },
          callbacks: ['onClearSelection'],
        },
        {
          name: 'clear button click calls onClearSelection',
          props: { count: 1, actions: [archive] },
          callbacks: ['onClearSelection'],
          interactions: [
            { type: 'click', selector: '[role="region"] > div > button:nth-of-type(2)' },
          ],
        },
        {
          name: 'each action calls its own callback',
          props: { count: 2, actions: [archive, remove] },
          interactions: [
            { type: 'click', selector: '[role="region"] > div > button:nth-of-type(1)' },
            { type: 'click', selector: '[role="region"] > div > button:nth-of-type(2)' },
          ],
        },
        {
          name: 'position changes',
          props: { count: 1, actions: [archive] },
          interactions: [
            { type: 'props', props: { position: 'sticky-top' } },
            { type: 'props', props: { position: 'inline' } },
          ],
        },
        {
          name: 'count change hides the toolbar',
          props: { count: 1, actions: [archive] },
          interactions: [{ type: 'props', props: { count: 0 } }],
        },
        {
          name: 'count change shows the toolbar',
          props: { count: 0, actions: [archive] },
          interactions: [{ type: 'props', props: { count: 2 } }],
        },
        {
          name: 'the count text follows the count',
          props: { count: 1, actions: [archive] },
          interactions: [{ type: 'props', props: { count: 12 } }],
        },
        {
          name: 'actions change re-renders the buttons',
          props: { count: 1, actions: [archive, remove] },
          interactions: [{ type: 'props', props: { actions: [exportOnly] } }],
        },
        {
          name: 'a disabled change follows the props',
          props: { count: 1, actions: [exportOnly] },
          interactions: [
            {
              type: 'props',
              props: {
                actions: [{ id: 'export', label: 'Export', onClick: exportClick, disabled: true }],
              },
            },
          ],
        },
        {
          name: 'a label change follows the props',
          props: { count: 1, actions: [exportOnly] },
          interactions: [
            {
              type: 'props',
              props: { actions: [{ id: 'export', label: 'Send it', onClick: exportClick }] },
            },
          ],
        },
        {
          name: 'destructive follows the props',
          props: { count: 1, actions: [exportOnly] },
          interactions: [
            {
              type: 'props',
              props: {
                actions: [
                  { id: 'export', label: 'Export', onClick: exportClick, destructive: true },
                ],
              },
            },
          ],
        },
        {
          name: 'an icon appears on a later render',
          props: { count: 1, actions: [exportOnly] },
          interactions: [
            {
              type: 'props',
              props: {
                actions: [
                  {
                    id: 'export',
                    label: 'Export',
                    onClick: exportClick,
                    icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': 'late' } }] },
                  },
                ],
              },
            },
          ],
        },
      ],
      keyedLists: [
        {
          prop: 'actions',
          selector: '[role="region"] > div > button',
          caseName: 'two plain actions',
        },
      ],
    },
  ],
}
