/**
 * Cases for the theme hooks.
 *
 * @module
 */

import type { HookCases } from '../spec.js'

/** `useTheme()`: the current theme, its name and mode, and the actions. */
export const useThemeCases: HookCases = {
  hook: 'useTheme',
  cases: [
    { name: 'light by default' },
    { name: 'dark from the provider', context: { theme: 'dark' } },
    {
      name: 'toggleTheme switches light to dark through toggleMode',
      steps: [{ type: 'call', method: 'toggleTheme' }],
    },
    {
      name: 'toggleTheme twice returns to light',
      steps: [
        { type: 'call', method: 'toggleTheme' },
        { type: 'call', method: 'toggleTheme' },
      ],
    },
    {
      name: 'setTheme passes the theme name',
      steps: [{ type: 'call', method: 'setTheme', args: ['dark'] }],
    },
    {
      name: 'follows a theme change made elsewhere',
      steps: [
        { type: 'theme', mode: 'dark' },
        { type: 'theme', mode: 'light' },
      ],
    },
  ],
}

/** `useThemeMode()`: `'light'` or `'dark'`. */
export const useThemeModeCases: HookCases = {
  hook: 'useThemeMode',
  cases: [
    { name: 'light by default' },
    { name: 'follows a theme change made elsewhere', steps: [{ type: 'theme', mode: 'dark' }] },
  ],
}
