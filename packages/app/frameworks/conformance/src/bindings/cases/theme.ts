/**
 * Cases for the theme hooks.
 *
 * The theme fake records `theme.setTheme` with the argument it got (a name as
 * the string, an object as `{ theme: name }`), so a binding that passes
 * something else than React shows in the calls.
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
    {
      name: 'toggleTheme from dark returns to light through toggleMode',
      context: { theme: 'dark' },
      steps: [{ type: 'call', method: 'toggleTheme' }],
    },
    {
      name: 'setTheme with an unknown name changes nothing',
      steps: [{ type: 'call', method: 'setTheme', args: ['neon'] }],
    },
    {
      name: 'setTheme with an empty string changes nothing',
      steps: [{ type: 'call', method: 'setTheme', args: [''] }],
    },
    {
      name: 'setTheme to the current theme re-notifies without changing it',
      steps: [{ type: 'call', method: 'setTheme', args: ['light'] }],
    },
    {
      name: 'setTheme and an outside change agree on the mode',
      steps: [
        { type: 'call', method: 'setTheme', args: ['dark'] },
        { type: 'theme', mode: 'light' },
        { type: 'call', method: 'setTheme', args: ['dark'] },
      ],
    },
    {
      name: 'unmount removes the theme listener',
      steps: [
        { type: 'theme', mode: 'dark' },
        { type: 'unmount' },
        { type: 'theme', mode: 'light' },
      ],
    },
    { name: 'without a theme provider', context: { omitServices: ['theme'] } },
  ],
}

/** `useThemeMode()`: `'light'` or `'dark'`. */
export const useThemeModeCases: HookCases = {
  hook: 'useThemeMode',
  cases: [
    { name: 'light by default' },
    { name: 'dark from the provider', context: { theme: 'dark' } },
    { name: 'follows a theme change made elsewhere', steps: [{ type: 'theme', mode: 'dark' }] },
    {
      name: 'switches back on a second outside change',
      steps: [
        { type: 'theme', mode: 'dark' },
        { type: 'theme', mode: 'light' },
      ],
    },
    {
      name: 'unmount stops mode updates',
      steps: [
        { type: 'theme', mode: 'dark' },
        { type: 'unmount' },
        { type: 'theme', mode: 'light' },
      ],
    },
    { name: 'without a theme provider', context: { omitServices: ['theme'] } },
  ],
}

/** `useThemeProvider()`: the raw theme provider from context. */
export const useThemeProviderCases: HookCases = {
  hook: 'useThemeProvider',
  cases: [
    {
      name: 'returns the provider from context',
      steps: [{ type: 'call', method: 'getTheme', args: [] }],
    },
    {
      name: 'actions through the returned provider reach the theme service',
      steps: [
        { type: 'call', method: 'setTheme', args: ['dark'] },
        { type: 'call', method: 'toggleMode', args: [] },
      ],
    },
    { name: 'without a theme provider', context: { omitServices: ['theme'] } },
  ],
}

/** `useCurrentTheme()`: the whole current theme object. */
export const useCurrentThemeCases: HookCases = {
  hook: 'useCurrentTheme',
  cases: [
    { name: 'the light theme by default' },
    { name: 'the dark theme from the provider', context: { theme: 'dark' } },
    { name: 'follows a theme change made elsewhere', steps: [{ type: 'theme', mode: 'dark' }] },
    {
      name: 'unmount stops theme updates',
      steps: [
        { type: 'theme', mode: 'dark' },
        { type: 'unmount' },
        { type: 'theme', mode: 'light' },
      ],
    },
    { name: 'without a theme provider', context: { omitServices: ['theme'] } },
  ],
}

/** `useThemeColors()`: the current theme's color palette. */
export const useThemeColorsCases: HookCases = {
  hook: 'useThemeColors',
  cases: [
    { name: 'light colors by default' },
    { name: 'dark colors after a change', steps: [{ type: 'theme', mode: 'dark' }] },
    {
      name: 'unmount stops color updates',
      steps: [
        { type: 'theme', mode: 'dark' },
        { type: 'unmount' },
        { type: 'theme', mode: 'light' },
      ],
    },
    { name: 'without a theme provider', context: { omitServices: ['theme'] } },
  ],
}
