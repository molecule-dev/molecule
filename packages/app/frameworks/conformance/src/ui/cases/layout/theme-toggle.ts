/**
 * ThemeToggle parity cases: the light/dark mode button wired to the theme bond.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** ThemeToggle: modes, icons, labels, disabled, click flips the theme bond. */
export const themeToggleCases: UIComponentCases = {
  component: 'ThemeToggle',
  cases: [
    { name: 'light mode', context: { theme: 'light' } },
    { name: 'dark mode', context: { theme: 'dark' } },
    {
      name: 'click flips light to dark',
      context: { theme: 'light' },
      interactions: [{ type: 'click', selector: '[data-mol-id="theme-toggle"]' }],
    },
    {
      name: 'click flips dark to light',
      context: { theme: 'dark' },
      interactions: [{ type: 'click', selector: '[data-mol-id="theme-toggle"]' }],
    },
    {
      name: 'custom aria label key and default',
      context: { theme: 'light' },
      props: { ariaLabelKey: 'appearance.switch', ariaLabelDefault: 'Switch appearance' },
    },
    {
      name: 'custom icons',
      context: { theme: 'light' },
      props: { lightIcon: 'sun', darkIcon: 'moon' },
      interactions: [{ type: 'click', selector: '[data-mol-id="theme-toggle"]' }],
    },
    {
      name: 'custom icon size',
      context: { theme: 'dark' },
      props: { iconSize: 28 },
    },
    {
      name: 'className, style and extra button attributes',
      context: { theme: 'light' },
      props: {
        className: 'parity-token',
        style: { marginLeft: '8px' },
        'data-track': 'theme',
        title: 'Theme',
      },
    },
    {
      name: 'disabled click does not flip the theme',
      context: { theme: 'light' },
      props: { disabled: true },
      interactions: [{ type: 'click', selector: '[data-mol-id="theme-toggle"]' }],
    },
  ],
}
