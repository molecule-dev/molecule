/**
 * Body parser middleware for molecule.dev.
 *
 * Core interface — the actual implementation is provided via bonds.
 * Install a body parser bond (e.g., `@molecule/api-middleware-body-parser-express`)
 * to provide JSON and multipart form data parsing.
 *
 * @module
 */

export * from './parser.js'
