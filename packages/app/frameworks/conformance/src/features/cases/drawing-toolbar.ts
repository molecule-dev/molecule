/**
 * `@molecule/app-drawing-toolbar-react` cases: the `role="toolbar"` row of
 * tool buttons (default and custom tool lists), the controlled selection
 * (variant + `aria-pressed`), the label fallback for iconless tools, node
 * icons, the `extras` slot, orientation, className and the `onSelect` calls.
 *
 * @module
 */

import type { CaseA11y } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** The case passes a tool with an empty label. */
const EMPTY_TOOL_LABEL: CaseA11y = {
  expect: ['button-name'],
  reason: 'The case passes a tool with an empty label',
}

const selectTool = { id: 'select', label: 'Select', icon: '↖' }
const penTool = { id: 'pen', label: 'Pen', icon: '✎' }
const rectTool = { id: 'rectangle', label: 'Rectangle', icon: '▭' }

/** `@molecule/app-drawing-toolbar-react`. */
export const drawingToolbarFeature: FeatureCases = {
  package: '@molecule/app-drawing-toolbar-react',
  families: [
    {
      component: 'DrawingToolbar',
      cases: [
        {
          name: 'three tools, one selected',
          props: { tools: [selectTool, penTool, rectTool], selectedId: 'pen' },
          callbacks: ['onSelect'],
        },
        {
          name: 'the default tools, nothing selected',
          callbacks: ['onSelect'],
        },
        {
          name: 'vertical orientation',
          props: { tools: [selectTool, penTool], selectedId: 'select', orientation: 'vertical' },
          callbacks: ['onSelect'],
        },
        {
          name: 'className passthrough',
          props: { tools: [selectTool, penTool], selectedId: 'select', className: 'parity-token' },
          callbacks: ['onSelect'],
        },
        {
          name: 'node icons render inside their buttons',
          props: {
            tools: [
              selectTool,
              {
                id: 'shapes',
                label: 'Shapes',
                icon: { $nodes: [{ tag: 'svg', attrs: { 'data-icon': 'shapes' }, children: [] }] },
              },
            ],
            selectedId: 'select',
          },
          callbacks: ['onSelect'],
        },
        {
          name: 'an iconless tool falls back to its first character',
          a11y: EMPTY_TOOL_LABEL,
          props: {
            tools: [
              { id: 'text', label: 'Text' },
              { id: 'mute', label: '' },
            ],
            selectedId: 'text',
          },
          callbacks: ['onSelect'],
        },
        {
          name: 'extras render after the tools',
          props: { tools: [selectTool, penTool], selectedId: 'select' },
          slots: {
            extras: [
              { tag: 'span', attrs: { 'data-extras': 'width' }, children: ['2px'] },
              { tag: 'span', attrs: { 'data-extras': 'color' }, children: ['#333'] },
            ],
          },
          callbacks: ['onSelect'],
        },
        {
          name: 'a selected id with no matching tool selects nothing',
          props: { tools: [selectTool, penTool], selectedId: 'magic-wand' },
          callbacks: ['onSelect'],
        },
        {
          name: 'a click calls onSelect with the tool id',
          props: { tools: [selectTool, penTool, rectTool], selectedId: 'select' },
          callbacks: ['onSelect'],
          interactions: [
            { type: 'click', selector: '[role="toolbar"] > button:nth-of-type(2)' },
            { type: 'click', selector: '[role="toolbar"] > button:nth-of-type(1)' },
          ],
        },
        {
          name: 'the selection follows a props change',
          props: { tools: [selectTool, penTool, rectTool], selectedId: 'select' },
          callbacks: ['onSelect'],
          interactions: [
            { type: 'props', props: { selectedId: 'pen' } },
            { type: 'props', props: { selectedId: 'rectangle' } },
          ],
        },
        {
          name: 'tools replaced on a props change',
          props: { tools: [selectTool, penTool], selectedId: 'pen' },
          callbacks: ['onSelect'],
          interactions: [
            {
              type: 'props',
              props: {
                tools: [{ id: 'eraser', label: 'Eraser', icon: '⌫' }],
                selectedId: 'eraser',
              },
            },
          ],
        },
        {
          name: 'orientation changes',
          props: { tools: [selectTool, penTool], selectedId: 'select' },
          callbacks: ['onSelect'],
          interactions: [{ type: 'props', props: { orientation: 'vertical' } }],
        },
      ],
      keyedLists: [{ prop: 'tools', selector: '[role="toolbar"] > button' }],
    },
  ],
}
