import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import ts from 'typescript'

/**
 * molecule-only config (React features and the React UI kit): where `no-intrinsic-jsx` runs, and
 * the scan that tells which packages are still pending.
 *
 * The rule holds every `.tsx` file of `packages/app/features/*-react/src` and of the React UI
 * kit's `components`, except test files and the packages listed in `intrinsic-jsx-pending.json`.
 * That list was written once from the scan below and may only shrink: when a package stops
 * rendering an intrinsic element, `scripts/__tests__/eslint-no-intrinsic-jsx.test.ts` says to
 * delete its entry, and from then on the rule holds the package. An entry is never added: an
 * intrinsic element in a converted package is a defect to fix, not an exemption to record.
 *
 * The scan reads each file with the TypeScript parser and applies the rule's own criterion: a JSX
 * opening or self-closing element whose tag is an identifier starting with a lowercase letter.
 *
 * To drop the entries the test names, from the molecule root. It only removes: a package that is
 * not listed stays unlisted whatever it renders.
 *
 * ```sh
 * node --input-type=module -e "import { writeFileSync } from 'node:fs'; import { prunedPending } from './eslint-rules/intrinsic-jsx-config.mjs'; writeFileSync('eslint-rules/intrinsic-jsx-pending.json', JSON.stringify(prunedPending(process.cwd()), null, 2) + '\n')"
 * ```
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
 * @returns {{ features: string[], kitComponents: string[] }} The lists to write back.
 */
export function prunedPending(root) {
  const still = pendingWithIntrinsicJsx(root)
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
