/**
 * Express body parser provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import { setBodyParser, setJsonParserFactory } from '@molecule/api-middleware-body-parser'
 * import { provider, jsonParserFactory } from '@molecule/api-middleware-body-parser-express'
 *
 * setBodyParser(provider)
 * setJsonParserFactory(jsonParserFactory)
 * ```
 *
 * @module
 */

export * from './provider.js'
