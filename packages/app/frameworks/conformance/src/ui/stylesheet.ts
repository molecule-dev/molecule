/**
 * The reference ClassMap's real stylesheet in the test document.
 *
 * Every case renders with the Tailwind ClassMap bond (see `environment.ts`), so
 * the CSS an app ships for those classes is `@import 'tailwindcss'` plus the
 * bond's `base.css`. This module compiles exactly that for the classes the
 * current DOM uses. The normalizer reads `display` and `white-space` through
 * it to decide which whitespace draws (none between flex items, a space
 * between inline elements in a paragraph).
 *
 * The stylesheet is attached to the document only while a snapshot is being
 * normalized, and only once a whitespace decision needs it: components never
 * see it. (jsdom returns unresolved computed values, such as a unitless
 * `line-height`, where a browser returns pixels, so a component that measures
 * itself would behave unlike a browser.)
 *
 * jsdom ignores rules inside `@layer`, so the layers are unwrapped in their
 * declared order (theme, base, components, utilities), which keeps the
 * precedence the layers gave them.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import postcss from 'postcss'
import { compile } from 'tailwindcss'

type TailwindCompiler = Awaited<ReturnType<typeof compile>>

const require = createRequire(import.meta.url)

let compiling: Promise<TailwindCompiler> | undefined
let compiler: TailwindCompiler | undefined
const built = new Set<string>()
let css = ''

const loadCompiler = async (): Promise<TailwindCompiler> => {
  const tailwindDir = dirname(require.resolve('tailwindcss/package.json'))
  const baseCss = readFileSync(require.resolve('@molecule/app-ui-tailwind/base.css'), 'utf8')
  return compile(`@import 'tailwindcss';\n${baseCss}`, {
    base: tailwindDir,
    loadStylesheet: async (id: string, base: string) => {
      const path =
        id === 'tailwindcss'
          ? join(tailwindDir, 'index.css')
          : id.startsWith('./')
            ? join(base, id)
            : null
      if (!path) throw new Error(`framework-conformance: unexpected stylesheet import ${id}`)
      return { path, base: dirname(path), content: readFileSync(path, 'utf8') }
    },
  })
}

/**
 * Compiles the reference stylesheet once per test file. Await it before the
 * first {@link referenceStyles} (the case runner does).
 *
 * @returns Resolves when the compiler is ready.
 */
export async function loadReferenceStylesheet(): Promise<void> {
  compiling ??= loadCompiler()
  compiler = await compiling
}

/**
 * Unwraps `@layer` blocks (and drops layer order statements) so jsdom's
 * cascade sees the rules.
 *
 * @param source - Compiled CSS.
 * @returns The same rules without layers, in order.
 */
export function unwrapLayers(source: string): string {
  const root = postcss.parse(source)
  root.walkAtRules('layer', (rule) => {
    if (rule.nodes) rule.replaceWith(rule.nodes)
    else rule.remove()
  })
  return root.toString()
}

/** Computed style under the reference stylesheet, for one normalization. */
export interface ReferenceStyles {
  /**
   * Computed style of a connected element with the reference stylesheet
   * attached (attaching it on the first call).
   */
  computedStyle: (el: Element) => CSSStyleDeclaration | undefined
  /** Removes the stylesheet again, if a call attached it. */
  detach: () => void
}

/**
 * Opens a computed-style scope over the document: the reference stylesheet,
 * covering every class the document uses at that moment, is attached on the
 * first {@link ReferenceStyles.computedStyle} call and removed by
 * {@link ReferenceStyles.detach}.
 *
 * @param doc - The test document.
 * @returns The scope.
 */
export function referenceStyles(doc: Document): ReferenceStyles {
  let attached: HTMLStyleElement | undefined
  return {
    computedStyle: (el) => {
      if (!attached) {
        attached = doc.createElement('style')
        attached.setAttribute('data-parity-reference-stylesheet', '')
        attached.textContent = currentCss(doc)
        doc.head.append(attached)
      }
      return doc.defaultView?.getComputedStyle(el)
    },
    detach: () => {
      attached?.remove()
      attached = undefined
    },
  }
}

const currentCss = (doc: Document): string => {
  if (!compiler) {
    throw new Error('framework-conformance: await loadReferenceStylesheet() first')
  }
  let added = false
  for (const el of Array.from(doc.querySelectorAll('[class]'))) {
    for (const token of Array.from(el.classList)) {
      if (!built.has(token)) {
        built.add(token)
        added = true
      }
    }
  }
  // The first build carries the preflight and theme even before any class is used.
  if (added || !css) css = unwrapLayers(compiler.build([...built]))
  return css
}
