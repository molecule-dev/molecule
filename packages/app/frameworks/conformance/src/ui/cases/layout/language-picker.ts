/**
 * LanguagePicker parity cases: the globe trigger and its locale modal grid.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** LanguagePicker: display modes, labels, disabled, modal open and locale pick. */
export const languagePickerCases: UIComponentCases = {
  component: 'LanguagePicker',
  cases: [
    { name: 'defaults show the locale native name' },
    { name: 'display code', props: { display: 'code' } },
    { name: 'display icon', props: { display: 'icon' } },
    {
      name: 'custom label key and default',
      props: { labelKey: 'footer.languageSwitch', labelDefault: 'Sprache' },
    },
    {
      name: 'custom modal title key and default',
      props: { modalTitleKey: 'languagePicker.heading', modalTitleDefault: 'Pick a language' },
      interactions: [{ type: 'click', selector: '[data-mol-id="language-picker-trigger"]' }],
    },
    {
      name: 'custom icon and size',
      props: { icon: 'globe', iconSize: 20 },
    },
    {
      name: 'className, style and extra button attributes',
      props: {
        className: 'parity-token',
        style: { marginRight: '4px' },
        'data-track': 'language',
        title: 'Language',
      },
    },
    {
      name: 'disabled click does not open the modal',
      props: { disabled: true },
      interactions: [{ type: 'click', selector: '[data-mol-id="language-picker-trigger"]' }],
    },
    {
      name: 'click opens the locale modal',
      interactions: [{ type: 'click', selector: '[data-mol-id="language-picker-trigger"]' }],
    },
    {
      name: 'picking a locale closes the modal',
      interactions: [
        { type: 'click', selector: '[data-mol-id="language-picker-trigger"]' },
        { type: 'click', selector: '[data-mol-id="language-picker-option-en"]' },
      ],
    },
    {
      name: 'close button closes the modal without changing locale',
      interactions: [
        { type: 'click', selector: '[data-mol-id="language-picker-trigger"]' },
        { type: 'click', selector: '[data-mol-id="modal-close"]' },
      ],
    },
    {
      // renderTrigger receives the open callback and replaces the default
      // trigger; static nodes cannot call it, so the case pins the
      // replacement rendering (default trigger's mol id absent, custom node
      // present) while the locale modal stays mounted closed.
      name: 'renderTrigger replaces the default trigger',
      props: {
        renderTrigger: {
          $fn: 'renderTrigger',
          nodes: [
            {
              tag: 'button',
              attrs: { type: 'button', 'data-mol-id': 'language-custom-trigger' },
              children: ['Pick a language'],
            },
          ],
        },
      },
    },
    {
      name: 'renderTrigger may render a component node',
      props: {
        renderTrigger: {
          $fn: 'renderTrigger',
          nodes: [{ component: 'Button', props: { variant: 'outline' }, children: ['Language…'] }],
        },
      },
    },
  ],
}
