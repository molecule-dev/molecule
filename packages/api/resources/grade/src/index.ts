/**
 * Grade resource for molecule.dev.
 *
 * Stores per-student per-course assignment grades and computes course
 * averages, GPAs, and transcripts. Letter-grade resolution is driven by
 * an injected {@link GradeScale} so different institutions can use
 * different scales (4.0, 4.3, plus/minus, etc.). All user-facing text
 * is i18n-ready via the companion `@molecule/api-locales-resource-grade`
 * bond.
 *
 * @module
 * @example
 * ```typescript
 * import {
 *   routes,
 *   requestHandlerMap,
 *   getCourseAverage,
 *   getGpa,
 *   getTranscript,
 *   defaultGradeScale,
 * } from '@molecule/api-resource-grade'
 * ```
 */

export * from './browser-guard.js'
export * from './aggregate.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './scale.js'
export * from './types.js'
