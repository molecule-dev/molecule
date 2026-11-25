/**
 * DOM overlay utility shared by the React, Vue, Svelte, Solid and Angular UI kits.
 *
 * `OverlayLayer` registers a mounted surface with its document's overlay stack
 * using `OverlayLayerOptions` from `@molecule/app-ui`. One stack coordinates
 * Escape, backdrop dismissal, modal focus and body scroll locks across roots
 * and renderers. A renderer can supply a logical parent for its portals.
 * Otherwise the stack resolves ownership from the anchor's DOM ancestry.
 *
 * Renderers supply their own portal, hydration and focus scheduling. Call
 * `sync(options, parent)` when the surface or options change and `release()`
 * when the view unmounts. Anchored dropdowns can also share document-local
 * positioning and outside-pointer detection.
 *
 * @module
 */

export * from './dropdown-position.js'
export * from './stack.js'
