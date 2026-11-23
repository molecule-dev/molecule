/**
 * The rehype steps this bond adds to react-markdown's pipeline, so the rendered
 * tree carries the DOM every `@molecule/app-markdown` provider must produce:
 * heading ids and the table of contents from one pass, links and images with an
 * unsafe URL replaced by their text, task lists and footnotes without the
 * library's class names, and the `elementAttributes` option.
 *
 * A config's own `rehypePlugins` run after these, so a provider-level override
 * still sees the normalised tree.
 *
 * @module
 */

import { isRefusedMarkdownUrl, type MarkdownOptions, type TocEntry } from '@molecule/app-markdown'

import type { TreeNode } from './tree.js'
import { textOf, visitElements } from './tree.js'

/** Class names the markdown libraries add for their own styling. */
const TASK_LIST_CLASSES: ReadonlySet<string> = new Set(['contains-task-list', 'task-list-item'])

/** The class the footnote back-link carries, which the cases do not. */
const FOOTNOTE_BACKREF_CLASSES: ReadonlySet<string> = new Set(['data-footnote-backref'])

/**
 * Removes a fixed set of class names from an element, leaving any other class
 * (the `language-*` class on a fenced code block, a class the app asked for)
 * untouched.
 *
 * @param node - The element to clean.
 * @param removed - The class names to drop.
 */
function withoutClasses(node: TreeNode, removed: ReadonlySet<string>): void {
  const properties = node.properties
  if (!properties) return
  const classes = properties.className
  if (!Array.isArray(classes)) return
  const kept = classes.filter((name: unknown) => typeof name !== 'string' || !removed.has(name))
  if (kept.length === classes.length) return
  if (kept.length === 0) {
    delete properties.className
  } else {
    properties.className = kept
  }
}

/**
 * Reads a URL-bearing property as a string.
 *
 * @param node - The element.
 * @param key - The property name (`href` or `src`).
 * @returns The URL, or `undefined` when the element has none.
 */
function urlProperty(node: TreeNode, key: 'href' | 'src'): string | undefined {
  const value = node.properties?.[key]
  return typeof value === 'string' ? value : undefined
}

/**
 * Replaces the unsafe link/image children of a list with their text, in place.
 *
 * @param children - The child nodes to process.
 * @param sanitize - Whether the shared URL allow-list is in force.
 * @returns The replacement children.
 */
function replaceUnsafeChildren(children: TreeNode[], sanitize: boolean): TreeNode[] {
  const wrapper: TreeNode = { type: 'root', children }
  replaceUnsafeElements(wrapper, sanitize)
  return wrapper.children ?? []
}

/**
 * Walks a tree and replaces every link or image whose URL is unsafe with its
 * link text or alt text: a refused URL must render no element at all, not an
 * `<a href="">` or a broken image.
 *
 * @param node - The tree (or subtree) to process.
 * @param sanitize - Whether the shared URL allow-list is in force.
 */
function replaceUnsafeElements(node: TreeNode, sanitize: boolean): void {
  if (!Array.isArray(node.children)) return
  const next: TreeNode[] = []
  for (const child of node.children) {
    const tagName = child.type === 'element' ? child.tagName : undefined
    const href = tagName === 'a' ? urlProperty(child, 'href') : undefined
    if (href !== undefined && isRefusedMarkdownUrl(href, sanitize)) {
      next.push(...replaceUnsafeChildren(child.children ?? [], sanitize))
      continue
    }
    const src = tagName === 'img' ? urlProperty(child, 'src') : undefined
    if (src !== undefined && isRefusedMarkdownUrl(src, sanitize)) {
      const alt = child.properties?.alt
      if (typeof alt === 'string' && alt !== '') {
        next.push({ type: 'text', value: alt })
      }
      continue
    }
    replaceUnsafeElements(child, sanitize)
    next.push(child)
  }
  node.children = next
}

/**
 * Builds the step that stamps a unique `id` onto every heading, from one
 * slugger per render, and collects the table of contents from the same pass —
 * so `toc` lists exactly the parsed headings (a `#` line in a code fence is not
 * one, a setext heading is) with the text and id the DOM carries.
 *
 * @param slug - The render's heading slugger from `createHeadingSlugger`.
 * @param toc - The array to fill with the document's headings in order.
 * @returns A rehype transformer.
 */
export function rehypeHeadingIdsAndToc(
  slug: (text: string) => string,
  toc: TocEntry[],
): (tree: TreeNode) => void {
  return (tree: TreeNode): void => {
    visitElements(tree, (node: TreeNode): void => {
      const tagName = node.tagName
      if (!tagName || !/^h[1-6]$/.test(tagName)) return
      const text = textOf(node)
      const id = slug(text)
      node.properties = { ...(node.properties ?? {}), id }
      toc.push({ id, text, level: Number(tagName.slice(1)) })
    })
  }
}

/**
 * Builds the step that removes the markdown library's task-list class names, so
 * a task item is `<li><input type="checkbox" disabled [checked]> text</li>`
 * with no class on the list or its items.
 *
 * @returns A rehype transformer.
 */
export function rehypeNormalizeTaskLists(): (tree: TreeNode) => void {
  return (tree: TreeNode): void => {
    visitElements(tree, (node: TreeNode): void => {
      withoutClasses(node, TASK_LIST_CLASSES)
    })
  }
}

/**
 * Builds the step that shapes GFM footnotes as the cases require: the section
 * gets its `aria-label` (no `<h2>` label, no class), each reference drops its
 * `aria-describedby`, and each back link drops its class.
 *
 * @param label - The translated footnotes-section label.
 * @returns A rehype transformer.
 */
export function rehypeNormalizeFootnotes(label: string): (tree: TreeNode) => void {
  return (tree: TreeNode): void => {
    visitElements(tree, (node: TreeNode): void => {
      const properties = node.properties
      if (!properties) return
      if (properties.dataFootnoteRef !== undefined) {
        properties.dataFootnoteRef = ''
        delete properties.ariaDescribedBy
      }
      if (properties.dataFootnoteBackref !== undefined) {
        properties.dataFootnoteBackref = ''
        withoutClasses(node, FOOTNOTE_BACKREF_CLASSES)
      }
      if (properties.dataFootnotes !== undefined) {
        properties.dataFootnotes = ''
        properties.ariaLabel = label
        delete properties.className
        if (Array.isArray(node.children)) {
          node.children = node.children.filter((child) => child.properties?.id !== 'footnote-label')
        }
      }
    })
  }
}

/**
 * Builds the step that replaces an unsafe URL on every link and image with the
 * element's text (see {@link replaceUnsafeElements}).
 *
 * @param sanitize - Whether the shared URL allow-list is in force.
 * @returns A rehype transformer.
 */
export function rehypeSafeUrls(sanitize: boolean): (tree: TreeNode) => void {
  return (tree: TreeNode): void => {
    replaceUnsafeElements(tree, sanitize)
  }
}

/**
 * Maps an `elementAttributes` attribute name onto the hast property the React
 * renderer serialises correctly. Only `class` needs translating; React treats
 * `className` as the class attribute, while `data-*` and `aria-*` names pass
 * through as written.
 *
 * @param name - The attribute name from `elementAttributes`.
 * @returns The property name to set on the element.
 */
function toPropertyName(name: string): string {
  return name === 'class' ? 'className' : name
}

/**
 * Builds the step that adds the `elementAttributes` option's attributes to
 * every element of each named kind, next to the attributes the renderer sets.
 * The option is validated before any render, so a refused attribute never
 * reaches this step.
 *
 * @param attributes - The validated `elementAttributes` option.
 * @returns A rehype transformer.
 */
export function rehypeElementAttributes(
  attributes: MarkdownOptions['elementAttributes'],
): (tree: TreeNode) => void {
  const byElement = new Map<string, Record<string, string>>()
  for (const [element, values] of Object.entries(attributes ?? {})) {
    if (values) byElement.set(element, values)
  }
  return (tree: TreeNode): void => {
    if (byElement.size === 0) return
    visitElements(tree, (node: TreeNode): void => {
      const tagName = node.tagName
      if (!tagName) return
      const isFootnoteSection =
        tagName === 'section' && node.properties?.dataFootnotes !== undefined
      const element = isFootnoteSection ? 'footnotes' : tagName
      const values = byElement.get(element)
      if (!values) return
      const properties = node.properties ?? {}
      for (const [attribute, value] of Object.entries(values)) {
        if (attribute === 'class') {
          // A configured class joins the class the renderer set (a fenced block's
          // `language-*`), as in every provider, rather than replacing it.
          const own = properties.className
          const kept = Array.isArray(own) ? own.map(String) : typeof own === 'string' ? [own] : []
          properties.className = [...kept, ...value.split(/\s+/).filter(Boolean)]
        } else {
          properties[toPropertyName(attribute)] = value
        }
      }
      node.properties = properties
    })
  }
}
