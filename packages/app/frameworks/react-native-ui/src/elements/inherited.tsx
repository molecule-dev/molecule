/**
 * What the CSS cascade does on the web, for native elements: text classes a container hands to its
 * text, and the line boxes that lay out inline children side by side.
 *
 * @module
 */

import {
  Children,
  cloneElement,
  createContext,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useMemo,
} from 'react'
import { Text as NativeText, type TextProps, type TextStyle, View } from 'react-native'

import { getClassMap, type InlineKind, type NativeClassSplit } from '@molecule/app-ui'

import { displaysContents, isRegistered, registeredKind } from './flow.js'
import { NoGridCell } from './grid.js'

/** The text classes the nearest container hands down (CSS inheritance); none above the first. */
const InheritedText = createContext<string | null>(null)

/** A container's inherited inline font style, resolved before reaching native text. */
const InheritedFontStyle = createContext<TextStyle['fontStyle']>(undefined)

/** Reads the font style the nearest address block or text run supplies. */
export function useInheritedFontStyle(): TextStyle['fontStyle'] {
  return useContext(InheritedFontStyle)
}

/** Anonymous native text still inherits the address font style from its containing view. */
function InheritedTextRun({ style, ...props }: TextProps): ReactElement {
  const fontStyle = useInheritedFontStyle()
  return <NativeText {...props} style={fontStyle ? [{ fontStyle }, style] : style} />
}

/** Descendant classes by tag ({@link NativeClassSplit.descendants}) that no container gives. */
const NO_RULES: Readonly<Record<string, string>> = Object.freeze({})

/**
 * The classes the containers around an element give their descendants, by tag (a CSS descendant
 * selector: `[&_p]:leading-relaxed` on a container reaches every `p` inside it).
 */
const DescendantRules = createContext<Readonly<Record<string, string>>>(NO_RULES)

/**
 * An element's classes with the ones its containers give descendants with its tag after its own,
 * as a descendant selector applies to the element on the web.
 *
 * @param className - The element's own classes.
 * @param tag - Its web tag.
 * @param position - Whether the element starts or ends its sibling list.
 * @returns The classes it applies.
 */
export function useTagClasses(
  className: string | undefined,
  tag: string,
  position?: { first: boolean; last: boolean },
): string | undefined {
  const rules = useContext(DescendantRules)
  return (
    [
      className,
      rules[tag],
      position?.first && rules[`${tag}:first-child`],
      position?.last && rules[`${tag}:last-child`],
    ]
      .filter(Boolean)
      .join(' ') || undefined
  )
}

/**
 * The descendant classes after an element's own are added to its containers' ones.
 *
 * @param above - Its containers' ones.
 * @param own - Its own ({@link NativeClassSplit.descendants}).
 * @returns Both, by tag.
 */
function withRules(
  above: Readonly<Record<string, string>>,
  own: Readonly<Record<string, string>> | undefined,
): Readonly<Record<string, string>> {
  const tags = own ? Object.keys(own) : []
  if (!own || tags.length === 0) return above
  const out: Record<string, string> = { ...above }
  for (const tag of tags) out[tag] = [above[tag], own[tag]].filter(Boolean).join(' ')
  return out
}

/**
 * Hands an element's text classes and descendant classes to the elements inside it, as the CSS
 * cascade does.
 *
 * @param props - The element's split classes (`text` and `descendants`), its text classes when
 *   they differ from the split's (a button's), and the children.
 * @returns The children inside both.
 */
export function ElementScope({
  split,
  text = split.text,
  fontStyle,
  children,
}: {
  split: Pick<NativeClassSplit, 'text' | 'descendants'>
  text?: string
  fontStyle?: TextStyle['fontStyle']
  children?: ReactNode
}): ReactElement {
  const above = useContext(DescendantRules)
  const rules = useMemo(() => withRules(above, split.descendants), [above, split.descendants])
  const inheritedFontStyle = useInheritedFontStyle()
  return (
    <InheritedText.Provider value={text}>
      <DescendantRules.Provider value={rules}>
        <InheritedFontStyle.Provider value={fontStyle ?? inheritedFontStyle}>
          <NoGridCell>{children}</NoGridCell>
        </InheritedFontStyle.Provider>
      </DescendantRules.Provider>
    </InheritedText.Provider>
  )
}

/**
 * Whether a block container laid the nearest element out as a block of its own: `true` for each
 * of a block container's children that does not sit in a line, `false` inside a line or a flex
 * container, `null` outside every container.
 */
const BlockSlot = createContext<boolean | null>(null)

/** A lone inline box at the start of its line: as wide as its content. */
const AT_LINE_START = { alignSelf: 'flex-start' } as const

/**
 * The style an inline element needs when a block container laid it out as a block, which happens
 * when the component rendering it never said how it flows (`registerInline`): a web line would
 * make it as wide as its content, a native column stretches it across the container.
 *
 * @param kind - How the element flows by its own tag and classes.
 * @returns `{ alignSelf: 'flex-start' }` for an inline element in a block slot, else `undefined`.
 */
export function useLineStart(kind: InlineKind): typeof AT_LINE_START | undefined {
  return useContext(BlockSlot) === true && kind !== null ? AT_LINE_START : undefined
}

/**
 * The text classes the nearest container hands down; outside every container, the ones the web
 * gives the document (the ClassMap's `nativeRootText`).
 *
 * @returns The inherited text classes.
 */
export function useInheritedText(): string {
  return useContext(InheritedText) ?? getClassMap().nativeRootText ?? ''
}

/**
 * Splits an element's classes for a native view through the ClassMap (`splitForNative`); a
 * ClassMap without it keeps every class on the view and hands the inherited text classes on.
 *
 * @param className - The element's classes.
 * @param inheritedText - The text classes in effect for its container's text.
 * @returns The view classes, the text classes in effect for its own text, and its display.
 */
export function splitClasses(
  className: string | undefined,
  inheritedText = '',
  data?: Readonly<Record<string, string | undefined>>,
): NativeClassSplit {
  const cm = getClassMap()
  return (
    cm.splitForNative?.(className ?? '', inheritedText, data) ?? {
      view: className ?? '',
      text: inheritedText,
      display: null,
      lines: null,
      weight: null,
    }
  )
}

/**
 * The text classes a native button hands down before its own: the inherited ones under what a
 * browser's stylesheet gives a `<button>` (the ClassMap's `nativeButtonText`).
 *
 * @param inherited - The text classes its container hands down.
 * @returns The text classes in effect beneath the button's own.
 */
export function buttonText(inherited: string): string {
  const defaults = getClassMap().nativeButtonText
  return defaults ? splitClasses(defaults, inherited).text : inherited
}

/**
 * The classes of a native element that draws text itself (a `Text`, a `TextInput`): the text
 * classes in effect for it, then its own other classes.
 *
 * @param split - Its split classes.
 * @returns The class string.
 */
export function textElementClasses(split: NativeClassSplit): string | undefined {
  return [split.text, split.view].filter(Boolean).join(' ') || undefined
}

/**
 * The inline kind of a child.
 *
 * @param child - A child node.
 * @returns Its kind, or `null` for a block.
 */
function inlineKind(child: ReactNode): InlineKind {
  if (typeof child === 'string' || typeof child === 'number') return 'text'
  if (!isValidElement<Record<string, unknown> & { children?: ReactNode }>(child)) return null
  if (displaysContents(child.type, child.props)) return inlineKind(child.props.children)
  const kind = registeredKind(child.type, child.props) ?? null
  // Text-level content is inline; an element drawn as a box says itself whether it is inline
  // (its flow applies blockInInline) or an inline box.
  return kind === 'text' ? blockInInline(kind, child.props.children, true) : kind
}

/**
 * How an element flows once the blocks among its children are counted: the web splits an inline
 * element around a block inside it (block-in-inline), so the block stacks, the inline element
 * puts no line of its own around it, and its box spans the block's width. An inline box
 * (`inline-block`, a button) holds its blocks inside it and stays on the line.
 *
 * @param kind - How the element flows by its own tag and classes.
 * @param children - Its children.
 * @param inline - Whether the element is inline on the web ({@link isCssInline}).
 * @returns `null` for an inline element holding a block, else `kind`.
 */
export function blockInInline(kind: InlineKind, children: unknown, inline: boolean): InlineKind {
  return kind !== null && inline && containsBlock(children) ? null : kind
}

/**
 * Whether an element is inline on the web, rather than an inline box or a block: its display
 * class is `inline`, or it has none and its tag is inline (`span`, `a`). A button is an inline
 * box by the browser's own stylesheet.
 *
 * @param className - Its classes.
 * @param inlineTag - Whether its tag is inline.
 * @param data - Its data attributes.
 * @returns Whether it is inline.
 */
export function isCssInline(
  className: unknown,
  inlineTag: boolean,
  data?: Readonly<Record<string, string | undefined>>,
): boolean {
  const { display } = splitClasses(typeof className === 'string' ? className : undefined, '', data)
  return display === 'inline' || (display === null && inlineTag)
}

/**
 * Whether children hold a block: an element that is not inline.
 *
 * @param children - The children.
 * @returns Whether one of them is a block.
 */
function containsBlock(children: unknown): boolean {
  if (children === undefined || children === null || typeof children !== 'object') return false
  return flatten(children as ReactNode).some(
    (child) => isValidElement(child) && inlineKind(child) === null,
  )
}

/**
 * How a replaced element (an image, a drawing) flows: a block when the web's stylesheet makes its
 * tag one (the ClassMap's `nativeBlockTags`: Tailwind's reset makes `svg` and `img` blocks),
 * otherwise an inline box, unless a display class says otherwise.
 *
 * @param className - Its classes.
 * @param tag - Its web tag.
 * @returns Its inline kind.
 */
export function replacedFlow(className: unknown, tag: string): InlineKind {
  const { display } = splitClasses(typeof className === 'string' ? className : undefined)
  if (isBlockDisplay(display)) return null
  if (display === 'inline' || isInlineBoxDisplay(display)) return 'box'
  return getClassMap().nativeBlockTags?.includes(tag) ? null : 'box'
}

/**
 * A container's children with fragments and boxless fieldsets opened. Each fieldset child
 * keeps its own copy of the provider for inherited classes and disabled state.
 *
 * @param children - The children.
 * @param prefix - The key of the fragment they came from.
 * @returns The children, keyed.
 */
export function flatten(children: ReactNode, prefix = ''): ReactNode[] {
  const out: ReactNode[] = []
  for (const child of Children.toArray(children)) {
    if (isValidElement<Record<string, unknown> & { children?: ReactNode }>(child)) {
      const key = `${prefix}${String(child.key)}`
      if (child.type === Fragment) {
        out.push(...flatten(child.props.children, `${key}/`))
        continue
      }
      if (displaysContents(child.type, child.props)) {
        for (const [index, item] of flatten(child.props.children).entries()) {
          const itemKey = isValidElement(item) ? item.key : index
          out.push(cloneElement(child, { key: `${key}/${String(itemKey)}` }, item))
        }
        continue
      }
      out.push(prefix ? cloneElement(child, { key }) : child)
    } else {
      out.push(child)
    }
  }
  return out
}

/**
 * A component's name, for a message.
 *
 * @param type - The element type.
 * @returns Its display name or function name.
 */
function componentName(type: unknown): string {
  if (typeof type === 'function' || (typeof type === 'object' && type !== null)) {
    if ('displayName' in type && typeof type.displayName === 'string') return type.displayName
    if ('name' in type && typeof type.name === 'string' && type.name) return type.name
  }
  return 'A component'
}

/** Components already reported by {@link reportUnregistered}. */
const REPORTED = new Set<unknown>()

/**
 * Reports, in development, a component laid out as a block beside inline content only because it
 * never said how it flows: on the web it may sit in the line.
 *
 * @param children - A block container's children.
 * @param kinds - Their inline kinds.
 */
function reportUnregistered(children: readonly ReactNode[], kinds: readonly InlineKind[]): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return
  children.forEach((child, i) => {
    if (kinds[i] !== null || !isValidElement(child) || typeof child.type === 'string') return
    if (isRegistered(child.type) || REPORTED.has(child.type)) return
    if (!kinds[i - 1] && !kinds[i + 1]) return
    REPORTED.add(child.type)
    console.error(
      `${componentName(child.type)} sits beside inline content in a container that is not a flex container, and React Native lays it out on a line of its own because it never said how it flows. If it renders an inline element at its root (a button, a badge, an icon), call registerInline(${componentName(child.type)}, () => 'box') from @molecule/app-ui-react/elements; otherwise give the container a flex class.`,
    )
  })
}

/**
 * Whether an element's classes make it a flex container.
 *
 * @param split - The element's split classes.
 * @returns Whether its children are flex items.
 */
export function isFlex(split: NativeClassSplit): boolean {
  return split.display === 'flex' || split.display === 'inline-flex'
}

/**
 * The display classes that take an element out of a line: a block, a flex or grid container, or
 * no box at all.
 *
 * @param display - The split's display.
 * @returns Whether the element is block-level.
 */
function isBlockDisplay(display: NativeClassSplit['display']): boolean {
  return display === 'block' || display === 'flex' || display === 'grid' || display === 'none'
}

/**
 * The display classes that put an element in a line as one box.
 *
 * @param display - The split's display.
 * @returns Whether the element is an inline box.
 */
function isInlineBoxDisplay(display: NativeClassSplit['display']): boolean {
  return display === 'inline-block' || display === 'inline-flex' || display === 'inline-grid'
}

/**
 * How an element flows by its classes, given how its tag flows: a `block` or `flex` class takes an
 * inline element out of the line, an `inline*` class puts a block one in it.
 *
 * @param className - The element's classes.
 * @param tagKind - How its tag flows without classes.
 * @returns Its inline kind.
 */
export function flowOf(
  className: unknown,
  tagKind: InlineKind,
  data?: Readonly<Record<string, string | undefined>>,
): InlineKind {
  const { display } = splitClasses(typeof className === 'string' ? className : undefined, '', data)
  if (isBlockDisplay(display)) return null
  if (display === 'inline' && tagKind === null) return 'text'
  if (isInlineBoxDisplay(display)) return 'box'
  return tagKind
}

/**
 * An element's `data-*` attributes by name without the prefix, which its `data-[…]:` classes
 * match (the ClassMap's `splitForNative`). `data-mol-id` and `data-testid` name the element and
 * style nothing.
 *
 * @param props - The element's props.
 * @returns The attributes, or `undefined` when it has none.
 */
export function dataAttributes(
  props: object,
): Readonly<Record<string, string | undefined>> | undefined {
  let out: Record<string, string | undefined> | undefined
  for (const [name, value] of Object.entries(props)) {
    if (!name.startsWith('data-') || name === 'data-mol-id' || name === 'data-testid') continue
    if (value === undefined || value === null || value === false) continue
    out ??= {}
    out[name.slice('data-'.length)] = value === true ? '' : String(value)
  }
  return out
}

/** A line of inline boxes: they sit side by side, wrap, and share a baseline. */
const LINE = { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' } as const

/**
 * The text of a CSS strut: a zero-width space. Each web line box starts with an empty inline box in
 * its container's font and line height, so a line of small boxes is still one line tall.
 */
const STRUT = '\u200B'

/**
 * A line of inline boxes as native children: runs of bare text in a `Text` with the container's
 * text classes (white space collapsed, and taken off where the line starts and ends), after the
 * line's strut.
 *
 * @param run - The line's children.
 * @param text - The text classes the container hands down.
 * @returns The children of the line's row.
 */
function lineItems(run: readonly ReactNode[], text: string): ReactNode[] {
  const className = text || undefined
  const out: ReactNode[] = [
    <InheritedTextRun key="strut" className={className} aria-hidden accessible={false}>
      {STRUT}
    </InheritedTextRun>,
  ]
  let words: string[] = []
  const flush = (last: boolean): void => {
    if (words.length === 0) return
    let value = words.join('').replace(/\s+/g, ' ')
    if (out.length === 1) value = value.trimStart()
    if (last) value = value.trimEnd()
    words = []
    if (value === '') return
    out.push(
      <InheritedTextRun key={`text-${out.length}`} className={className}>
        {value}
      </InheritedTextRun>,
    )
  }
  for (const child of run) {
    if (typeof child === 'string' || typeof child === 'number') words.push(String(child))
    else {
      flush(false)
      out.push(child)
    }
  }
  flush(true)
  return out
}

/**
 * Lays out a block container's children the way the web does: runs of inline children share a
 * line (text in one `Text`, inline boxes in a wrapping row), and block children stack.
 *
 * @param children - The container's children.
 * @param text - The text classes the container hands down, for a line of text.
 * @param lines - The lines the container clamps its text to (`truncate`), or `null`.
 * @returns The native children.
 */
export function groupInline(
  children: ReactNode,
  text: string,
  lines: number | null = null,
): ReactNode {
  const items = flatten(children)
  const kinds = items.map(inlineKind)
  reportUnregistered(items, kinds)
  const out: ReactNode[] = []
  let run: ReactNode[] = []
  let boxes = false
  const flush = (): void => {
    if (run.length === 0) return
    const key = `line-${out.length}`
    out.push(
      boxes ? (
        <View
          key={key}
          style={
            run.every((child) => isValidElement<{ hidden?: boolean }>(child) && child.props.hidden)
              ? [LINE, { display: 'none' }]
              : LINE
          }
        >
          {lineItems(run, text)}
        </View>
      ) : (
        <InheritedTextRun
          key={key}
          className={text || undefined}
          numberOfLines={lines ?? undefined}
          ellipsizeMode={lines === null ? undefined : 'tail'}
        >
          {run}
        </InheritedTextRun>
      ),
    )
    run = []
    boxes = false
  }
  items.forEach((child, i) => {
    const kind = kinds[i] ?? null
    if (kind === null) {
      flush()
      out.push(
        <BlockSlot.Provider key={blockKey(child, i)} value={true}>
          {child}
        </BlockSlot.Provider>,
      )
    } else {
      if (kind === 'box') boxes = true
      run.push(child)
    }
  })
  flush()
  return <BlockSlot.Provider value={false}>{out}</BlockSlot.Provider>
}

/**
 * The key of a block child's slot: its own key, so a keyed list keeps each child's state.
 *
 * @param child - The child.
 * @param index - Its position among its siblings.
 * @returns The key.
 */
function blockKey(child: ReactNode, index: number): string {
  return isValidElement(child) && child.key !== null ? `block-${child.key}` : `block-${index}`
}

/** Text classes that keep white space as written (`whitespace-pre`, `whitespace-pre-wrap`). */
const PRESERVES_SPACE = /(?:^|\s)(?:[\w-]+:)*whitespace-(?:pre|pre-wrap|break-spaces)(?:\s|$)/

/**
 * A flex item's run of text as the web draws it: white space collapsed to single spaces and taken
 * off both ends (an anonymous flex item starts and ends a line), unless the text classes keep it.
 *
 * @param value - The text.
 * @param text - The text classes in effect.
 * @returns The text, or `''` when only white space remains.
 */
function flexItemText(value: string, text: string): string {
  return PRESERVES_SPACE.test(text) ? value : value.replace(/\s+/g, ' ').trim()
}

/**
 * Wraps each run of bare strings and numbers among a flex container's children in one native
 * `Text` with the text classes it hands down, as the web makes each run of adjacent text one
 * anonymous flex item (`{value}%` is one item, not two). A run of only white space makes none.
 *
 * @param children - The children.
 * @param text - The text classes.
 * @returns The native children.
 */
export function wrapStrings(children: ReactNode, text: string): ReactNode {
  const out: ReactNode[] = []
  let run: string[] = []
  const flush = (): void => {
    if (run.length === 0) return
    const value = flexItemText(run.join(''), text)
    run = []
    if (value === '') return
    out.push(
      <InheritedTextRun key={`text-${out.length}`} className={text || undefined}>
        {value}
      </InheritedTextRun>,
    )
  }
  for (const child of flatten(children)) {
    if (typeof child === 'string' || typeof child === 'number') run.push(String(child))
    else {
      flush()
      out.push(child)
    }
  }
  flush()
  return out
}

/**
 * A container's children laid out as the web lays them out: flex items (bare text in an
 * anonymous `Text`) in a flex container, lines and blocks in any other.
 *
 * @param children - The children.
 * @param split - The container's split classes.
 * @returns The native children.
 */
export function layoutChildren(children: ReactNode, split: NativeClassSplit): ReactNode {
  return isFlex(split) ? (
    <BlockSlot.Provider value={false}>{wrapStrings(children, split.text)}</BlockSlot.Provider>
  ) : (
    groupInline(children, split.text, split.lines)
  )
}
