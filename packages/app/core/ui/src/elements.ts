/**
 * Renderer-neutral elements: the props of the elements a React feature renders with, so one
 * feature serves React DOM and React Native.
 *
 * Each element names the web tag it renders with a required `as` (`<Box as="ul">`). The web kit
 * (`@molecule/app-ui-react/elements`) renders exactly that tag with the props given, so the DOM is
 * the one a raw `<ul>` would produce. The native kit (`@molecule/app-ui-react-native`) renders a
 * `View`, `Text`, `Pressable`, `TextInput`, `Image`, `ScrollView` or react-native-svg shape, with the
 * accessibility role `as` implies.
 *
 * The props are the web names the features already use (`onClick`, `aria-label`, `data-mol-id`),
 * limited to what both renderers can do. Anything only a browser has (pointer and drag events,
 * `dangerouslySetInnerHTML`, CSS grid, `calc()`) is in no interface, so a feature that needs it is
 * a compile error until it is registered web-only.
 *
 * Framework-agnostic: children are typed by each kit (`Node`).
 *
 * @module
 */

import type {
  ChangeEventHandler,
  CSSProperties,
  FocusEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
} from './types.js'

// ============================================================================
// HANDLES
// ============================================================================

/**
 * What an element's `ref` receives on every renderer: a DOM element and a React Native host
 * instance both satisfy it. Measure an element with the kit's `measureElement`, never with
 * `getBoundingClientRect`.
 */
export interface ElementHandle {
  /** Moves focus to the element. */
  focus(): void
  /** Removes focus from the element. */
  blur(): void
}

/** An element's box in the window, in CSS pixels on the web and density-independent pixels on native. */
export interface ElementBox {
  /** Distance from the window's left edge. */
  x: number
  /** Distance from the window's top edge. */
  y: number
  /** Width of the box. */
  width: number
  /** Height of the box. */
  height: number
}

// ============================================================================
// STYLE
// ============================================================================

/** A length both renderers accept: pixels as a number, or a percentage of the parent. */
export type ElementLength = number | `${number}%`

/**
 * Inline layout and paint that CSS and React Native apply the same way. Numbers are CSS pixels on
 * the web and density-independent pixels on native. Shorthand strings (`padding: '8px 12px'`,
 * `border: '1px solid'`), CSS grid, `calc()`, `var()` and units other than pixels and percent are
 * not accepted: write longhands, or use a ClassMap class (the nativewind ClassMap translates
 * classes for native).
 */
export interface BoxStyle {
  /** `'flex'` or `'none'`; every native view is a flex container. */
  display?: 'flex' | 'none'
  /** Positioning scheme. */
  position?: 'relative' | 'absolute'
  /** Offset from the containing block's top. */
  top?: ElementLength
  /** Offset from the containing block's right. */
  right?: ElementLength
  /** Offset from the containing block's bottom. */
  bottom?: ElementLength
  /** Offset from the containing block's left. */
  left?: ElementLength
  /** Width. */
  width?: ElementLength
  /** Height. */
  height?: ElementLength
  /** Minimum width. */
  minWidth?: ElementLength
  /** Minimum height. */
  minHeight?: ElementLength
  /** Maximum width. */
  maxWidth?: ElementLength
  /** Maximum height. */
  maxHeight?: ElementLength
  /** Margin on all sides. */
  margin?: ElementLength | 'auto'
  /** Top margin. */
  marginTop?: ElementLength | 'auto'
  /** Right margin. */
  marginRight?: ElementLength | 'auto'
  /** Bottom margin. */
  marginBottom?: ElementLength | 'auto'
  /** Left margin. */
  marginLeft?: ElementLength | 'auto'
  /** Padding on all sides. */
  padding?: ElementLength
  /** Top padding. */
  paddingTop?: ElementLength
  /** Right padding. */
  paddingRight?: ElementLength
  /** Bottom padding. */
  paddingBottom?: ElementLength
  /** Left padding. */
  paddingLeft?: ElementLength
  /** Grow and shrink factor with a zero basis (`flex: 1`). */
  flex?: number
  /** Grow factor. */
  flexGrow?: number
  /** Shrink factor. */
  flexShrink?: number
  /** Initial main size. */
  flexBasis?: ElementLength | 'auto'
  /** Main axis direction. */
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  /** Whether lines wrap. */
  flexWrap?: 'wrap' | 'nowrap' | 'wrap-reverse'
  /** Cross-axis alignment of children. */
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
  /** Cross-axis alignment of this element. */
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
  /** Cross-axis alignment of wrapped lines. */
  alignContent?:
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'stretch'
    | 'space-between'
    | 'space-around'
    | 'space-evenly'
  /** Main-axis alignment of children. */
  justifyContent?:
    'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
  /** Gap between children. */
  gap?: number
  /** Gap between rows. */
  rowGap?: number
  /** Gap between columns. */
  columnGap?: number
  /** Clipping of overflowing children (scrolling content belongs in a `ScrollArea`). */
  overflow?: 'visible' | 'hidden'
  /** Stacking order. */
  zIndex?: number
  /** Width-to-height ratio. */
  aspectRatio?: number
  /** Whether the element receives pointer and touch events. */
  pointerEvents?: 'auto' | 'none'
  /** Opacity, 0 to 1. */
  opacity?: number
  /** Background colour (a theme colour belongs in a ClassMap class). */
  backgroundColor?: string
  /** Border width on all sides. */
  borderWidth?: number
  /** Top border width. */
  borderTopWidth?: number
  /** Right border width. */
  borderRightWidth?: number
  /** Bottom border width. */
  borderBottomWidth?: number
  /** Left border width. */
  borderLeftWidth?: number
  /** Border colour on all sides. */
  borderColor?: string
  /** Top border colour. */
  borderTopColor?: string
  /** Right border colour. */
  borderRightColor?: string
  /** Bottom border colour. */
  borderBottomColor?: string
  /** Left border colour. */
  borderLeftColor?: string
  /** Border line style. */
  borderStyle?: 'solid' | 'dotted' | 'dashed'
  /** Corner radius on all corners. */
  borderRadius?: number
  /** Top-left corner radius. */
  borderTopLeftRadius?: number
  /** Top-right corner radius. */
  borderTopRightRadius?: number
  /** Bottom-left corner radius. */
  borderBottomLeftRadius?: number
  /** Bottom-right corner radius. */
  borderBottomRightRadius?: number
}

/**
 * {@link BoxStyle} plus the text properties, for a {@link TextProps} element only: on native,
 * text styles apply to a `Text` and are not inherited from a view.
 */
export interface TextStyle extends BoxStyle {
  /** Text colour (a theme colour belongs in a ClassMap class). */
  color?: string
  /** Font size. */
  fontSize?: number
  /** Font weight. */
  fontWeight?:
    'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'
  /** Font style. */
  fontStyle?: 'normal' | 'italic'
  /** Line height in pixels (a multiplier such as `1.5` belongs in a ClassMap class). */
  lineHeight?: `${number}px`
  /** Spacing between letters. */
  letterSpacing?: number
  /** Horizontal alignment. */
  textAlign?: 'left' | 'right' | 'center' | 'justify'
  /** Letter case. */
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  /** Underline and strike-through. */
  textDecorationLine?: 'none' | 'underline' | 'line-through' | 'underline line-through'
}

/**
 * An element's `webStyle`: CSS for the web (resets of browser defaults such as a button's border
 * and outline, cursors, shadows, or a consumer's `style` a kit component passes on). The web kit
 * applies it after `style`. The native kit applies only the keys {@link TextStyle} names whose
 * values a device can draw (`width: 200`, not `width: '10rem'`), so layout a feature means for
 * both renderers belongs in `style`, which the compiler holds to that subset.
 */
export type WebStyle = CSSProperties

// ============================================================================
// SHARED PROPS
// ============================================================================

/** Roles a feature gives an element (an explicit role overrides the one its `as` implies). */
export type ElementRole =
  | 'alert'
  | 'alertdialog'
  | 'application'
  | 'article'
  | 'banner'
  | 'blockquote'
  | 'button'
  | 'caption'
  | 'cell'
  | 'checkbox'
  | 'code'
  | 'columnheader'
  | 'combobox'
  | 'complementary'
  | 'contentinfo'
  | 'definition'
  | 'deletion'
  | 'dialog'
  | 'directory'
  | 'document'
  | 'emphasis'
  | 'feed'
  | 'figure'
  | 'form'
  | 'generic'
  | 'grid'
  | 'gridcell'
  | 'group'
  | 'heading'
  | 'img'
  | 'insertion'
  | 'link'
  | 'list'
  | 'listbox'
  | 'listitem'
  | 'log'
  | 'main'
  | 'marquee'
  | 'math'
  | 'menu'
  | 'menubar'
  | 'menuitem'
  | 'menuitemcheckbox'
  | 'menuitemradio'
  | 'meter'
  | 'navigation'
  | 'none'
  | 'note'
  | 'option'
  | 'paragraph'
  | 'presentation'
  | 'progressbar'
  | 'radio'
  | 'radiogroup'
  | 'region'
  | 'row'
  | 'rowgroup'
  | 'rowheader'
  | 'scrollbar'
  | 'search'
  | 'searchbox'
  | 'separator'
  | 'slider'
  | 'spinbutton'
  | 'status'
  | 'strong'
  | 'subscript'
  | 'superscript'
  | 'switch'
  | 'tab'
  | 'table'
  | 'tablist'
  | 'tabpanel'
  | 'term'
  | 'textbox'
  | 'time'
  | 'timer'
  | 'toolbar'
  | 'tooltip'
  | 'tree'
  | 'treegrid'
  | 'treeitem'

/** `data-*` attributes: `data-mol-id` becomes the native `testID`; the rest are web-only. */
export type DataAttributes = { [key: `data-${string}`]: string | number | boolean | undefined }

/** The accessibility attributes both renderers apply. */
export interface AriaAttributes {
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-hidden'?: boolean
  'aria-disabled'?: boolean
  'aria-expanded'?: boolean
  'aria-selected'?: boolean
  'aria-checked'?: boolean | 'mixed'
  'aria-pressed'?: boolean | 'mixed'
  'aria-busy'?: boolean
  'aria-live'?: 'off' | 'polite' | 'assertive'
  'aria-valuenow'?: number
  'aria-valuemin'?: number
  'aria-valuemax'?: number
  'aria-valuetext'?: string
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time'
  'aria-controls'?: string
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'
  'aria-modal'?: boolean
  'aria-invalid'?: boolean
  'aria-required'?: boolean
  'aria-readonly'?: boolean
  'aria-orientation'?: 'horizontal' | 'vertical'
}

/** Props every element takes. */
export interface ElementProps extends AriaAttributes, DataAttributes {
  /** Element id (native `nativeID`). */
  id?: string
  /** ClassMap classes (`cm.*`). */
  className?: string
  /** Accessibility role, when it differs from the one `as` implies. */
  role?: ElementRole
}

/** The interaction handlers a focusable element takes on both renderers. */
export interface InteractionProps {
  /** Activation: a click on the web, a press on native. */
  onClick?: MouseEventHandler
  /** Pointer enters (native: hover in, where the device has a pointer). */
  onMouseEnter?: MouseEventHandler
  /** Pointer leaves (native: hover out). */
  onMouseLeave?: MouseEventHandler
  /** The element gains focus. */
  onFocus?: FocusEventHandler
  /** The element loses focus. */
  onBlur?: FocusEventHandler
  /** A hardware key goes down; every key action also needs a touch route. */
  onKeyDown?: KeyboardEventHandler
  /** A hardware key goes up. */
  onKeyUp?: KeyboardEventHandler
  /** Web-only: a device has no double click. */
  onDoubleClick?: MouseEventHandler
  /** Web-only (deprecated on the web too); a hardware key press. */
  onKeyPress?: KeyboardEventHandler
  /** Tab order: in it (`0`) or only programmatically focusable (`-1`). */
  tabIndex?: number
}

// ============================================================================
// ELEMENTS
// ============================================================================

/** Web tags a {@link BoxProps} element renders: containers that hold elements, never bare text. */
export type BoxTag =
  | 'div'
  | 'span'
  | 'section'
  | 'header'
  | 'footer'
  | 'main'
  | 'aside'
  | 'nav'
  | 'article'
  | 'ul'
  | 'ol'
  | 'li'
  | 'dl'
  | 'dd'
  | 'figure'

/**
 * A container (native `View`; a native `Pressable` when it has a press, hover or focus handler or a
 * tab stop, as a `div` with `onClick` is). Bare text inside it is laid out as the web lays it out
 * (in a flex container, its own flex item; in any other, a line with its inline siblings). Use
 * {@link PressableProps} for a control: a button, or anything announced as one.
 */
export interface BoxProps<Node = unknown> extends ElementProps, InteractionProps {
  /** The web tag. */
  as: BoxTag
  /** Tooltip text (native: the accessibility label when there is no `aria-label`). */
  title?: string
  /** Layout and paint both renderers apply. */
  style?: BoxStyle
  /** Web-only paint. */
  webStyle?: WebStyle
  /** Child elements. */
  children?: Node
}

/**
 * How a component takes part in a line of a container that is not a flex container: inline text
 * (it renders a text element that joins the line), an inline box (a button, a badge, an icon:
 * it sits in the line beside text), or `null` for a block. The web reads this from CSS; React
 * Native has no inline layout, so the native kit is told (`registerInline` in each React kit).
 */
export type InlineKind = 'text' | 'box' | null

/**
 * A glyph of the icon font (Material Symbols): text on the web, which the font draws by ligature
 * (`<span class="…">check_circle</span>`); its codepoint on native, which draws neither ligatures
 * nor variable axes. It flows inline, as text.
 */
export interface GlyphIconProps extends ElementProps {
  /** The glyph's name (`check_circle`). On native, a name the font does not draw renders nothing. */
  name: string
  /** Draws the filled form (the font's `FILL` axis at 1). */
  filled?: boolean
  /** Layout and text paint both renderers apply (`fontSize`). */
  style?: TextStyle
  /** CSS for the web. */
  webStyle?: WebStyle
}

/** Web tags a {@link TextProps} element renders. */
export type TextTag =
  | 'span'
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'strong'
  | 'em'
  | 'small'
  | 'code'
  | 'pre'
  | 'kbd'
  | 'mark'
  | 'dt'
  | 'dd'
  | 'li'
  | 'figcaption'

/** Props shared by every {@link TextProps} variant. */
interface TextCommonProps<Node> extends ElementProps {
  /** Layout, paint and text styles both renderers apply. */
  style?: TextStyle
  /** Web-only paint. */
  webStyle?: WebStyle
  /** Tooltip text (native: the accessibility label when there is no `aria-label`). */
  title?: string
  /** Text: strings, numbers and nested text elements. */
  children?: Node
}

/** Text (native `Text`); `h1`–`h6` read as headings on native. */
export type TextProps<Node = unknown> =
  | (TextCommonProps<Node> & { as: TextTag })
  | (TextCommonProps<Node> & {
      as: 'label'
      /** The id of the field this label names (web only: a native field needs its own `aria-label`). */
      htmlFor?: string
    })
  | (TextCommonProps<Node> & {
      as: 'time'
      /** The machine-readable date or time. */
      dateTime?: string
    })

/** Web tags a {@link PressableProps} element renders. */
export type PressableTag = 'button' | 'div' | 'span' | 'li'

/**
 * Something the user activates (native `Pressable`). A string child renders as the web tag's own
 * text and inside a native `Text`.
 */
export interface PressableProps<Node = unknown> extends ElementProps, InteractionProps {
  /** The web tag. */
  as: PressableTag
  /** A button's type: always set it, a button inside a form submits it by default. */
  type?: 'button' | 'submit' | 'reset'
  /** Web-only: the form field name a submit button sends. */
  name?: string
  /** Web-only: the value a submit button sends. */
  value?: string
  /** Web-only: the id of the form the button belongs to. */
  form?: string
  /** Whether it is disabled. */
  disabled?: boolean
  /** Tooltip text (native: the accessibility label when there is no `aria-label`). */
  title?: string
  /** Layout and paint both renderers apply. */
  style?: BoxStyle
  /** Web-only paint. */
  webStyle?: WebStyle
  /** Content: elements, or a string or number. */
  children?: Node
}

/**
 * A link (native `Pressable` with the link role): an app path navigates through the router, a
 * URL on another origin opens outside the app. A string child renders as the link's text.
 */
export interface ElementLinkProps<Node = unknown> extends ElementProps, InteractionProps {
  /** Destination: an app path (`/settings?tab=billing`) or a URL. */
  to: string
  /** Replace the current history entry instead of pushing one. */
  replace?: boolean
  /** State stored with the new history entry. */
  state?: unknown
  /** Where a URL opens on the web. */
  target?: '_self' | '_blank'
  /** Relationship of a URL to the page (`'noopener noreferrer'`). */
  rel?: string
  /** Tooltip text (native: the accessibility label when there is no `aria-label`). */
  title?: string
  /** Layout and paint both renderers apply. */
  style?: BoxStyle
  /** Web-only paint. */
  webStyle?: WebStyle
  /** Content: elements, or a string or number. */
  children?: Node
}

/** A single-line or multi-line text field (native `TextInput`). */
export interface TextFieldProps extends ElementProps {
  /** `input` for one line, `textarea` for several. */
  as: 'input' | 'textarea'
  /** The kind of text (`input` only). */
  type?: 'text' | 'email' | 'password' | 'search' | 'number' | 'tel' | 'url'
  /** The on-screen keyboard to show. */
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'
  /** The field's text. */
  value?: string
  /** Text shown while the field is empty. */
  placeholder?: string
  /** Whether the user can edit the text. */
  readOnly?: boolean
  /** Whether it is disabled. */
  disabled?: boolean
  /** Longest text the field accepts. */
  maxLength?: number
  /** Visible lines (`textarea` only). */
  rows?: number
  /** The autofill hint. */
  autoComplete?: string
  /** Moves focus to the field when it mounts. */
  autoFocus?: boolean
  /** Field name. */
  name?: string
  /**
   * The text changed; read `(event.target as HTMLInputElement).value` on the web. Prefer
   * {@link TextFieldProps.onValueChange}, which native can supply too.
   */
  onChange?: ChangeEventHandler
  /** The text changed, with the new text. */
  onValueChange?: (value: string) => void
  /** The field gains focus. */
  onFocus?: FocusEventHandler
  /** The field loses focus. */
  onBlur?: FocusEventHandler
  /** A hardware key goes down. */
  onKeyDown?: KeyboardEventHandler
  /** Tab order. */
  tabIndex?: number
  /** Layout, paint and text styles both renderers apply. */
  style?: TextStyle
  /** Web-only paint (a field's border and outline resets). */
  webStyle?: WebStyle
}

/** An image (native `Image`). */
export interface ImageProps extends ElementProps {
  /** Image URL. */
  src: string
  /** Text alternative; an empty string marks a decorative image. */
  alt: string
  /** Rendered width. */
  width?: number
  /** Rendered height. */
  height?: number
  /** Tooltip text. */
  title?: string
  /** Called once the image has loaded. */
  onLoad?: () => void
  /** Called when the image fails to load (a broken URL, no network). */
  onError?: () => void
  /** Layout and paint both renderers apply. */
  style?: BoxStyle & { objectFit?: 'cover' | 'contain' | 'fill' | 'none' }
  /** Web-only paint. */
  webStyle?: WebStyle
}

/** A container that scrolls its children (native `ScrollView`). */
export interface ScrollAreaProps<Node = unknown> extends ElementProps {
  /** The web tag. */
  as: BoxTag
  /** The scroll direction. */
  direction?: 'vertical' | 'horizontal'
  /** Layout and paint both renderers apply. */
  style?: BoxStyle
  /** Web-only paint. */
  webStyle?: WebStyle
  /** Child elements. */
  children?: Node
}

// ============================================================================
// SVG
// ============================================================================

/** Paint props every SVG shape takes. */
export interface SvgPaintProps {
  /** Fill colour or `'none'`. */
  fill?: string
  /** Fill opacity, 0 to 1. */
  fillOpacity?: number
  /** Stroke colour or `'none'`. */
  stroke?: string
  /** Stroke width. */
  strokeWidth?: number
  /** Stroke opacity, 0 to 1. */
  strokeOpacity?: number
  /** Stroke end caps. */
  strokeLinecap?: 'butt' | 'round' | 'square'
  /** Stroke corners. */
  strokeLinejoin?: 'miter' | 'round' | 'bevel'
  /** Dash pattern. */
  strokeDasharray?: string | number
  /** Dash offset. */
  strokeDashoffset?: number
  /** Opacity, 0 to 1. */
  opacity?: number
  /** SVG transform (`'rotate(-90 12 12)'`). */
  transform?: string
  /** ClassMap classes. */
  className?: string
}

/** An SVG canvas (native react-native-svg `Svg`). */
export interface SvgProps<Node = unknown> extends ElementProps, SvgPaintProps {
  /** Rendered width. */
  width?: number | `${number}%`
  /** Rendered height. */
  height?: number | `${number}%`
  /** The user coordinate system (`'0 0 24 24'`). */
  viewBox?: string
  /** How the view box fits the element. */
  preserveAspectRatio?: string
  /** Whether the canvas takes keyboard focus (web). */
  focusable?: boolean
  /** The SVG namespace attribute (web; a device ignores it). */
  xmlns?: string
  /** CSS for the web, and the style a device can draw of it. */
  webStyle?: WebStyle
  /** Shapes. */
  children?: Node
}

/**
 * An SVG canvas drawn from inner SVG markup (an icon set's prebuilt glyph; native react-native-svg
 * `SvgXml`). The markup is trusted: it comes from a bonded set, never from a user.
 */
export interface SvgMarkupProps extends Omit<SvgProps, 'children'> {
  /** The markup inside the `<svg>` element. */
  markup: string
}

/** An SVG path. */
export interface SvgPathProps extends SvgPaintProps {
  /** Path data. */
  d: string
  /** Which areas the path fills. */
  fillRule?: 'nonzero' | 'evenodd'
  /** Which areas the path clips. */
  clipRule?: 'nonzero' | 'evenodd'
}

/** An SVG rectangle. */
export interface SvgRectProps extends SvgPaintProps {
  /** Left edge. */
  x?: number
  /** Top edge. */
  y?: number
  /** Width. */
  width: number
  /** Height. */
  height: number
  /** Corner radius on x. */
  rx?: number
  /** Corner radius on y. */
  ry?: number
}

/** An SVG circle. */
export interface SvgCircleProps extends SvgPaintProps {
  /** Centre x. */
  cx: number
  /** Centre y. */
  cy: number
  /** Radius. */
  r: number
}

/** An SVG ellipse. */
export interface SvgEllipseProps extends SvgPaintProps {
  /** Centre x. */
  cx: number
  /** Centre y. */
  cy: number
  /** Radius on x. */
  rx: number
  /** Radius on y. */
  ry: number
}

/** An SVG line. */
export interface SvgLineProps extends SvgPaintProps {
  /** Start x. */
  x1: number
  /** Start y. */
  y1: number
  /** End x. */
  x2: number
  /** End y. */
  y2: number
}

/** An SVG polyline or polygon. */
export interface SvgPolyProps extends SvgPaintProps {
  /** Points (`'0,0 10,10'`). */
  points: string
}

/** An SVG group. */
export interface SvgGroupProps<Node = unknown> extends SvgPaintProps {
  /** Shapes. */
  children?: Node
}

/** SVG text. */
export interface SvgTextProps<Node = unknown> extends SvgPaintProps {
  /** Anchor x. */
  x?: number
  /** Anchor y. */
  y?: number
  /** Horizontal anchor. */
  textAnchor?: 'start' | 'middle' | 'end'
  /** Font size. */
  fontSize?: number
  /** Font weight. */
  fontWeight?: 'normal' | 'bold' | number
  /** Text. */
  children?: Node
}

// ============================================================================
// NATIVE CLASS SPLITTING
// ============================================================================

/**
 * A class string divided for a native renderer, which has no CSS cascade (see
 * {@link UIClassMapNativeSplit}).
 */
export interface NativeClassSplit {
  /** Classes the native view itself applies (no display class: {@link NativeClassSplit.display}). */
  view: string
  /**
   * The text classes in effect for the element's text, as the CSS cascade would give them (text
   * properties only: `visibility`, `cursor` and other inherited CSS properties do not pass down): the
   * inherited ones the element's own text classes (colour, font, size, line height, letter
   * spacing, alignment, case, decoration, white space) do not override, then its own. A native
   * container hands them to the text inside it.
   */
  text: string
  /**
   * The display the classes give the element at its base size (no responsive or state variant), or
   * `null` when they set none: `flex`/`inline-flex` make its children flex items, `inline` and
   * `inline-*` put it in a line with its inline siblings, `block` takes it out of one.
   */
  display: 'block' | 'inline' | 'inline-block' | 'flex' | 'inline-flex' | 'none' | null
  /**
   * The lines the element's text is clamped to with an ellipsis (`truncate` is 1,
   * `line-clamp-3` is 3), or `null`. The clamp is the element's own: it is not inherited.
   */
  lines: number | null
  /**
   * The font weight {@link NativeClassSplit.text} sets at its base size (`font-bold` is 700), or
   * `null` when it sets none (the platform's normal weight). A `<strong>` draws `bolder` than it.
   */
  weight: number | null
  /**
   * Classes the element gives its descendants with one tag, as a CSS descendant selector does
   * (`[&_p]:leading-relaxed` is `{ p: 'leading-relaxed' }`): left out of `view` and `text`, and
   * applied by each descendant element whose tag it names, after that element's own classes.
   */
  descendants?: Readonly<Record<string, string>>
}

/**
 * The ClassMap member a device ClassMap (the nativewind bond) adds so native elements can do what
 * the CSS cascade does on the web. Web ClassMaps leave it out.
 */
export interface UIClassMapNativeSplit {
  /**
   * Divides a class string for a native element.
   *
   * @param className - The element's classes.
   * @param inheritedText - The text classes in effect for its container's text.
   * @param data - The element's `data-*` attributes by name without the prefix (`{ state: 'open' }`):
   *   a class with a `data-[state=open]:` variant applies only when they match, as on the web.
   * @returns The view classes, the text classes in effect for its own text, and its display.
   */
  splitForNative?(
    className: string,
    inheritedText?: string,
    data?: Readonly<Record<string, string | undefined>>,
  ): NativeClassSplit
  /**
   * The text classes a browser's stylesheet gives a `<button>` (its text is centred), which a
   * native button hands to its text beneath the button's own classes.
   */
  nativeButtonText?: string
  /**
   * The text classes the web's stylesheet gives the document (`html`, `body`), which every text
   * inherits there: native text starts from them.
   */
  nativeRootText?: string
}
