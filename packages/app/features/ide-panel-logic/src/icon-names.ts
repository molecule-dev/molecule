/**
 * Glyphs the IDE's panel logic and views use BEYOND the base
 * `ComponentIconName` contract. The bonded icon set must provide them (the
 * molecule set does — see `@molecule/app-icons-molecule`, which registers the
 * same names); registering them here lets every framework's IDE package
 * type-check its `<Icon name="…" />`-equivalent call sites without importing
 * any bond. This is a type-only augmentation: it adds no runtime export and
 * reaches every consumer through this package's entry, so the names exist once
 * for all frameworks.
 *
 * @module
 */

declare module '@molecule/app-icons' {
  interface CustomIconNames {
    browser: true
    chat: true
    'device-desktop': true
    'device-mobile': true
    'device-tablet': true
    hash: true
    rotate: true
    'star-outline': true
  }
}
