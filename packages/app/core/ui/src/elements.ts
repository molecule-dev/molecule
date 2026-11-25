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
  FormEventHandler,
  KeyboardEventHandler,
  KitEvent,
  KitModifierKeys,
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

/** One sample from the contact that owns a drag, in CSS pixels on web or dp on native. */
export interface ElementDragPoint extends KitModifierKeys {
  /** Unclamped horizontal offset from the current HTML box, SVG viewport, or native frame. */
  readonly x: number
  /** Unclamped vertical offset from the current HTML box, SVG viewport, or native frame. */
  readonly y: number
  /** Horizontal displacement from contact-down in viewport axes on either renderer. */
  readonly dx: number
  /** Vertical displacement from contact-down in viewport axes on either renderer. */
  readonly dy: number
  /** Current frame in the same window space as the renderer's `measureElement`. */
  readonly bounds: Readonly<ElementBox>
}

/** One primary contact, owned until release or interruption on web and native. */
export interface ElementDrag {
  /** Axis used to negotiate with an enclosing scroller on either renderer. Defaults to both. */
  axis?: 'horizontal' | 'vertical' | 'both'
  /** Whether touch acquires on contact or waits for a long press so an ordinary swipe can scroll. */
  touchStart?: 'immediate' | 'longPress'
  /** Acquires once, including a stationary mouse, pen, or touch on either renderer. */
  onStart(point: ElementDragPoint): void
  /** Reports motion of the owned pointer or native responder, including outside the surface. */
  onMove?(point: ElementDragPoint): void
  /** Reports the final position on web pointer-up or native touch release. */
  onEnd?(point: ElementDragPoint): void
  /** Reports the last reliable sample on web capture loss or native responder interruption. */
  onCancel?(point: ElementDragPoint): void
}

/** Continuous manipulation of an element, through pointer capture or the native touch responder. */
export interface ElementDragProps {
  /** Binds one contact on the current box or the enclosing SVG viewport. */
  drag?: ElementDrag
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

/**
 * A boolean ARIA value, as React DOM takes one: `true`/`false`, or the attribute's own spelling
 * `'true'`/`'false'` (`aria-hidden="true"`). A device reads `'false'` as false.
 */
export type AriaBoolean = boolean | 'true' | 'false'

/** The accessibility attributes both renderers apply. */
export interface AriaAttributes {
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-hidden'?: AriaBoolean
  'aria-disabled'?: AriaBoolean
  'aria-expanded'?: AriaBoolean
  'aria-selected'?: AriaBoolean
  'aria-checked'?: AriaBoolean | 'mixed'
  'aria-pressed'?: AriaBoolean | 'mixed'
  'aria-busy'?: AriaBoolean
  'aria-live'?: 'off' | 'polite' | 'assertive'
  'aria-valuenow'?: number
  'aria-valuemin'?: number
  'aria-valuemax'?: number
  'aria-valuetext'?: string
  'aria-current'?: AriaBoolean | 'page' | 'step' | 'location' | 'date' | 'time'
  'aria-controls'?: string
  'aria-haspopup'?: AriaBoolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'
  'aria-modal'?: AriaBoolean
  'aria-invalid'?: AriaBoolean
  'aria-required'?: AriaBoolean
  'aria-readonly'?: AriaBoolean
  'aria-orientation'?: 'horizontal' | 'vertical'
  'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other'
  /** Web heading or tree depth. Native announces the depth and keeps the element's role. */
  'aria-level'?: number
  /** Web row total. Native exposes collection metadata or announces the localized total. */
  'aria-rowcount'?: number
  /** Web column total. Native exposes collection metadata or announces the localized total. */
  'aria-colcount'?: number
  /** One-based web row position. Native converts to collection metadata or announces the position. */
  'aria-rowindex'?: number
  /** One-based web column position. Native converts to collection metadata or announces the position. */
  'aria-colindex'?: number
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

/** Mouse handlers for containers and controls with corresponding device gestures. */
export interface MousePressProps {
  /** DOM context menu. Native calls this for a stationary long press or secondary activation. */
  onContextMenu?: MouseEventHandler
  /** DOM mouse down. Native calls this on press-in and observes canceled activation. */
  onMouseDown?: MouseEventHandler
}

// ============================================================================
// ELEMENTS
// ============================================================================

/** Web container tags and their native view counterparts, including address blocks. */
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
  | 'address'

/**
 * A container (native `View`; a native `Pressable` when it has a press, hover or focus handler or a
 * tab stop, as a `div` with `onClick` is). Bare text inside it is laid out as the web lays it out
 * (in a flex container, its own flex item; in any other, a line with its inline siblings). Use
 * {@link PressableProps} for a control: a button, or anything announced as one.
 */
export interface BoxProps<Node = unknown>
  extends ElementProps, InteractionProps, MousePressProps, ElementDragProps {
  /** The web tag. A label activates the first labelable control it wraps. */
  as: BoxTag | 'label'
  /** Tooltip text (native: the accessibility label when there is no `aria-label`). */
  title?: string
  /** HTML hidden state. Native excludes the box from layout, hits and accessibility while mounted. */
  hidden?: boolean
  /** Web outside mouse down. Native observes outside touches in the enclosing box tree. */
  onPressOutside?: () => void
  /** Observes touch-down, including on a child, without claiming it on web or native. */
  onTouchStart?: () => void
  /** A browser double-click, native double tap, or native assistive action. */
  secondaryAction?: {
    /** Localized name for the native accessibility action. The browser adds no attribute. */
    label: string
    /** Runs the secondary action from the browser event or native gesture or assistive action. */
    run: () => void
  }
  /** Consumes plain-text paste on the web or through a native field or focused Paste command. */
  onPasteText?: (text: string) => void
  /** Layout and paint both renderers apply. */
  style?: BoxStyle
  /** Web-only paint. */
  webStyle?: WebStyle
  /** Child elements. */
  children?: Node
}

/** Attributes of the browser summary or its native pressable control. */
export interface DisclosureSummaryProps extends ElementProps {
  /** Layout and paint for the summary on web and device. */
  style?: BoxStyle
  /** CSS for the summary. Devices apply the subset they can draw. */
  webStyle?: WebStyle
}

/** A disclosure with a first-child summary and a body that stays mounted while closed. */
export interface DisclosureProps<Node = unknown> extends ElementProps {
  /** A literal details element on web and a view on device. */
  as: 'details'
  /** Initial open state and subsequent parent changes. Both renderers default to closed. */
  open?: boolean
  /** Content of the browser summary or native pressable summary. */
  summary: Node
  /** Attributes on the summary element or native pressable itself. */
  summaryProps?: DisclosureSummaryProps
  /** Reports the resulting state after the browser toggle event or a queued native transition. */
  onToggle?: (open: boolean) => void
  /** Layout and paint for the whole disclosure on web and device. */
  style?: BoxStyle
  /** CSS for the details element. Devices apply the subset they can draw. */
  webStyle?: WebStyle
  /** Body content. Both renderers hide it while closed and preserve its state. */
  children?: Node
}

/** A horizontal thematic break. Web renders a void element and native draws a themed line. */
export interface RuleProps extends ElementProps, Pick<BoxProps, 'style' | 'webStyle'> {
  /** A literal hr on web and a separator view on device. */
  as: 'hr'
  /** A thematic break has no children on either renderer. */
  children?: never
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

/** Fractions of one cycle and the paint at its dimmest point. */
export interface DotPulseMotion {
  /** Full brightness as a fraction of the CSS keyframes and the native cycle, after zero. */
  readonly peakAt: number
  /** Return to dim paint in the CSS keyframes and native cycle, after the peak and at or before one. */
  readonly restAt: number
  /** Delay between dots as a fraction of a cycle, in the CSS animation and native driver. */
  readonly stagger: number
  /** Opacity from zero to one at rest, set by the stylesheet and the native view animation. */
  readonly dimOpacity: number
  /** Scale from zero to one at rest, set by the stylesheet and the native view animation. */
  readonly dimScale: number
}

/** The motion both renderers use when the ClassMap omits its typing pulse. */
export const DEFAULT_TYPING_PULSE: DotPulseMotion = Object.freeze({
  peakAt: 0.4,
  restAt: 0.8,
  stagger: 1 / 6,
  dimOpacity: 0.3,
  dimScale: 0.8,
})

/** Three decorative dots drawn in the inherited text colour. */
export interface PulseDotsProps {
  /** Dot diameter, applied to the span in CSS px and the native view in dp. */
  size: number
  /** Duration of one CSS animation cycle on web or one native loop iteration on device, in ms. */
  durationMs: number
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
  /** Web translation metadata. A device displays the supplied text. */
  translate?: 'yes' | 'no'
  /** Text: strings, numbers and nested text elements. */
  children?: Node
}

/** Text (native `Text`); `h1`–`h6` read as headings on native. */
export type TextProps<Node = unknown> =
  | (TextCommonProps<Node> & { as: TextTag })
  | (TextCommonProps<Node> & {
      as: 'label'
      /** The id of the control this label names and activates. */
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
export interface PressableProps<Node = unknown>
  extends ElementProps, InteractionProps, MousePressProps, ElementDragProps {
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
  /**
   * Where a URL opens on the web: a browsing-context keyword or name (`_self`, `_blank`, `_parent`,
   * `_top`, or a frame's name). On a device a URL opens outside the app whatever its target.
   */
  target?: string
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

/**
 * A literal anchor with no router. Web keeps the browsing context (`target`) and link
 * relationship (`rel`), which have no device equivalent. Both renderers call `onClick` before
 * the default action and honor `preventDefault()`.
 */
export type AnchorProps<Node = unknown> = Omit<
  ElementLinkProps<Node>,
  'to' | 'replace' | 'state'
> & {
  /**
   * The literal `href` on the web. A device passes absolute URLs to the OS, resolves relative
   * URLs against the app's configured public document URL, and stays on the current screen for
   * `'#'`. A relative URL with no configured base reports a diagnostic on press.
   */
  href: string
}

/** Props common to a browser text field or text area and the native TextInput. */
export interface TextFieldBaseProps extends ElementProps, InteractionProps {
  /** `input` for one line, `textarea` for several. */
  as: 'input' | 'textarea'
  /**
   * The kind of text (`input` only). A device takes a date or time as text in the web's value
   * format (`YYYY-MM-DD`, `HH:MM`, `YYYY-MM-DDTHH:MM`), so a form receives the same value.
   */
  type?:
    | 'text'
    | 'email'
    | 'password'
    | 'search'
    | 'number'
    | 'tel'
    | 'url'
    | 'date'
    | 'time'
    | 'datetime-local'
  /** The on-screen keyboard to show. */
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'
  /** The field's text. */
  value?: string
  /** The text of a field whose text the caller does not hold, when it mounts. */
  defaultValue?: string
  /** Text shown while the field is empty. */
  placeholder?: string
  /** Whether the user can edit the text. */
  readOnly?: boolean
  /** Whether it is disabled. */
  disabled?: boolean
  /** Whether a form refuses to submit while the field is empty. */
  required?: boolean
  /** Longest text the field accepts. */
  maxLength?: number
  /** Shortest text a form accepts in the field. */
  minLength?: number
  /** Web-only: a pattern a form checks the text against. */
  pattern?: string
  /** Visible lines (`textarea` only). */
  rows?: number
  /** Web-only: visible columns (`textarea` only). */
  cols?: number
  /** Web-only: how a form sends the text's line breaks (`textarea` only). */
  wrap?: 'hard' | 'soft' | 'off'
  /**
   * Grows the field with its text, between these line counts (`textarea` only): the field is
   * `minRows` lines tall when nearly empty and scrolls past `maxRows`.
   */
  autoGrow?: { minRows: number; maxRows?: number }
  /** Tooltip text (native: the accessibility label when there is no `aria-label`). */
  title?: string
  /** The autofill hint. */
  autoComplete?: string
  /** Web spell checking. Native passes the boolean on devices with a spell-check control. */
  spellCheck?: boolean
  /** Web autocorrection hint. Native maps `'on'` and `'off'` to a boolean. */
  autoCorrect?: 'on' | 'off'
  /** Web return-key label. Native uses the hint when the platform supports it. */
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send'
  /** Moves focus to the field when it mounts. */
  autoFocus?: boolean
  /** Selects the field's text on focus in the browser and on a device. */
  selectTextOnFocus?: boolean
  /** Consumes nonempty plain-text paste before insertion and length limits on web and native. */
  onPasteText?: (text: string) => void
  /** Field name. */
  name?: string
  /**
   * The text changed; read `(event.target as HTMLInputElement).value` on the web. Prefer
   * {@link TextFieldProps.onValueChange}, which native can supply too.
   */
  onChange?: ChangeEventHandler
  /** The text changed, with the new text. */
  onValueChange?: (value: string) => void
  /** The text changed: fires with {@link TextFieldProps.onChange} on each edit, on both renderers. */
  onInput?: FormEventHandler
  /** Layout, paint and text styles both renderers apply. */
  style?: TextStyle
  /** Web-only paint (a field's border and outline resets). */
  webStyle?: WebStyle
}

/** Inclusive bounds and step for a number or calendar-date field. */
export interface FieldBounds<T> {
  /** HTML minimum attribute. Native uses it as an inclusive lower bound and step base. */
  min?: T
  /** HTML maximum attribute. Native uses it as an inclusive upper bound. */
  max?: T
  /** Increment on both renderers, in days for dates. 'any' disables step validation. */
  step?: number | 'any'
}

/** Web and native text fields accept bounds only on number and date inputs. */
export type TextFieldProps = TextFieldBaseProps &
  (
    | { min?: never; max?: never; step?: never }
    | ({ as: 'input'; type: 'number' } & FieldBounds<number>)
    | ({ as: 'input'; type: 'date' } & FieldBounds<string>)
  )

/** A numeric range rendered by the browser's range input or the device's adjustable slider. */
export interface RangeFieldProps extends ElementProps, InteractionProps {
  /** Lower bound. The browser and device use 0 when it is omitted. */
  min?: number
  /** Upper bound. The browser and device use 100 when it is omitted. */
  max?: number
  /** Controlled value. The browser and device clamp and align it to their range. */
  value?: number
  /** Initial and reset value when uncontrolled. The browser and device otherwise use the midpoint. */
  defaultValue?: number
  /** Allowed value spacing. Both renderers default to 1. Use `'any'` for continuous values. */
  step?: number | 'any'
  /** Disables pointer and keyboard edits and excludes the field from forms on both renderers. */
  disabled?: boolean
  /** Field name used for form submission on the browser and device. */
  name?: string
  /** Called with the numeric value of each user edit on the browser and device. */
  onValueChange?: (value: number) => void
  /** Layout and paint applied by both the browser and device. */
  style?: BoxStyle
  /** CSS layered over `style` in the browser. The device applies the subset it can draw. */
  webStyle?: WebStyle
}

/** One selectable row in the browser's select and the device's option list. */
export interface SelectFieldOption {
  /** Value reported on selection and submitted by either renderer. */
  value: string
  /** Plain text shown by the browser and by the device. */
  label: string
  /** Both renderers keep the row visible but exclude it from edits and form entries. */
  disabled?: boolean
}

/** A browser optgroup and the corresponding device list section. */
export interface SelectFieldGroup {
  /** The browser's optgroup label and the device's noninteractive heading. */
  label: string
  /** Options in display and submission order on both renderers. */
  options: readonly SelectFieldOption[]
}

interface SelectFieldCommonProps extends ElementProps, InteractionProps {
  /** Renders a `select` in the browser and a trigger with a modal option list on a device. */
  as: 'select'
  /** Options and groups in browser DOM and device list order. */
  options: readonly (SelectFieldOption | SelectFieldGroup)[]
  /** The name used for each successful option in browser and device form entries. */
  name?: string
  /** Both renderers validate selectedness on form submission. */
  required?: boolean
  /** Both renderers block edits and omit a disabled field from form submission. */
  disabled?: boolean
  /** Focuses the enabled browser select or device trigger when it mounts. */
  autoFocus?: boolean
  /** The browser tooltip and a fallback name or supplementary accessibility hint on device. */
  title?: string
  /** Browser translation metadata. Devices display the option labels as supplied. */
  translate?: 'yes' | 'no'
  /** Styles the browser select and the device trigger and its text. */
  style?: TextStyle
  /** CSS applied last on the browser select. The device applies the subset it can draw. */
  webStyle?: WebStyle
  /** Fires before the value handler with the browser change event or device selection snapshot. */
  onChange?: ChangeEventHandler
}

type SelectFieldValue<Value> =
  | {
      /** Caller-owned selection on web and device. */
      value: Value
      /** The browser and device use the controlled value instead of a default in this mode. */
      defaultValue?: never
    }
  | {
      /** Omit on both renderers to let the field hold its selection. */
      value?: never
      /** Initial and reset selection for an uncontrolled browser or device field. */
      defaultValue?: Value
    }

/** A single or multiple select with the same option and value contract on web and device. */
export type SelectFieldProps = SelectFieldCommonProps &
  (
    | ({
        /** The browser select and the device list allow one selected option. */
        multiple?: false
        /** Reports the selected string on user edits in either renderer. */
        onValueChange?: (value: string) => void
      } & SelectFieldValue<string>)
    | ({
        /** The browser select and the device list allow multiple selected options. */
        multiple: true
        /** Reports every selected string in option order on a user edit in either renderer. */
        onValueChange?: (values: readonly string[]) => void
      } & SelectFieldValue<readonly string[]>)
  )

/** A successful control's value, including files from a web form. */
export type FormEntryValue = string | Blob

/** A form's successful controls in order, with repeated names preserved. */
export type FormEntries = ReadonlyArray<readonly [name: string, value: FormEntryValue]>

/** The form element's focus and submission methods. */
export interface FormAreaHandle extends ElementHandle {
  /** Attempts submission through normal form validation. */
  requestSubmit(): void
}

/** A form and its submission, validation and reset handlers. */
export interface FormAreaProps<Node = unknown> extends ElementProps {
  /** The web tag. */
  as: 'form'
  /** Web-only: browser submission destination. */
  action?: string
  /** Web-only: browser submission method. */
  method?: 'get' | 'post' | 'dialog'
  /** Submits even if a field fails validation. */
  noValidate?: boolean
  /** Whether browser autofill is enabled for the form. */
  autoComplete?: 'on' | 'off'
  /** Receives the event and the same entries as `new FormData(form)` on the web. */
  onSubmit?: (event: KitEvent, entries: FormEntries) => void
  /** Fires before uncontrolled fields return to their defaults. Calling preventDefault cancels reset. */
  onReset?: FormEventHandler
  /** Layout and paint both renderers apply. */
  style?: BoxStyle
  /** Web-only paint. */
  webStyle?: WebStyle
  /** The form's content. */
  children?: Node
}

/** Groups controls and disables them together when necessary. */
export interface FieldsetProps<Node = unknown> extends ElementProps {
  /** The web tag. */
  as: 'fieldset'
  /** Disables the form controls inside it. */
  disabled?: boolean
  /** The group name. */
  name?: string
  /** Layout and paint both renderers apply. */
  style?: BoxStyle
  /** Web-only paint. */
  webStyle?: WebStyle
  /** The group's content. */
  children?: Node
}

/** A checkbox or radio's state and activation methods. */
export interface CheckFieldHandle extends ElementHandle {
  /** Activates the control as a user click or press would. */
  click(): void
  /** The checked state at the time the handle is read. */
  readonly checked: boolean
}

/** Props shared by checkboxes and radios. */
interface CheckFieldCommonProps extends ElementProps {
  as: 'input'
  name?: string
  /** Form value when checked, defaulting to `'on'`. */
  value?: string
  disabled?: boolean
  required?: boolean
  autoFocus?: boolean
  /** Receives the change event. Its target's `checked` gives the new state. */
  onChange?: ChangeEventHandler
  /** Web-only: delivers the DOM change event to a legacy handler that expects it. */
  nativeChangeEvent?: boolean
  /** Receives the new checked state directly. */
  onCheckedChange?: (checked: boolean) => void
  onClick?: MouseEventHandler
  onFocus?: FocusEventHandler
  onBlur?: FocusEventHandler
  tabIndex?: number
  style?: BoxStyle
  webStyle?: WebStyle
}

/** A checkbox, or a radio whose checked state is owned by its group. */
export type CheckFieldProps =
  | (CheckFieldCommonProps & {
      type: 'checkbox'
      checked?: boolean
      defaultChecked?: boolean
      /** Draws the mixed state. */
      indeterminate?: boolean
    })
  | (CheckFieldCommonProps & {
      type: 'radio'
      checked: boolean
      defaultChecked?: never
      indeterminate?: never
    })

/** The table and row container tags. */
export type TableBoxTag = 'table' | 'thead' | 'tbody' | 'tfoot' | 'tr'

/** A table, a group of rows, or a row. */
export interface TableBoxProps<Node = unknown> extends ElementProps, InteractionProps {
  as: TableBoxTag
  /** Layout and paint both renderers apply. */
  style?: BoxStyle
  /** Web-only paint. */
  webStyle?: WebStyle
  /** The table parts this element contains. */
  children?: Node
}

/** Props shared by table data and header cells. */
interface TableCellCommonProps<Node> extends ElementProps, InteractionProps {
  /** How many columns the cell covers. */
  colSpan?: number
  /** Layout and paint, with a numeric or percentage width fixing a single column on native. */
  style?: BoxStyle
  /** Web-only paint. */
  webStyle?: WebStyle
  /** Text or elements, laid out as in Box. */
  children?: Node
}

/** A data cell or a header cell, with optional row or column scope on headers. */
export type TableCellProps<Node = unknown> =
  | (TableCellCommonProps<Node> & { as: 'td'; scope?: never })
  | (TableCellCommonProps<Node> & { as: 'th'; scope?: 'col' | 'row' })

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
  /** Focus order on the scroll area's outer frame. */
  tabIndex?: InteractionProps['tabIndex']
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

/** SVG inline paint and hit-testing supported by both renderers. */
export interface SvgStyle extends Omit<SvgPaintProps, 'className' | 'transform'> {
  /** The CSS hit-testing mode on web and the shape's native hit-testing mode. */
  pointerEvents?: 'auto' | 'none'
}

/** Identity, interaction and paint shared by an SVG canvas and its shapes. */
export interface SvgElementProps extends ElementProps, SvgPaintProps {
  /** DOM tab order. On a device, a nonnegative value supplies a focusable target. */
  tabIndex?: number
  /** DOM click. On a device, draws a shape that can be pressed. */
  onClick?: MouseEventHandler
  /** DOM key down. Native routes focused activation through the supplied key handler. */
  onKeyDown?: KeyboardEventHandler
  /** Inline SVG paint and hit-testing, applied by the browser and on a device. */
  style?: SvgStyle
  /** Additional CSS, applied after `style` by the browser. Shape CSS is omitted on a device. */
  webStyle?: WebStyle
}

/** Definitions in the enclosing SVG's ID namespace on both renderers. */
export interface SvgDefsProps<Node = unknown> {
  /** Definition elements drawn through references on web and native. */
  children: Node
}

/** Geometry referenced by `url(#id)` as a clipping region. */
export interface SvgClipPathProps<Node = unknown> extends SvgDefsProps<Node> {
  /** Local ID used by the browser's and device's SVG clipping engines. */
  id: string
}

/** One gradient stop. Equal offsets retain their input order on both renderers. */
export interface SvgGradientStop {
  /** A fraction or percentage such as `'50%'`, passed to each renderer's stop. */
  offset: ElementLength
  /** CSS colour, including `currentColor`, which native resolves to the inherited ink. */
  stopColor: string
  /** Opacity from zero to one for the browser and native stop. */
  stopOpacity?: number
}

/** A named linear paint server and its stops. */
export interface SvgLinearGradientProps {
  /** Local ID used by paint references on web and native. */
  id: string
  /** Horizontal start in the selected coordinate system, on web and native. */
  x1?: ElementLength
  /** Vertical start in the selected coordinate system, on web and native. */
  y1?: ElementLength
  /** Horizontal end in the selected coordinate system, on web and native. */
  x2?: ElementLength
  /** Vertical end in the selected coordinate system, on web and native. */
  y2?: ElementLength
  /** Coordinate system for the gradient on both renderers. */
  gradientUnits?: 'objectBoundingBox' | 'userSpaceOnUse'
  /** In-order stop elements for the browser's SVG painter and react-native-svg. */
  stops: readonly SvgGradientStop[]
}

/** A named, repeating SVG tile. */
export interface SvgPatternProps<Node = unknown> extends SvgDefsProps<Node> {
  /** Local ID used by paint references on web and native. */
  id: string
  /** Tile's horizontal origin for the browser and native SVG painter. */
  x?: ElementLength
  /** Tile's vertical origin for the browser and native SVG painter. */
  y?: ElementLength
  /** Tile width for the browser and native SVG painter. */
  width: ElementLength
  /** Tile height for the browser and native SVG painter. */
  height: ElementLength
  /** Coordinate system for the tile's origin and size, on both renderers. */
  patternUnits?: 'objectBoundingBox' | 'userSpaceOnUse'
}

/** An image positioned in SVG user space. */
export interface SvgImageProps extends SvgElementProps {
  /** Literal browser URL. Native resolves relative URLs against the public document URL. */
  href: string
  /** Horizontal origin on web and native. */
  x?: ElementLength
  /** Vertical origin on web and native. */
  y?: ElementLength
  /** Image viewport width on web and native. */
  width: ElementLength
  /** Image viewport height on web and native. */
  height: ElementLength
  /** Alignment and fit of the image in its viewport on both renderers. */
  preserveAspectRatio?: string
}

/** Descriptive SVG children. They precede geometry on web and name the native graphic. */
export interface SvgMetadata {
  /** Browser `<title>` and the device's fallback accessible name. */
  title?: string
  /** Browser `<desc>` and the device's accessible description. */
  description?: {
    /** ID that `aria-describedby` can reference on either renderer. */
    id?: string
    /** Description drawn as SVG metadata on web and spoken by the device. */
    text: string
  }
}

/** An SVG canvas (native react-native-svg `Svg`). */
export interface SvgProps<Node = unknown> extends SvgElementProps, ElementDragProps {
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
  /** Descriptive SVG children on web, and name and description for native accessibility. */
  metadata?: SvgMetadata
  /** The browser's `shape-rendering` presentation hint. The device uses its SVG painter. */
  webShapeRendering?: 'auto' | 'optimizeSpeed' | 'crispEdges' | 'geometricPrecision'
  /** Language metadata emitted as `translate` on web and consumed before native drawing. */
  translate?: 'yes' | 'no'
  /** Shapes. */
  children?: Node
}

/**
 * An SVG canvas drawn from inner SVG markup (an icon set's prebuilt glyph; native react-native-svg
 * `SvgXml`). The markup is trusted: it comes from a bonded set, never from a user.
 */
export interface SvgMarkupProps extends Omit<SvgProps, 'children' | 'drag' | 'metadata'> {
  /** The markup inside the `<svg>` element. */
  markup: string
}

/** An SVG path. */
export interface SvgPathProps extends SvgElementProps {
  /** Path data. */
  d: string
  /** Which areas the path fills. */
  fillRule?: 'nonzero' | 'evenodd'
  /** Which areas the path clips. */
  clipRule?: 'nonzero' | 'evenodd'
}

/** An SVG rectangle. */
export interface SvgRectProps extends SvgElementProps {
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
  /** Web `<title>` and `<desc>` inside this rectangle, mapped to its device focus target. */
  metadata?: SvgMetadata
  /** Web presentation attribute and native hit testing. Inline `style.pointerEvents` wins. */
  pointerEvents?: SvgStyle['pointerEvents']
  /** Web mouse entry or native hover into this rectangle when pointing hardware delivers it. */
  onMouseEnter?: InteractionProps['onMouseEnter']
}

/** An SVG circle. */
export interface SvgCircleProps extends SvgElementProps {
  /** Centre x. The web and native SVG defaults are zero. */
  cx?: number
  /** Centre y. The web and native SVG defaults are zero. */
  cy?: number
  /** Radius. */
  r: number
}

/** An SVG ellipse. */
export interface SvgEllipseProps extends SvgElementProps {
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
export interface SvgLineProps extends SvgElementProps {
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
export interface SvgPolyProps extends SvgElementProps {
  /** Points (`'0,0 10,10'`). */
  points: string
}

/** An SVG group. */
export interface SvgGroupProps<Node = unknown> extends SvgElementProps, ElementDragProps {
  /** Local clipping region reference for the web or native SVG painter. */
  clipPath?: `url(#${string})`
  /** Shapes. */
  children?: Node
}

/** SVG text. */
export interface SvgTextProps<Node = unknown> extends SvgElementProps {
  /** Anchor x. */
  x?: number
  /** Anchor y. */
  y?: number
  /** Horizontal anchor. */
  textAnchor?: 'start' | 'middle' | 'end'
  /** SVG baseline on the web. Native maps explicit baselines to `alignmentBaseline`. */
  dominantBaseline?: 'auto' | 'alphabetic' | 'middle' | 'central'
  /** Font size. */
  fontSize?: number
  /** Font weight. */
  fontWeight?: 'normal' | 'bold' | number
  /** CSS font-family on web. The device selects an available family or its system font. */
  fontFamily?: string
  /** Text. */
  children?: Node
}

// ============================================================================
// NATIVE CLASS SPLITTING
// ============================================================================

/**
 * A CSS grid's classes ({@link NativeClassSplit.grid}), by breakpoint variant: `''` at the base
 * size, then `sm`, `md`, … ({@link UIClassMapNativeSplit.nativeBreakpoints}). A device has no grid
 * layout, so a native element lays its children out from these.
 */
export interface NativeGridClasses {
  /**
   * Its columns: a count of equal columns (`grid-cols-3` is 3), or a CSS track list
   * (`grid-cols-[1fr_2fr]` is `'1fr 2fr'`). No entry at the base size is one column.
   */
  columns: Readonly<Record<string, number | string>>
  /**
   * Its explicit rows: a count of equal rows (`grid-rows-3`) or a CSS track list
   * (`grid-rows-[auto_1fr]`). No entry: rows only as its items need them.
   */
  rows?: Readonly<Record<string, number | string>>
  /** The gap between its columns, in pixels (`gap-4` and `gap-x-4` are 16). */
  columnGap: Readonly<Record<string, number>>
  /** The gap between its rows, in pixels. */
  rowGap: Readonly<Record<string, number>>
  /** How its items sit in their rows (`items-center`); stretched when it sets none. */
  alignItems: Readonly<Record<string, 'start' | 'end' | 'center' | 'stretch' | 'baseline'>>
}

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
   * `inline-*` put it in a line with its inline siblings, `block` takes it out of one and
   * `contents` lets a fieldset's children participate directly in its parent's layout.
   */
  display:
    | 'block'
    | 'inline'
    | 'inline-block'
    | 'flex'
    | 'inline-flex'
    | 'grid'
    | 'inline-grid'
    | 'contents'
    | 'none'
    | null
  /** The vertical alignment requested for a native table cell. */
  verticalAlign?: 'middle'
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
   * The line height in pixels for a field that grows by lines, keyed by breakpoint like the grid
   * classes (`''` at the base size). A bond can omit this if it does not resolve text metrics.
   */
  lineHeight?: Readonly<Record<string, number>>
  /**
   * Whether the classes set the element's width or height (`w-5`, `h-5`, `size-5`, at any
   * breakpoint). On the web a class beats a replaced element's `width` and `height` attributes, so
   * a native image or drawing takes those attributes only for the sizes its classes leave unset.
   */
  sized?: { width: boolean; height: boolean }
  /**
   * Classes the element gives its descendants with one tag, as a CSS descendant selector does
   * (`[&_p]:leading-relaxed` is `{ p: 'leading-relaxed' }`): left out of `view` and `text`, and
   * applied by each descendant element whose tag it names, after that element's own classes.
   */
  descendants?: Readonly<Record<string, string>>
  /**
   * The element's grid when {@link NativeClassSplit.display} is `grid` or `inline-grid`, else
   * `null`. Its column and span classes are left out of `view`.
   */
  grid?: NativeGridClasses | null
  /**
   * The columns the element spans as a grid item, by breakpoint variant (`col-span-2` is
   * `{ '': 2 }`; `col-span-full` is every column).
   */
  span?: Readonly<Record<string, number | 'full'>>
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
  /**
   * Lets the native styling runtime supply resolved text colour to paint computed in JavaScript.
   * The browser applies its own CSS cascade.
   *
   * @param classes - Text classes after native inheritance and overrides.
   * @param render - Draws the renderer's element with the resolved colour, if any.
   * @returns The renderer's element wrapped by the native styling runtime.
   */
  renderNativeTextColor?(classes: string, render: (color: string | undefined) => unknown): unknown
  /**
   * The tags the web's stylesheet makes blocks although a browser draws them inline (Tailwind's
   * reset makes `img` and `svg` blocks): a native image or drawing with one of these tags stacks
   * like a block unless a class puts it in a line (`inline`, `inline-block`).
   */
  nativeBlockTags?: readonly string[]
  /**
   * The window width, in pixels, from which each breakpoint variant applies (`sm:` from 640):
   * a native grid picks its columns and gaps by it.
   */
  nativeBreakpoints?: Readonly<Record<string, number>>
}
