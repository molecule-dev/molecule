/**
 * Settings metadata subpath — re-exports the framework-neutral registry from
 * `@molecule/app-ide-panel-logic/settings-metadata`, keeping this package's
 * `./settings-metadata` entry stable for the molecule.dev API system prompt
 * (it imports the same array the `/settings` card derives its rows from).
 *
 * @module
 */

export * from '@molecule/app-ide-panel-logic/settings-metadata'
