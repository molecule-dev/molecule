/**
 * Types for `babel-preset-solid`, which ships untyped JavaScript. The preset is
 * handed straight to `@babel/core`'s `transform({ presets: [...] })`.
 */
declare module 'babel-preset-solid' {
  import type { PluginItem } from '@babel/core'

  const preset: PluginItem
  export default preset
}
