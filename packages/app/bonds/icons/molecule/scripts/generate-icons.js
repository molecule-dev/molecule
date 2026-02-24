/**
 * Generates individual icon module files from `@primer/octicons`.
 *
 * Usage: npx tsx scripts/generate-icons.ts
 *
 * Reads octicons data (16px variants), extracts SVG path data,
 * and writes individual .ts files to src/icons/.
 *
 * Brand/custom icons (logo-mark, logo-dot, github, google, gitlab, twitter,
 * chevrons-left, chevrons-right) are hand-maintained and NOT overwritten.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
const require = createRequire(import.meta.url)
const octicons = require('@primer/octicons')
/** Molecule icon name → octicons source name */
const ICON_MAP = {
  // Navigation
  'arrow-left': 'arrow-left',
  'arrow-right': 'arrow-right',
  'arrow-up': 'arrow-up',
  'arrow-down': 'arrow-down',
  'chevron-left': 'chevron-left',
  'chevron-right': 'chevron-right',
  'chevron-up': 'chevron-up',
  'chevron-down': 'chevron-down',
  // Status
  'info-circle': 'info',
  'check-circle': 'check-circle-fill',
  'exclamation-triangle': 'alert-fill',
  'x-circle': 'x-circle-fill',
  bell: 'bell-fill',
  // Actions
  'x-mark': 'x',
  search: 'search',
  plus: 'plus',
  minus: 'dash',
  check: 'check',
  pencil: 'pencil',
  trash: 'trash',
  copy: 'copy',
  download: 'download',
  upload: 'upload',
  share: 'share',
  link: 'link',
  'link-external': 'link-external',
  filter: 'filter',
  'sort-asc': 'sort-asc',
  'sort-desc': 'sort-desc',
  sync: 'sync',
  // UI Controls
  'ellipsis-horizontal': 'kebab-horizontal',
  eye: 'eye',
  'eye-closed': 'eye-closed',
  gear: 'gear',
  lock: 'lock',
  unlock: 'unlock',
  home: 'home',
  globe: 'globe',
  sun: 'sun',
  moon: 'moon',
  menu: 'three-bars',
  maximize: 'screen-full',
  minimize: 'screen-normal',
  // User
  user: 'person',
  people: 'people',
  'sign-in': 'sign-in',
  'sign-out': 'sign-out',
  // Content
  file: 'file',
  folder: 'file-directory',
  calendar: 'calendar',
  clock: 'clock',
  history: 'history',
  tag: 'tag',
  star: 'star-fill',
  heart: 'heart-fill',
  code: 'code',
  mail: 'mail',
  // Misc
  question: 'question',
  bookmark: 'bookmark-fill',
  pin: 'pin',
  reply: 'reply',
  image: 'image',
  table: 'table',
  thumbsup: 'thumbsup',
  thumbsdown: 'thumbsdown',
}
/** Icons that are hand-maintained (not generated) */
const SKIP_ICONS = new Set([
  'logo-mark',
  'logo-dot',
  'github',
  'google',
  'gitlab',
  'twitter',
  'chevrons-left',
  'chevrons-right',
])
/**
 * Converts a kebab-case string to camelCase (e.g. `'arrow-left'` → `'arrowLeft'`).
 * @param str - The kebab-case string.
 * @returns The camelCase version of the string.
 */
function kebabToCamel(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}
/**
 * Parses SVG `<path>` elements from an HTML string, extracting `d`, `fill-rule`, and `clip-rule` attributes.
 * @param pathHtml - Raw SVG HTML containing `<path>` elements.
 * @returns An array of parsed path objects with `d` and optional fill/clip rules.
 */
function parsePaths(pathHtml) {
  const paths = []
  const pathRegex = /<path\s+([^>]+)\/?>/g
  let match
  while ((match = pathRegex.exec(pathHtml)) !== null) {
    const attrs = match[1]
    const dMatch = /d="([^"]+)"/.exec(attrs)
    if (!dMatch) continue
    const parsed = { d: dMatch[1] }
    const fillRuleMatch = /fill-rule="([^"]+)"/.exec(attrs)
    if (fillRuleMatch) {
      parsed.fillRule = fillRuleMatch[1]
      parsed.clipRule = parsed.fillRule
    }
    paths.push(parsed)
  }
  return paths
}
/**
 * Generates the TypeScript source for an individual icon module file.
 * @param moleculeName - The kebab-case molecule icon name (e.g. `'arrow-left'`).
 * @param paths - Parsed SVG path data for the icon.
 * @param viewBox - The SVG viewBox attribute (e.g. `'0 0 16 16'`).
 * @returns The full TypeScript source string for the icon module.
 */
function generateIconFile(moleculeName, paths, viewBox) {
  const camelName = kebabToCamel(moleculeName)
  const pathEntries = paths
    .map((p) => {
      const props = [`d: '${p.d}'`]
      if (p.fillRule) {
        props.push(`fillRule: '${p.fillRule}'`)
        props.push(`clipRule: '${p.clipRule}'`)
      }
      return `    { ${props.join(', ')} }`
    })
    .join(',\n')
  return `import type { IconData } from '@molecule/app-icons'

export const ${camelName}: IconData = {
  paths: [
${pathEntries},
  ],
  viewBox: '${viewBox}',
}
`
}
/**
 * Generates the barrel (`index.ts`) file content that re-exports all icon modules.
 * @param allNames - All icon names (both generated and hand-maintained), sorted alphabetically.
 * @returns The barrel file source string with `export *` statements.
 */
function generateBarrelFile(allNames) {
  const exports = allNames
    .sort()
    .map((name) => `export * from './${name}.js'`)
    .join('\n')
  return `${exports}\n`
}
// ── Main ──────────────────────────────────────────────────────────────
const outDir = join(import.meta.dirname, '..', 'src', 'icons')
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true })
}
const generatedNames = []
const errors = []
for (const [moleculeName, octiconName] of Object.entries(ICON_MAP)) {
  if (SKIP_ICONS.has(moleculeName)) continue
  const icon = octicons[octiconName]
  if (!icon) {
    errors.push(`Octicon "${octiconName}" not found (for "${moleculeName}")`)
    continue
  }
  const size = icon.heights['16'] || icon.heights['24']
  if (!size) {
    errors.push(`No 16px or 24px variant for "${octiconName}"`)
    continue
  }
  const paths = parsePaths(size.path)
  if (paths.length === 0) {
    errors.push(`No paths parsed for "${octiconName}"`)
    continue
  }
  const viewBox = size.options.viewBox
  const content = generateIconFile(moleculeName, paths, viewBox)
  const filePath = join(outDir, `${moleculeName}.ts`)
  writeFileSync(filePath, content)
  generatedNames.push(moleculeName)
}
// Add hand-maintained icons to the barrel (they exist as separate files)
const allBarrelNames = [...generatedNames, ...SKIP_ICONS].sort()
const barrelContent = generateBarrelFile([...allBarrelNames])
writeFileSync(join(outDir, 'index.ts'), barrelContent)
if (errors.length > 0) {
  console.error('Errors:')
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`Generated ${generatedNames.length} icon files in src/icons/`)
console.log(
  `Barrel file includes ${allBarrelNames.length} total icons (${SKIP_ICONS.size} hand-maintained)`,
)
//# sourceMappingURL=generate-icons.js.map
