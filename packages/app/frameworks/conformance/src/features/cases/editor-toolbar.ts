/**
 * `@molecule/app-editor-toolbar-react` cases: the title / badge / leading row,
 * the primary and secondary action buttons (button defaults, every variant and
 * color, icons, node and empty labels, disabled, `href` anchors), the divider
 * between the two groups, the sticky position, `className` / `data-mol-id`
 * passthrough and every action callback.
 *
 * @module
 */

import type { CaseA11y } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** The case passes an item with an empty label. */
const EMPTY_LABEL: CaseA11y = {
  expect: ['button-name'],
  reason: 'The case passes an item with an empty label',
}

const saveClick = { $callback: 'saveClick' }
const publishClick = { $callback: 'publishClick' }
const helpClick = { $callback: 'helpClick' }
const themeClick = { $callback: 'themeClick' }
const exportClick = { $callback: 'exportClick' }
const lateClick = { $callback: 'lateClick' }

const save = { id: 'save', label: 'Save', onClick: saveClick }
const publish = { id: 'publish', label: 'Publish', onClick: publishClick }
const help = { id: 'help', label: 'Help', onClick: helpClick }

/** `@molecule/app-editor-toolbar-react`. */
export const editorToolbarFeature: FeatureCases = {
  package: '@molecule/app-editor-toolbar-react',
  families: [
    {
      component: 'EditorToolbar',
      cases: [
        { name: 'title only', slots: { title: ['My Post'] } },
        {
          name: 'title, badge and leading',
          slots: {
            leading: [{ tag: 'span', attrs: { 'data-leading': '' }, children: ['Back'] }],
            title: ['Draft'],
            badge: [{ tag: 'span', attrs: { 'data-badge': '' }, children: ['v3'] }],
          },
        },
        {
          name: 'a node title renders inside the heading',
          slots: {
            title: [{ tag: 'strong', attrs: { 'data-title-node': '' }, children: ['Draft'] }],
          },
        },
        {
          name: 'primary actions with the button defaults',
          slots: { title: ['Draft'] },
          props: { primaryActions: [save] },
        },
        {
          name: 'each variant value',
          slots: { title: ['Draft'] },
          props: {
            primaryActions: [
              { id: 'solid', label: 'Solid', variant: 'solid', onClick: saveClick },
              { id: 'outline', label: 'Outline', variant: 'outline', onClick: saveClick },
              { id: 'ghost', label: 'Ghost', variant: 'ghost', onClick: saveClick },
              { id: 'link', label: 'Link', variant: 'link', onClick: saveClick },
            ],
          },
        },
        {
          name: 'each color value',
          slots: { title: ['Draft'] },
          props: {
            primaryActions: [
              { id: 'primary', label: 'Primary', color: 'primary', onClick: saveClick },
              { id: 'secondary', label: 'Secondary', color: 'secondary', onClick: saveClick },
              { id: 'success', label: 'Success', color: 'success', onClick: saveClick },
              { id: 'warning', label: 'Warning', color: 'warning', onClick: saveClick },
              { id: 'error', label: 'Error', color: 'error', onClick: saveClick },
              { id: 'info', label: 'Info', color: 'info', onClick: saveClick },
            ],
          },
        },
        {
          name: 'icons, a node label and an empty label',
          a11y: EMPTY_LABEL,
          slots: { title: ['Draft'] },
          props: {
            primaryActions: [
              {
                id: 'bold',
                label: 'Bold',
                icon: { $nodes: [{ tag: 'svg', attrs: { 'data-icon': 'bold' }, children: [] }] },
                onClick: saveClick,
              },
              {
                id: 'italic',
                label: { $nodes: [{ tag: 'em', attrs: { 'data-label': 'italic' }, children: [] }] },
                onClick: saveClick,
              },
              {
                id: 'mute',
                label: 'Mute',
                icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': 'mute' }, children: [] }] },
              },
              { id: 'text', label: 'Text', onClick: saveClick },
              { id: 'blank', label: '', onClick: saveClick },
            ],
          },
        },
        {
          name: 'secondary actions alone render no divider',
          slots: { title: ['Draft'] },
          props: { secondaryActions: [help] },
        },
        {
          name: 'primary and secondary actions show a divider',
          slots: { title: ['Draft'] },
          props: {
            primaryActions: [save, publish],
            secondaryActions: [help, { id: 'theme', label: 'Theme', onClick: themeClick }],
          },
        },
        {
          name: 'a disabled action',
          slots: { title: ['Draft'] },
          props: { primaryActions: [{ ...save, disabled: true }] },
        },
        {
          name: 'an href action wraps its button in an anchor',
          slots: { title: ['Draft'] },
          props: {
            dataMolId: 'toolbar',
            primaryActions: [{ id: 'view', label: 'View', href: '/preview', onClick: saveClick }],
          },
          interactions: [{ type: 'click', selector: '[data-mol-id="toolbar"] a button' }],
        },
        {
          name: 'an empty href renders no anchor',
          slots: { title: ['Draft'] },
          props: { primaryActions: [{ id: 'view', label: 'View', href: '', onClick: saveClick }] },
        },
        {
          name: 'sticky false drops the inline style',
          slots: { title: ['Draft'] },
          props: { sticky: false },
        },
        {
          name: 'className and data-mol-id',
          slots: { title: ['Draft'] },
          props: { className: 'parity-token', dataMolId: 'toolbar' },
        },
        {
          name: 'two primary actions',
          slots: { title: ['Draft'] },
          props: {
            dataMolId: 'toolbar',
            primaryActions: [save, { id: 'export', label: 'Export', onClick: exportClick }],
          },
        },
        {
          name: 'each action calls its own callback',
          slots: { title: ['Draft'] },
          props: {
            dataMolId: 'toolbar',
            primaryActions: [save, publish],
            secondaryActions: [help],
          },
          interactions: [
            { type: 'click', selector: '[data-mol-id="toolbar"] button:nth-of-type(1)' },
            { type: 'click', selector: '[data-mol-id="toolbar"] button:nth-of-type(2)' },
            { type: 'click', selector: '[data-mol-id="toolbar"] button:nth-of-type(3)' },
          ],
        },
        {
          name: 'an action without a click handler records nothing',
          slots: { title: ['Draft'] },
          props: { dataMolId: 'toolbar', primaryActions: [{ id: 'mute', label: 'Mute' }] },
          interactions: [{ type: 'click', selector: '[data-mol-id="toolbar"] button' }],
        },
        {
          name: 'sticky and className change',
          slots: { title: ['Draft'] },
          props: { dataMolId: 'toolbar' },
          interactions: [
            { type: 'props', props: { sticky: false } },
            { type: 'props', props: { className: 'parity-late', sticky: true } },
          ],
        },
        {
          name: 'actions change re-renders the buttons',
          slots: { title: ['Draft'] },
          props: { primaryActions: [save, publish] },
          interactions: [
            {
              type: 'props',
              props: { primaryActions: [{ id: 'export', label: 'Export', onClick: exportClick }] },
            },
          ],
        },
        {
          name: 'primary emptied removes the divider',
          slots: { title: ['Draft'] },
          props: { primaryActions: [save], secondaryActions: [help] },
          interactions: [{ type: 'props', props: { primaryActions: [] } }],
        },
        {
          name: 'secondary appears later and adds the divider',
          slots: { title: ['Draft'] },
          props: { primaryActions: [save] },
          interactions: [{ type: 'props', props: { secondaryActions: [help] } }],
        },
        {
          name: 'an icon and a label appear on a later render',
          a11y: EMPTY_LABEL,
          slots: { title: ['Draft'] },
          props: { primaryActions: [{ id: 'late', onClick: lateClick }] },
          interactions: [
            {
              type: 'props',
              props: {
                primaryActions: [
                  {
                    id: 'late',
                    label: 'Late',
                    icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': 'late' }, children: [] }] },
                    onClick: lateClick,
                  },
                ],
              },
            },
          ],
        },
      ],
      keyedLists: [{ prop: 'primaryActions', selector: 'button', caseName: 'two primary actions' }],
    },
  ],
}
