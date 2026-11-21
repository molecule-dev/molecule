/**
 * `@molecule/app-node-editor-panel-react` cases: the properties-panel chrome
 * (`<NodeEditorPanel>`) and its section, slider, toggle and radio primitives.
 *
 * Every runtime export is a component, so there are no `values`, `hooks` or
 * `frameworkShaped` entries. Node-valued props (`title`, `footer`, `label`,
 * `trailing`, `valueDisplay`, `subtitle`) are listed under `slots` and also
 * exercised as plain strings through `props`, so both the node branch and the
 * string branch of each prop is compared. `onClose`, `onChange` and both
 * toggle/radio change handlers are listed in `callbacks`; the interaction
 * cases click, type into the range input and re-pass props.
 *
 * @module
 */

import type { CaseA11y } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** The case passes an empty `ariaLabel` on purpose, so the switch has no name. */
const EMPTY_SWITCH_LABEL: CaseA11y = {
  expect: ['button-name'],
  reason: 'The case passes an empty aria label, which the switch keeps verbatim',
}

/** The radio list's three options, the middle one selected by default. */
const formatOptions = [
  { value: 'conversational', label: 'Conversational' },
  { value: 'structured', label: 'Structured' },
  { value: 'hybrid', label: 'Hybrid' },
]

/** The same options with node-valued labels. */
const nodeLabelOptions = [
  { value: 'conversational', label: { $nodes: [{ tag: 'em', children: ['Conversational'] }] } },
  { value: 'structured', label: { $nodes: [{ tag: 'strong', children: ['Structured'] }] } },
]

/** A panel title, as the `title` slot. */
const title = ['Node Properties']

/** A footer slot holding the save bar plus a status row. */
const footer = [
  {
    tag: 'div',
    attrs: { 'data-footer': '' },
    children: ['Save', { tag: 'span', children: ['Saved'] }],
  },
]

/** `@molecule/app-node-editor-panel-react`. */
export const nodeEditorPanelFeature: FeatureCases = {
  package: '@molecule/app-node-editor-panel-react',
  families: [
    {
      component: 'NodeEditorPanel',
      cases: [
        { name: 'title only', slots: { title } },
        { name: 'string title', props: { title: 'Node Properties' } },
        {
          name: 'title, body, footer and close button',
          slots: { title, footer },
          children: ['Body content'],
          callbacks: ['onClose'],
        },
        {
          name: 'close button keeps the default aria label',
          slots: { title },
          callbacks: ['onClose'],
        },
        {
          name: 'close aria label override',
          slots: { title },
          props: { closeAriaLabel: 'Hide properties' },
          callbacks: ['onClose'],
        },
        {
          name: 'empty close aria label',
          slots: { title },
          props: { closeAriaLabel: '' },
          callbacks: ['onClose'],
        },
        {
          name: 'width class override',
          slots: { title },
          props: { widthClass: 'w-96' },
        },
        { name: 'default width', slots: { title } },
        {
          name: 'string footer renders in the footer row',
          props: { title: 'Node Properties', footer: 'Saved' },
        },
        {
          name: 'empty footer renders no footer row',
          props: { title: 'Node Properties', footer: '' },
        },
        {
          name: 'node children',
          slots: { title },
          children: [
            { tag: 'p', attrs: { 'data-body': '' }, children: ['Body'] },
            { tag: 'span', children: ['More'] },
          ],
        },
        {
          name: 'clicking close calls onClose',
          slots: { title },
          callbacks: ['onClose'],
          interactions: [{ type: 'click', selector: '[data-mol-id="node-editor-panel-close"]' }],
        },
        {
          name: 'clicking close with a custom aria label',
          slots: { title },
          props: { closeAriaLabel: 'Hide properties' },
          callbacks: ['onClose'],
          interactions: [{ type: 'click', selector: '[data-mol-id="node-editor-panel-close"]' }],
        },
        {
          name: 'footer is added and removed',
          props: { title: 'Node Properties' },
          interactions: [
            { type: 'props', props: { footer: 'Saved' } },
            { type: 'props', props: { footer: undefined } },
          ],
        },
        {
          name: 'the title changes',
          props: { title: 'Node Properties' },
          interactions: [{ type: 'props', props: { title: 'Edge Properties' } }],
        },
        {
          name: 'the width class changes',
          slots: { title },
          props: { widthClass: 'w-96' },
          interactions: [{ type: 'props', props: { widthClass: 'w-64' } }],
        },
      ],
    },
    {
      component: 'NodeEditorSection',
      cases: [
        { name: 'label and children', slots: { label: ['Response Format'] }, children: ['Body'] },
        {
          name: 'trailing content',
          slots: { label: ['Response Format'], trailing: [{ tag: 'span', children: ['Value'] }] },
          children: ['Body'],
        },
        { name: 'text label and trailing', props: { label: 'Response Format', trailing: '0.7' } },
        { name: 'string label with no children', props: { label: 'Response Format' } },
        {
          name: 'node label',
          slots: {
            label: [{ tag: 'strong', attrs: { 'data-label': '' }, children: ['Response Format'] }],
          },
          children: ['Body'],
        },
        {
          name: 'default gap',
          slots: { label: ['Response Format'] },
          children: ['Body'],
        },
        { name: 'gap 1', props: { label: 'Response Format', gap: 1 }, children: ['Body'] },
        { name: 'gap 2', props: { label: 'Response Format', gap: 2 }, children: ['Body'] },
        { name: 'gap 3', props: { label: 'Response Format', gap: 3 }, children: ['Body'] },
        { name: 'gap 4', props: { label: 'Response Format', gap: 4 }, children: ['Body'] },
        { name: 'gap 5', props: { label: 'Response Format', gap: 5 }, children: ['Body'] },
        { name: 'gap 6', props: { label: 'Response Format', gap: 6 }, children: ['Body'] },
        { name: 'gap 8', props: { label: 'Response Format', gap: 8 }, children: ['Body'] },
        {
          name: 'trailing is added and removed',
          props: { label: 'Response Format' },
          interactions: [
            { type: 'props', props: { trailing: '0.7' } },
            { type: 'props', props: { trailing: undefined } },
          ],
        },
        {
          name: 'the gap and label change',
          props: { label: 'Response Format', gap: 1 },
          interactions: [{ type: 'props', props: { label: 'Format', gap: 6 } }],
        },
      ],
    },
    {
      component: 'NodeEditorSlider',
      cases: [
        {
          name: 'defaults',
          slots: { label: ['Temperature'] },
          props: { value: 0.7 },
          callbacks: ['onChange'],
        },
        {
          name: 'zero value',
          slots: { label: ['Temperature'] },
          props: { value: 0 },
          callbacks: ['onChange'],
        },
        {
          name: 'custom range',
          slots: { label: ['Max tokens'] },
          props: { value: 5, min: 0, max: 10, step: 1 },
          callbacks: ['onChange'],
        },
        {
          name: 'fractional step',
          slots: { label: ['Top P'] },
          props: { value: 0.15, min: 0, max: 1, step: 0.05 },
          callbacks: ['onChange'],
        },
        {
          name: 'negative range',
          slots: { label: ['Offset'] },
          props: { value: -2, min: -5, max: 5, step: 0.5 },
          callbacks: ['onChange'],
        },
        {
          name: 'node value display',
          slots: { label: ['Temperature'], valueDisplay: [{ tag: 'em', children: ['70%'] }] },
          props: { value: 0.7 },
          callbacks: ['onChange'],
        },
        {
          name: 'string value display',
          slots: { label: ['Temperature'] },
          props: { value: 0.7, valueDisplay: '70%' },
          callbacks: ['onChange'],
        },
        {
          name: 'empty string value display',
          slots: { label: ['Temperature'] },
          props: { value: 0.7, valueDisplay: '' },
          callbacks: ['onChange'],
        },
        {
          name: 'text label and value display',
          props: { label: 'Temperature', value: 0.3, valueDisplay: 'Low' },
          callbacks: ['onChange'],
        },
        {
          name: 'typing a new value reports it',
          props: { label: 'Temperature', value: 0.5 },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: 'input[type="range"]', value: '0.4' }],
        },
        {
          name: 'typing the maximum reports it',
          props: { label: 'Temperature', value: 0.5 },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: 'input[type="range"]', value: '1' }],
        },
        {
          name: 'typing into a fractional step reports it',
          props: { label: 'Top P', value: 0.15, step: 0.05 },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: 'input[type="range"]', value: '0.35' }],
        },
        {
          name: 'two value changes report both',
          props: { label: 'Temperature', value: 0.5 },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: 'input[type="range"]', value: '0.2' },
            { type: 'input', selector: 'input[type="range"]', value: '0.8' },
          ],
        },
        {
          name: 'the value changes from the parent',
          props: { label: 'Temperature', value: 0.1 },
          callbacks: ['onChange'],
          interactions: [{ type: 'props', props: { value: 0.9 } }],
        },
        {
          name: 'the range changes from the parent',
          props: { label: 'Temperature', value: 5, min: 0, max: 10, step: 1 },
          callbacks: ['onChange'],
          interactions: [{ type: 'props', props: { value: 7, min: 1, max: 20, step: 2 } }],
        },
      ],
    },
    {
      component: 'NodeEditorToggle',
      cases: [
        {
          name: 'unchecked, title only',
          props: { title: 'Knowledge Base', checked: false },
          callbacks: ['onChange'],
        },
        {
          name: 'checked with subtitle and icon',
          props: {
            title: 'Structured mode',
            subtitle: 'Return JSON',
            checked: true,
            icon: 'database',
          },
          callbacks: ['onChange'],
        },
        {
          name: 'node title and subtitle',
          slots: {
            title: [{ tag: 'strong', children: ['Structured mode'] }],
            subtitle: [{ tag: 'em', children: ['Return JSON'] }],
          },
          props: { checked: true },
          callbacks: ['onChange'],
        },
        {
          name: 'aria label override',
          props: { title: 'KB', ariaLabel: 'Toggle knowledge base', checked: true },
          callbacks: ['onChange'],
        },
        {
          name: 'empty aria label is kept',
          a11y: EMPTY_SWITCH_LABEL,
          props: { title: 'KB', ariaLabel: '', checked: false },
          callbacks: ['onChange'],
        },
        {
          name: 'node title has no default aria label',
          slots: { title: [{ tag: 'strong', children: ['Knowledge Base'] }] },
          props: { checked: false },
          callbacks: ['onChange'],
        },
        {
          name: 'the subtitle is added and removed',
          props: { title: 'Knowledge Base', checked: false },
          interactions: [
            { type: 'props', props: { subtitle: 'Uses your documents' } },
            { type: 'props', props: { subtitle: undefined } },
          ],
        },
        {
          name: 'the icon is added and removed',
          props: { title: 'Knowledge Base', checked: false },
          interactions: [
            { type: 'props', props: { icon: 'database' } },
            { type: 'props', props: { icon: undefined } },
          ],
        },
        {
          name: 'clicking an unchecked toggle reports on',
          props: { title: 'Knowledge Base', checked: false },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: 'button[data-mol-id="node-editor-toggle"]' }],
        },
        {
          name: 'clicking a checked toggle reports off',
          props: { title: 'Knowledge Base', checked: true },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: 'button[data-mol-id="node-editor-toggle"]' }],
        },
        {
          name: 'clicking twice reports both changes',
          props: { title: 'Knowledge Base', checked: false },
          callbacks: ['onChange'],
          interactions: [
            { type: 'click', selector: 'button[data-mol-id="node-editor-toggle"]' },
            { type: 'click', selector: 'button[data-mol-id="node-editor-toggle"]' },
          ],
        },
        {
          name: 'the checked state changes from the parent',
          props: { title: 'Knowledge Base', checked: false },
          callbacks: ['onChange'],
          interactions: [{ type: 'props', props: { checked: true } }],
        },
        {
          name: 'the title and aria label change',
          props: { title: 'Knowledge Base', checked: false },
          interactions: [
            { type: 'props', props: { title: 'Structured mode', ariaLabel: 'Structured' } },
          ],
        },
      ],
    },
    {
      component: 'NodeEditorRadioGroup',
      cases: [
        {
          name: 'three options, middle selected',
          props: { options: formatOptions, value: 'structured' },
          callbacks: ['onChange'],
        },
        {
          name: 'first option selected',
          props: { options: formatOptions, value: 'conversational' },
          callbacks: ['onChange'],
        },
        {
          name: 'no option selected',
          props: { options: formatOptions, value: 'none' },
          callbacks: ['onChange'],
        },
        {
          name: 'single option',
          props: { options: [{ value: 'only', label: 'Only' }], value: 'only' },
          callbacks: ['onChange'],
        },
        {
          name: 'empty options',
          props: { options: [], value: '' },
          callbacks: ['onChange'],
        },
        {
          name: 'node labels',
          props: { options: nodeLabelOptions, value: 'conversational' },
          callbacks: ['onChange'],
        },
        {
          name: 'clicking an option tile selects it',
          props: { options: formatOptions, value: 'structured' },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="node-editor-radio-hybrid"]' }],
        },
        {
          name: 'clicking a radio selects it',
          props: { options: formatOptions, value: 'structured' },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'click',
              selector: '[data-mol-id="node-editor-radio-conversational"] input',
            },
          ],
        },
        {
          name: 'clicking the selected option reports it again',
          props: { options: formatOptions, value: 'structured' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="node-editor-radio-structured"]' },
          ],
        },
        {
          name: 'two selections report both',
          props: { options: formatOptions, value: 'structured' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="node-editor-radio-hybrid"]' },
            { type: 'click', selector: '[data-mol-id="node-editor-radio-conversational"]' },
          ],
        },
        {
          name: 'the value changes from the parent',
          props: { options: formatOptions, value: 'structured' },
          callbacks: ['onChange'],
          interactions: [{ type: 'props', props: { value: 'hybrid' } }],
        },
        {
          name: 'the options are replaced',
          props: { options: formatOptions, value: 'structured' },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'props',
              props: {
                options: [
                  { value: 'json', label: 'JSON' },
                  { value: 'text', label: 'Text' },
                ],
                value: 'json',
              },
            },
          ],
        },
        {
          name: 'the options grow from two to four',
          props: {
            options: formatOptions.slice(0, 2),
            value: 'structured',
          },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'props',
              props: {
                options: [...formatOptions, { value: 'markdown', label: 'Markdown' }],
              },
            },
          ],
        },
      ],
      keyedLists: [
        {
          prop: 'options',
          selector: '[data-mol-id^="node-editor-radio-"]',
          caseName: 'three options, middle selected',
        },
      ],
    },
  ],
}
