/**
 * Slash-command metadata subpath — re-exports the framework-neutral registry
 * from `@molecule/app-ide-panel-logic/command-metadata`, keeping this package's
 * `./command-metadata` entry stable for the molecule.dev API system prompt
 * (it imports the same array the chat surfaces read; one list, two consumers).
 *
 * @module
 */

export * from '@molecule/app-ide-panel-logic/command-metadata'
