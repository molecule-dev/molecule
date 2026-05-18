/** Translation keys for the canvas locale package. */
export type CanvasTranslationKey =
  | 'canvas.aria.edge'
  | 'canvas.aria.node'
  | 'canvas.aria.resizeHandle'
  | 'canvas.aria.surface'

/** Translation record mapping canvas-react keys to translated strings. */
export type CanvasTranslations = Record<CanvasTranslationKey, string>
