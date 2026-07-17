/**
 * Markdown provider implemented against the real `react-markdown` 10 library
 * plus `remark-gfm`.
 *
 * The core `@molecule/app-markdown` contract is a STRING contract —
 * `render(markdown, options)` returns `{ html: string; toc? }`. react-markdown
 * renders to React elements, so this provider renders that element tree to a
 * static HTML string with `renderToStaticMarkup` (`react-dom/server`) to
 * satisfy the contract while still getting real CommonMark + GFM parsing.
 *
 * @module
 */

import { renderToStaticMarkup } from 'react-dom/server'
import type { Components, UrlTransform } from 'react-markdown'
import Markdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'

import type {
  MarkdownOptions,
  MarkdownProvider,
  RenderedMarkdown,
  TocEntry,
} from '@molecule/app-markdown'

import type { MarkdownPluginList, ReactMarkdownConfig } from './types.js'

// ---------------------------------------------------------------------------
// Slugs + table of contents
// ---------------------------------------------------------------------------

/**
 * Generates a URL-friendly slug from heading text.
 *
 * @param text - Heading text to slugify.
 * @returns Slug string.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/**
 * Extracts a table of contents from markdown ATX headings (`#`..`######`).
 * Parsed from the source string so it is independent of react-markdown's
 * element output; the ids match those the {@link rehypeHeadingIds} plugin
 * stamps onto the rendered `<h#>` elements, so the TOC anchors resolve.
 *
 * @param markdown - Raw markdown string.
 * @returns Array of TOC entries (empty when there are no headings).
 */
function extractToc(markdown: string): TocEntry[] {
  const entries: TocEntry[] = []
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  let match: RegExpExecArray | null

  while ((match = headingRegex.exec(markdown)) !== null) {
    const text = match[2].trim()
    entries.push({ id: slugify(text), text, level: match[1].length })
  }

  return entries
}

// ---------------------------------------------------------------------------
// AST plugins (self-contained — no extra dependencies)
// ---------------------------------------------------------------------------

/** Minimal structural shape of an mdast/hast node, for the local plugins. */
interface AstNode {
  type?: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: AstNode[]
}

/**
 * Concatenates the visible text of a hast node (used to slugify a heading).
 *
 * @param node - A hast node.
 * @returns The node's text content.
 */
function textOf(node: AstNode): string {
  if (typeof node.value === 'string') {
    return node.value
  }
  if (Array.isArray(node.children)) {
    return node.children.map(textOf).join('')
  }
  return ''
}

/**
 * remark plugin that turns soft line breaks (`\n` inside a paragraph) into
 * hard `<br>` breaks. Splits each text node on `\n`, inserting `break` nodes —
 * this is what `options.breaks` enables. Runs after `remark-gfm`, so GFM block
 * structures (tables, lists) are already parsed and are left untouched.
 *
 * @returns A remark transformer.
 */
function remarkHardBreaks(): (tree: AstNode) => void {
  const walk = (node: AstNode): void => {
    if (!Array.isArray(node.children)) {
      return
    }
    const next: AstNode[] = []
    for (const child of node.children) {
      if (child.type === 'text' && typeof child.value === 'string' && child.value.includes('\n')) {
        const parts = child.value.split('\n')
        parts.forEach((part, index) => {
          if (index > 0) {
            next.push({ type: 'break' })
          }
          if (part) {
            next.push({ type: 'text', value: part })
          }
        })
      } else {
        walk(child)
        next.push(child)
      }
    }
    node.children = next
  }
  return (tree) => walk(tree)
}

/**
 * rehype plugin that stamps a slug `id` onto every heading element
 * (`h1`..`h6`), so the extracted {@link extractToc} entries anchor to real
 * targets. Mirrors the ids the regex TOC produces.
 *
 * @returns A rehype transformer.
 */
function rehypeHeadingIds(): (tree: AstNode) => void {
  const walk = (node: AstNode): void => {
    if (
      node.type === 'element' &&
      typeof node.tagName === 'string' &&
      /^h[1-6]$/.test(node.tagName)
    ) {
      const id = slugify(textOf(node))
      if (id) {
        node.properties = { ...(node.properties ?? {}), id }
      }
    }
    node.children?.forEach(walk)
  }
  return (tree) => walk(tree)
}

// ---------------------------------------------------------------------------
// URL sanitization
// ---------------------------------------------------------------------------

/** Passes every URL through unchanged — used when `sanitize` is `false`. */
const permissiveUrlTransform: UrlTransform = (url) => url

/**
 * react-dom (React 19) hoists a resource preload hint (`<link rel="preload"
 * as="image" …>`) ahead of every rendered `<img>` during server rendering.
 * That is an SSR transport artifact, not part of the rendered markdown, so it
 * is stripped from the returned HTML string.
 */
const PRELOAD_LINK_REGEX = /<link\b[^>]*\brel="preload"[^>]*\/>/g

// ---------------------------------------------------------------------------
// Component overrides
// ---------------------------------------------------------------------------

/**
 * An anchor override that applies a `target` (and, for `_blank`, a safe
 * `rel`). Destructures react-markdown's `node` extra-prop out so it never
 * leaks into the DOM as a `node="[object Object]"` attribute.
 *
 * @param target - The link target to apply.
 * @returns A react-markdown anchor component.
 */
function makeLinkComponent(target: '_blank' | '_self'): Components['a'] {
  const rel = target === '_blank' ? 'noopener noreferrer' : undefined
  const Anchor: Components['a'] = ({ node: _node, ...props }) => (
    <a {...props} target={target} rel={rel} />
  )
  return Anchor
}

/**
 * Builds the merged `Components` map: the built-in link-target override (only
 * when a non-default target is requested), then the provider config overrides,
 * then per-call option overrides — later entries win.
 *
 * @param linkTarget - The anchor target.
 * @param configComponents - Provider-level component overrides.
 * @param optionComponents - Per-call component overrides (core options).
 * @returns The merged components map (or `undefined` when empty).
 */
function buildComponents(
  linkTarget: '_blank' | '_self',
  configComponents: Components | undefined,
  optionComponents: Components | undefined,
): Components | undefined {
  const merged: Components = {
    ...(linkTarget === '_blank' ? { a: makeLinkComponent(linkTarget) } : {}),
    ...configComponents,
    ...optionComponents,
  }
  return Object.keys(merged).length > 0 ? merged : undefined
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Renders markdown to a sanitized HTML string via react-markdown + remark-gfm,
 * honoring both the provider config defaults and the per-call options.
 *
 * @param markdown - Raw markdown source.
 * @param config - Provider configuration (defaults).
 * @param options - Per-call rendering options (override shared config).
 * @returns The rendered HTML string plus an optional table of contents.
 */
function renderMarkdown(
  markdown: string,
  config: ReactMarkdownConfig,
  options?: MarkdownOptions,
): RenderedMarkdown {
  const sanitize = options?.sanitize ?? config.sanitize ?? true
  const gfm = options?.gfm ?? config.gfm ?? true
  const breaks = options?.breaks ?? false
  const linkTarget = options?.linkTarget ?? '_self'

  const remarkPlugins: MarkdownPluginList = []
  if (gfm) {
    remarkPlugins.push(remarkGfm)
  }
  if (breaks) {
    remarkPlugins.push(remarkHardBreaks)
  }
  if (config.remarkPlugins) {
    remarkPlugins.push(...config.remarkPlugins)
  }

  const rehypePlugins: MarkdownPluginList = [rehypeHeadingIds]
  if (config.rehypePlugins) {
    rehypePlugins.push(...config.rehypePlugins)
  }

  // `allowedElements` and `disallowedElements` are mutually exclusive in
  // react-markdown; `allowedElements` wins if both are configured.
  const allowedElements = config.allowedElements
  const disallowedElements = allowedElements ? undefined : config.disallowedElements

  // Core keeps `components` framework-agnostic as `Record<string, unknown>`;
  // this React bond interprets them as react-markdown `Components`.
  const optionComponents = options?.components as Components | undefined
  const components = buildComponents(linkTarget, config.components, optionComponents)

  const rendered = renderToStaticMarkup(
    <Markdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      urlTransform={sanitize ? defaultUrlTransform : permissiveUrlTransform}
      allowedElements={allowedElements}
      disallowedElements={disallowedElements}
      components={components}
    >
      {markdown}
    </Markdown>,
  )

  const html = rendered.replace(PRELOAD_LINK_REGEX, '')
  const toc = extractToc(markdown)

  return {
    html,
    toc: toc.length > 0 ? toc : undefined,
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Creates a react-markdown provider instance.
 *
 * @param config - Optional provider configuration (defaults for every render).
 * @returns A configured {@link MarkdownProvider}.
 */
export function createProvider(config: ReactMarkdownConfig = {}): MarkdownProvider {
  return {
    name: 'react-markdown',

    render(markdown: string, options?: MarkdownOptions): RenderedMarkdown {
      return renderMarkdown(markdown, config, options)
    },
  }
}

/** Default react-markdown provider instance (GFM + URL sanitization on). */
export const provider: MarkdownProvider = createProvider()
