/**
 * NativeWind theme provider for molecule.dev: the web's theme palette and
 * light/dark mode on React Native (iOS, Android and Expo web).
 *
 * It implements `@molecule/app-theme`, so `useTheme()`, `toggleMode()` and theme
 * switchers work as they do on the web. Every colour token of
 * `@molecule/app-ui-tailwind`'s `base.css`, the derived ones included
 * (`surface-container`, `on-primary`, …), is computed from the active theme and
 * set as one of NativeWind's root variables, so every mounted component repaints.
 * `dark:` utilities follow the theme, not only the device setting.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-theme'
 * import { createNativeWindThemeProvider, darkTheme, lightTheme } from '@molecule/app-theme-nativewind'
 *
 * export const themeProvider = createNativeWindThemeProvider({
 *   themes: [lightTheme, darkTheme],
 *   defaultTheme: 'light',
 *   systemDefault: true,
 *   persistKey: 'molecule-theme',
 * })
 * setProvider(themeProvider)
 * ```
 *
 * @remarks
 * - Needs the Tailwind preset from `@molecule/app-ui-nativewind`
 *   (`presets: [require('nativewind/preset'), require('@molecule/app-ui-nativewind/preset')]`
 *   in `tailwind.config.js`). It defines the colour classes as these variables and
 *   sets `darkMode: 'class'`. Without it, `bg-primary` has no rule and paints nothing.
 * - `systemDefault: true` starts on the theme matching the device setting and
 *   follows it until the person picks a theme. Set `"userInterfaceStyle": "automatic"`
 *   in `app.json`, or iOS always reports light.
 * - `persistKey` saves the chosen theme through the bonded `@molecule/app-storage`
 *   provider (or `storage`). Device storage is asynchronous, so the app starts on
 *   the default theme and switches once the saved one is read; await
 *   `themeProvider.ready` behind a splash screen to avoid the switch.
 * - On Expo web the variables are set on `<html>` and `.dark` is toggled there.
 * - React Navigation's headers and screen backgrounds are not ClassMap classes: pass
 *   `useNavigationTheme(…)` from `@molecule/app-routing-react-navigation` to
 *   `<NavigationContainer theme={…}>` so they follow this provider too.
 *
 * @module
 */

export * from './provider.js'
export * from './themes.js'
export * from './types.js'
