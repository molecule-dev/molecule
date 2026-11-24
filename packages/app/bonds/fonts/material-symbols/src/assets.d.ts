/**
 * Font files a React Native bundler (Metro) imports as assets.
 *
 * @module
 */

declare module '*.ttf' {
  /** The bundled asset. */
  const asset: number
  export default asset
}
