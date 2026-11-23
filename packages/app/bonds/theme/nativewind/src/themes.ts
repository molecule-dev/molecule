/**
 * The default light and dark themes: the web's, so an app looks the same on a
 * device as in a browser.
 *
 * @module
 */

import type { Theme } from '@molecule/app-theme'
import {
  darkTheme as webDarkTheme,
  lightTheme as webLightTheme,
} from '@molecule/app-theme-css-variables'

/** The default light theme (the same palette as `@molecule/app-theme-css-variables`). */
export const lightTheme: Theme = webLightTheme

/** The default dark theme (the same palette as `@molecule/app-theme-css-variables`). */
export const darkTheme: Theme = webDarkTheme
