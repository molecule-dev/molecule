/**
 * Public types for `@molecule/api-export-pptx`.
 *
 * A {@link Deck} is the framework-neutral, JSON-serializable description of a
 * slide deck. {@link exportPptx} turns it into a PowerPoint `.pptx` `Buffer`.
 *
 * @module
 */

/**
 * Horizontal text alignment within a text box.
 */
export type TextAlignment = 'left' | 'center' | 'right' | 'justify'

/**
 * Vertical text alignment within a text box.
 */
export type VerticalAlignment = 'top' | 'middle' | 'bottom'

/**
 * Geometric shape primitives supported by the `shape` element kind.
 */
export type ShapeKind = 'rect' | 'roundedRect' | 'ellipse' | 'line'

/**
 * Chart kinds supported by the `chart` element kind.
 */
export type ChartKind = 'bar' | 'line' | 'pie'

/**
 * A position + size, expressed in inches (the native PPTX unit).
 *
 * `x`, `y` are the top-left corner, `w`, `h` the width and height. All values
 * are in inches; a standard 16:9 slide is 13.333 × 7.5 in.
 */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Text run / paragraph styling shared by `text` elements and the title /
 * value labels of `chart` elements.
 */
export interface TextStyle {
  /** Font family (e.g. `"Inter"`, `"Arial"`). Defaults to the slide master font. */
  fontFace?: string

  /** Font size in points. Defaults to 18. */
  fontSize?: number

  /** Hex color string (`"#1f2937"` or `"1f2937"`). Defaults to `#000000`. */
  color?: string

  /** Bold weight. Defaults to `false`. */
  bold?: boolean

  /** Italic style. Defaults to `false`. */
  italic?: boolean

  /** Underline. Defaults to `false`. */
  underline?: boolean

  /** Horizontal alignment. Defaults to `"left"`. */
  align?: TextAlignment

  /** Vertical alignment within the text box. Defaults to `"top"`. */
  valign?: VerticalAlignment
}

/**
 * A text element rendered into a positioned text box on the slide.
 */
export interface TextElement extends Box, TextStyle {
  kind: 'text'
  /** Plain-text body. Newlines (`\n`) become paragraph breaks. */
  body: string
}

/**
 * An image element. Source is one of:
 * - `src` — an `http(s):` URL or `file:` path resolvable by pptxgenjs
 * - `data` — a `data:` URI (e.g. `data:image/png;base64,...`)
 * - `buffer` — a raw `Buffer` of PNG/JPEG/GIF bytes (encoded to data URI)
 *
 * Exactly one of `src`, `data`, `buffer` must be provided.
 */
export interface ImageElement extends Box {
  kind: 'image'
  src?: string
  data?: string
  buffer?: Buffer
  /** MIME type when supplying `buffer`. Defaults to `image/png`. */
  mimeType?: string
  /** Alt text for accessibility. */
  altText?: string
}

/**
 * A geometric shape element.
 */
export interface ShapeElement extends Box {
  kind: 'shape'
  shape: ShapeKind
  /** Hex fill color. Omit for no fill. */
  fill?: string
  /** Hex line color. Omit for no border. */
  line?: string
  /** Line width in points. Defaults to 1. */
  lineWidth?: number
  /** Corner radius (0..1) for `roundedRect`. */
  rectRadius?: number
}

/**
 * A single (label, value) pair in a chart series.
 */
export interface ChartDataPoint {
  label: string
  value: number
}

/**
 * One labelled data series. `pie` charts use only the first series.
 */
export interface ChartSeries {
  /** Series name shown in the legend. */
  name: string
  data: ChartDataPoint[]
}

/**
 * A chart element.
 */
export interface ChartElement extends Box {
  kind: 'chart'
  chart: ChartKind
  /** One or more named series. `pie` charts read only `series[0]`. */
  series: ChartSeries[]
  /** Optional chart title rendered inside the chart frame. */
  title?: string
  /** Show legend. Defaults to `true` when `series.length > 1`. */
  showLegend?: boolean
}

/**
 * Discriminated union of all element kinds renderable on a slide.
 */
export type SlideElement = TextElement | ImageElement | ShapeElement | ChartElement

/**
 * Layout hints for a slide. `widescreen` is the default (16:9, 13.333×7.5 in).
 * `standard` is 4:3 (10×7.5 in). The chosen layout applies to the whole deck;
 * if slides specify conflicting layouts, the first one wins.
 */
export type SlideLayout = 'widescreen' | 'standard'

/**
 * A single slide.
 */
export interface Slide {
  /** Layout hint — see {@link SlideLayout}. */
  layout?: SlideLayout
  /** Hex background color (`"#ffffff"`). Defaults to white. */
  background?: string
  /** Renderable elements, drawn in array order (later = on top). */
  elements: SlideElement[]
  /** Optional speaker notes. */
  notes?: string
}

/**
 * The top-level deck definition consumed by {@link exportPptx}.
 */
export interface Deck {
  /** Deck title (also written into core OOXML metadata). */
  title?: string
  /** Author name (written into core OOXML metadata). */
  author?: string
  /** Subject / category (written into core OOXML metadata). */
  subject?: string
  /** Company name (written into core OOXML metadata). */
  company?: string
  /** Slides in display order. */
  slides: Slide[]
}

/**
 * Options accepted by {@link exportPptx}.
 */
export interface ExportPptxOptions {
  /**
   * Override the suggested filename written into `Content-Disposition` by the
   * HTTP handler. Has no effect on the buffer itself. Defaults to
   * `deck.title || 'deck'`, sanitized.
   */
  filename?: string
}

/**
 * Result of {@link exportPptx}: the binary buffer plus the suggested
 * filename (without extension is fine — `.pptx` is appended if missing).
 */
export interface ExportPptxResult {
  buffer: Buffer
  filename: string
  contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
}
