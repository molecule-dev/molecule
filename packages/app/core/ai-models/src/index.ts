/**
 * App-side AI model catalog client.
 *
 * Framework-agnostic loader, types, and UI-only constants (`PROVIDER_BRAND_COLORS`,
 * `formatTokenCount`). Hosts the lazy fetch of `GET /ai/models`. Framework
 * bindings (e.g. `useAIModels` in `@molecule/app-react`) wrap this loader.
 *
 * @module
 */

export * from './colors.js'
export * from './format.js'
export * from './load.js'
export * from './types.js'
