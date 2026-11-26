import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import ts from 'typescript'

import { ELEMENT_FOR_TAG, TAKES_AS } from './no-intrinsic-jsx.mjs'

/**
 * molecule-only config (React features and the React UI kit): where `no-intrinsic-jsx` runs, and
 * the scan that tells which packages are still pending.
 *
 * The rule holds every `.tsx` file of `packages/app/features/*-react/src` and of the React UI
 * kit's `components`, except test files and the packages listed in `intrinsic-jsx-pending.json`.
 * That list was written once from the scan below and may only shrink: when a package stops
 * rendering an intrinsic element, `scripts/check-intrinsic-jsx.mjs` (the pre-commit hook and CI run
 * it) says to delete its entry, and from then on the rule holds the package. An entry is never added: an
 * intrinsic element in a converted package is a defect to fix, not an exemption to record.
 *
 * The scan reads each file with the TypeScript parser and applies the rule's own criterion: a JSX
 * opening or self-closing element whose tag is an identifier starting with a lowercase letter.
 *
 * `node scripts/check-intrinsic-jsx.mjs --fix` drops the entries it names. It only removes: a
 * package that is not listed stays unlisted whatever it renders.
 */

/** The React features, relative to the molecule root: one directory per feature. */
const FEATURES = 'packages/app/features'

/** The React UI kit's components, relative to the molecule root. */
const KIT_COMPONENTS = 'packages/app/frameworks/react-ui/src/components'

/** The files the rule holds. */
const FILES = [`${FEATURES}/*-react/src/**/*.tsx`, `${KIT_COMPONENTS}/**/*.tsx`]

/** Test files: the rule does not hold them, and the scan skips them. */
const TEST_FILES = ['**/__tests__/**', '**/*.test.tsx']

/** An intrinsic tag: the rule's criterion. */
const INTRINSIC = /^[a-z]/

/**
 * The intrinsic tags a `.tsx` source renders, in order of appearance: every element the rule
 * reports, read with the TypeScript parser.
 *
 * @param {string} text - The source.
 * @returns {string[]} The tags, once per element.
 */
const intrinsicJsxTags = (text) => {
  const source = ts.createSourceFile(
    'file.tsx',
    text,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TSX,
  )
  const tags = []
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const { tagName } = node
      if (ts.isIdentifier(tagName) && INTRINSIC.test(tagName.text)) tags.push(tagName.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return tags
}

/**
 * Whether a file is a test file: under `__tests__`, or `*.test.tsx`.
 *
 * @param {string} file - A path relative to the molecule root.
 * @returns {boolean} True for a test file.
 */
export function isTestFile(file) {
  return file.endsWith('.test.tsx') || file.split('/').includes('__tests__')
}

/**
 * The non-test `.tsx` files under a directory, in sorted order, skipping `node_modules` and dot
 * entries as ESLint does.
 *
 * @param {string} dir - An absolute path.
 * @returns {string[]} Absolute paths.
 */
const tsxFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.name !== 'node_modules' && !entry.name.startsWith('.'))
    .flatMap((entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return entry.name === '__tests__' ? [] : tsxFiles(path)
      return entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx') ? [path] : []
    })
    .sort()

/**
 * The non-test `.tsx` files the rule's globs reach, in sorted order.
 *
 * @param {string} root - The molecule root.
 * @returns {string[]} The files, relative to the root.
 */
export function sourceFiles(root) {
  const features = join(root, FEATURES)
  const files = readdirSync(features, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith('-react'))
    .flatMap((entry) => {
      const src = join(features, entry.name, 'src')
      return existsSync(src) ? tsxFiles(src) : []
    })
  return [...files, ...tsxFiles(join(root, KIT_COMPONENTS))]
    .map((file) => relative(root, file))
    .sort()
}

/** Each source file with the intrinsic tags it renders. */
const scan = (root) =>
  sourceFiles(root).map((file) => ({
    file,
    tags: intrinsicJsxTags(readFileSync(join(root, file), 'utf8')),
  }))

/** The React feature a source file is part of, if it is one. */
const featureOf = (file) => new RegExp(`^${FEATURES}/([^/]+-react)/src/`).exec(file)?.[1]

/** The React UI kit's component a source file is, relative to the components directory, if it is one. */
const componentOf = (file) =>
  file.startsWith(`${KIT_COMPONENTS}/`) ? file.slice(KIT_COMPONENTS.length + 1) : undefined

/**
 * The React features (directory names) that still render an intrinsic JSX element.
 *
 * @param {string} root - The molecule root.
 * @returns {string[]} Sorted directory names.
 */
export function featuresWithIntrinsicJsx(root) {
  const features = new Set()
  for (const { file, tags } of scan(root)) {
    const feature = featureOf(file)
    if (tags.length > 0 && feature) features.add(feature)
  }
  return [...features].sort()
}

/**
 * The React UI kit's component files (relative to its components directory) that still render one.
 *
 * @param {string} root - The molecule root.
 * @returns {string[]} Sorted file names.
 */
export function kitComponentsWithIntrinsicJsx(root) {
  const components = new Set()
  for (const { file, tags } of scan(root)) {
    const component = componentOf(file)
    if (tags.length > 0 && component) components.add(component)
  }
  return [...components].sort()
}

/**
 * The pending list as written in `intrinsic-jsx-pending.json`.
 *
 * @returns {{ features: string[], kitComponents: string[] }} Its two lists.
 */
export function readPending() {
  const { features = [], kitComponents = [] } = JSON.parse(
    readFileSync(join(import.meta.dirname, 'intrinsic-jsx-pending.json'), 'utf8'),
  )
  return { features, kitComponents }
}

/**
 * For each pending entry, whether it still renders an intrinsic JSX element. The list may only
 * shrink: an entry that comes back false is deleted from `intrinsic-jsx-pending.json`.
 *
 * @param {string} root - The molecule root.
 * @returns {{ features: Record<string, boolean>, kitComponents: Record<string, boolean> }} Each
 *   entry, and whether it still renders one.
 */
export function pendingWithIntrinsicJsx(root) {
  const { features, kitComponents } = readPending()
  const liveFeatures = new Set(featuresWithIntrinsicJsx(root))
  const liveComponents = new Set(kitComponentsWithIntrinsicJsx(root))
  return {
    features: Object.fromEntries(features.map((feature) => [feature, liveFeatures.has(feature)])),
    kitComponents: Object.fromEntries(
      kitComponents.map((file) => [file, liveComponents.has(file)]),
    ),
  }
}

/**
 * The pending list without the entries that no longer render an intrinsic JSX element: the only
 * change the list takes, so an entry is never added.
 *
 * @param {string} root - The molecule root.
 * @param {{ features: Record<string, boolean>, kitComponents: Record<string, boolean> }} [still] -
 *   A {@link pendingWithIntrinsicJsx} result for `root`, when the caller already scanned it.
 * @returns {{ features: string[], kitComponents: string[] }} The lists to write back.
 */
export function prunedPending(root, still = pendingWithIntrinsicJsx(root)) {
  return {
    features: Object.keys(still.features).filter((feature) => still.features[feature]),
    kitComponents: Object.keys(still.kitComponents).filter((file) => still.kitComponents[file]),
  }
}

/**
 * The flat-config block that holds the React features and the React UI kit's components to
 * `no-intrinsic-jsx`, minus test files and the packages pending in `intrinsic-jsx-pending.json`.
 *
 * @param {{ rules: { 'no-intrinsic-jsx': import('eslint').Linter.Rule } }} plugin - The plugin
 *   carrying the rule: `{ rules: { 'no-intrinsic-jsx': rule } }`.
 * @returns {{
 *   files: string[],
 *   ignores: string[],
 *   plugins: { 'molecule-intrinsic-jsx': import('eslint').Linter.Plugin },
 *   rules: { 'molecule-intrinsic-jsx/no-intrinsic-jsx': 'error' },
 * }} The block to add to `eslint.config.js`.
 */
export function intrinsicJsxConfig(plugin) {
  const { features, kitComponents } = readPending()
  return {
    files: [...FILES],
    ignores: [
      ...TEST_FILES,
      ...features.map((feature) => `${FEATURES}/${feature}/src/**`),
      ...kitComponents.map((file) => `${KIT_COMPONENTS}/${file}`),
    ],
    plugins: { 'molecule-intrinsic-jsx': plugin },
    rules: { 'molecule-intrinsic-jsx/no-intrinsic-jsx': 'error' },
  }
}

/** The element types, relative to the molecule root: each element's props are `<Element>Props` (`Link`'s are `ElementLinkProps`). */
const ELEMENT_TYPES = 'packages/app/core/ui/src/elements.ts'

/**
 * The web tags each element's `as` prop accepts, read from the element types with the TypeScript
 * checker: every variant of a union of props (`TextProps`) counts.
 *
 * @param {string} root - The molecule root.
 * @returns {Map<string, string[]>} Each element with an `as` prop, and its tags, sorted.
 */
export function tagsEachElementTakes(root) {
  const file = join(root, ELEMENT_TYPES)
  const program = ts.createProgram([file], { noEmit: true, skipLibCheck: true })
  const checker = program.getTypeChecker()
  const source = program.getSourceFile(file)
  const module = source && checker.getSymbolAtLocation(source)
  if (!source || !module) throw new Error(`cannot read ${file}`)
  const taken = new Map()
  for (const symbol of checker.getExportsOfModule(module)) {
    if (!symbol.name.endsWith('Props')) continue
    const props = checker.getDeclaredTypeOfSymbol(symbol)
    const tags = (props.isUnion() ? props.types : [props]).flatMap((variant) => {
      const as = checker.getPropertyOfType(variant, 'as')
      if (!as) return []
      const type = checker.getTypeOfSymbolAtLocation(as, source)
      return (type.isUnion() ? type.types : [type]).flatMap((tag) =>
        tag.isStringLiteral() ? [tag.value] : [],
      )
    })
    const element = symbol.name.slice(0, -'Props'.length).replace(/^ElementLink$/, 'Link')
    if (tags.length > 0) taken.set(element, [...new Set(tags)].sort())
  }
  return taken
}

/**
 * Where the rule's tag table (`ELEMENT_FOR_TAG`, `TAKES_AS` in `no-intrinsic-jsx.mjs`) disagrees with
 * the element types. Each gap makes the rule's message wrong: it suggests an `as` the element refuses,
 * or tells the author to add an element for a tag one already renders.
 *
 * @param {string} root - The molecule root.
 * @returns {{ unmapped: string[], refused: string[], takesAs: string[] }} One line per gap: a tag an
 *   element renders with no element in the table, a suggested `as` the element's props refuse, and an
 *   element whose `as` prop and `TAKES_AS` entry disagree.
 */
export function elementTagGaps(root) {
  const taken = tagsEachElementTakes(root)
  const unmapped = [...taken].flatMap(([element, tags]) =>
    tags
      .filter((tag) => !ELEMENT_FOR_TAG.has(tag))
      .map(
        (tag) =>
          `<${tag}>: ${element} renders it; add it to ELEMENT_FOR_TAG in eslint-rules/no-intrinsic-jsx.mjs`,
      ),
  )
  const refused = [...ELEMENT_FOR_TAG]
    .filter(([tag, element]) => TAKES_AS.has(element) && !taken.get(element)?.includes(tag))
    .map(([tag, element]) => `<${element} as="${tag}">: ${element}Props does not take as="${tag}"`)
  const named = new Set(ELEMENT_FOR_TAG.values())
  const withAs = new Set([...taken.keys()].filter((element) => named.has(element)))
  const takesAs = [
    ...[...withAs]
      .filter((element) => !TAKES_AS.has(element))
      .map(
        (element) =>
          `${element}: its props take \`as\`; add it to TAKES_AS in eslint-rules/no-intrinsic-jsx.mjs`,
      ),
    ...[...TAKES_AS]
      .filter((element) => !withAs.has(element))
      .map(
        (element) =>
          `${element}: TAKES_AS names it, but ${element}Props has no \`as\` the table uses`,
      ),
  ].sort()
  return { unmapped, refused, takesAs }
}
