/** Translation keys for the feature-canvas-react locale package. */
export type CanvasTranslationKey =
  | 'canvas.aria.surface'
  | 'canvas.aria.node'
  | 'canvas.aria.edge'
  | 'canvas.aria.resizeHandle'

/** Translation record mapping canvas keys to translated strings. */
export type CanvasTranslations = Record<CanvasTranslationKey, string>
