/**
 * Markdown provider implemented against the real `react-markdown` 10 library
 * plus `remark-gfm`.
 *
 * The core `@molecule/app-markdown` contract is a STRING contract —
 * `render(markdown, options)` returns `{ html: string; toc }`. react-markdown
 * renders to React elements, so this provider renders that element tree to a
 * static HTML string with `renderToStaticMarkup` (`react-dom/server`) to
 * satisfy the contract while still getting real CommonMark + GFM parsing.
 *
 * @module
 */

import { renderToStaticMarkup } from 'react-dom/server'
import type { Components } from 'react-markdown'
import Markdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'

import { I18nError } from '@molecule/app-i18n'
import type {
  MarkdownOptions,
  MarkdownProvider,
  RenderedMarkdown,
  TocEntry,
} from '@molecule/app-markdown'
import { checkElementAttributes, createHeadingSlugger } from '@molecule/app-markdown'

import { buildRemarkRehypeOptions, footnoteSectionLabel } from './footnotes.js'
import {
  rehypeElementAttributes,
  rehypeHeadingIdsAndToc,
  rehypeNormalizeFootnotes,
  rehypeNormalizeTaskLists,
  rehypeSafeUrls,
} from './rehype.js'
import type { TreeNode } from './tree.js'
import type { MarkdownPluginList, ReactMarkdownConfig } from './types.js'
import { createUrlTransform } from './url.js'

// ---------------------------------------------------------------------------
// Remark plugins (self-contained — no extra dependencies)
// ---------------------------------------------------------------------------

/**
 * remark plugin that turns soft line breaks (`\n` inside a paragraph) into
 * hard `<br>` breaks. Splits each text node on `\n`, inserting `break` nodes —
 * this is what `options.breaks` enables. Runs after `remark-gfm`, so GFM block
 * structures (tables, lists) are already parsed and are left untouched.
 *
 * @returns A remark transformer.
 */
function remarkHardBreaks(): (tree: TreeNode) => void {
  const walk = (node: TreeNode): void => {
    if (!Array.isArray(node.children)) {
      return
    }
    const next: TreeNode[] = []
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
 * react-dom (React 19) hoists a resource preload hint (`<link rel="preload"
 * as="image" …>`) ahead of every rendered `<img>` during server rendering.
 * That is an SSR transport artifact, not part of the rendered markdown, so it
 * is stripped from the returned HTML string.
 */
const PRELOAD_LINK_REGEX = /<link\b[^>]*\brel="preload"[^>]*\/>/g

/**
 * Reports whether a core `components` option can be handed to react-markdown:
 * every entry is a component (a function, or a `memo`/`forwardRef` object)
 * or the name of the element to render instead.
 *
 * @param value - The option as core types it, `Record<string, unknown>`.
 * @returns `true` when every entry is a react-markdown component override.
 */
function isReactMarkdownComponents(value: Record<string, unknown>): value is Components {
  return Object.values(value).every(
    (entry) =>
      typeof entry === 'function' ||
      typeof entry === 'string' ||
      (typeof entry === 'object' && entry !== null && '$typeof' in entry),
  )
}

/**
 * Renders markdown to a sanitized HTML string via react-markdown + remark-gfm,
 * honoring both the provider config defaults and the per-call options.
 *
 * @param markdown - Raw markdown source.
 * @param config - Provider configuration (defaults).
 * @param options - Per-call rendering options (override shared config).
 * @throws {I18nError} when `elementAttributes` names a refused element or attribute,
 * or `components` holds an entry that is not a component or an element name.
 * @returns The rendered HTML string and the document's table of contents.
 */
function renderMarkdown(
  markdown: string,
  config: ReactMarkdownConfig,
  options?: MarkdownOptions,
): RenderedMarkdown {
  const elementAttributes = options?.elementAttributes
  checkElementAttributes(elementAttributes)
  const optionComponents = options?.components
  if (optionComponents !== undefined && !isReactMarkdownComponents(optionComponents)) {
    throw new I18nError(
      'markdown.components.invalid',
      {},
      'components holds an entry that is not a React component or an element name.',
    )
  }

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

  const toc: TocEntry[] = []
  const slug = createHeadingSlugger()
  const footnoteLabel = footnoteSectionLabel()

  // Order: this bond's own steps, then `rehype-raw` (only for trusted content,
  // `sanitize: false`), then a config's own steps. Raw HTML therefore becomes
  // elements only after this bond's steps have run, so it gets none of them —
  // no heading id or `toc` entry, no `elementAttributes`, no URL filtering —
  // exactly as the marked provider passes raw HTML through untouched.
  const rehypePlugins: MarkdownPluginList = [
    () => rehypeNormalizeTaskLists(),
    () => rehypeNormalizeFootnotes(footnoteLabel),
    () => rehypeHeadingIdsAndToc(slug, toc),
    () => rehypeSafeUrls(sanitize),
    () => rehypeElementAttributes(elementAttributes),
  ]
  if (!sanitize) {
    rehypePlugins.push(rehypeRaw)
  }
  if (config.rehypePlugins) {
    rehypePlugins.push(...config.rehypePlugins)
  }

  // `allowedElements` and `disallowedElements` are mutually exclusive in
  // react-markdown; `allowedElements` wins if both are configured.
  const allowedElements = config.allowedElements
  const disallowedElements = allowedElements ? undefined : config.disallowedElements

  const components = buildComponents(linkTarget, config.components, optionComponents)

  const rendered = renderToStaticMarkup(
    <Markdown
      remarkPlugins={remarkPlugins}
      remarkRehypeOptions={buildRemarkRehypeOptions(footnoteLabel)}
      rehypePlugins={rehypePlugins}
      urlTransform={createUrlTransform(sanitize)}
      allowedElements={allowedElements}
      disallowedElements={disallowedElements}
      components={components}
    >
      {markdown}
    </Markdown>,
  )

  const html = rendered.replace(PRELOAD_LINK_REGEX, '')

  return {
    html,
    toc,
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
