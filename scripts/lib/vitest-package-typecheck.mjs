import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const TEST_FILE_RE = /\.(?:test|spec)(?:-d)?\.[cm]?[jt]sx?$/
const DEDICATED_TYPE_TEST_RE = /\.(?:test|spec)-d\.[cm]?[jt]sx?$/
const TYPE_ASSERTION_RE =
  /(?:expectTypeOf|expectAssignable|expectNotAssignable|expectNever|expectDeprecated|\bassertType\s*<|@ts-expect-error)/
const NAMED_TYPE_SUITE_RE =
  /\bdescribe\s*\(\s*['"`][^'"`]*(?:type\s+safety|type\s+definitions|type\s+exports|type\s+coverage|type\s+verification|type\s+integration|type\s+compatibility|type\s+validation|type\s+inference|interface\s+compliance|public\s+api\s+types|provider\s+type\s+safety)[^'"`]*['"`]/i

/**
 * Read a JSON file, returning null when it is absent or malformed.
 * @param pathname - The file to read.
 * @returns The parsed value.
 */
function readJson(pathname) {
  try {
    return JSON.parse(fs.readFileSync(pathname, 'utf8'))
  } catch (_error) {
    return null
  }
}

/**
 * Recursively collect Vitest test files below a directory.
 * @param directory - The directory to walk.
 * @param result - The accumulator for collected files.
 * @returns The collected absolute paths.
 */
function walkFiles(directory, result = []) {
  let entries
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true })
  } catch (_error) {
    return result
  }
  for (const entry of entries) {
    if (['node_modules', 'dist', '.svelte-kit', 'coverage'].includes(entry.name)) continue
    const pathname = path.join(directory, entry.name)
    if (entry.isDirectory()) walkFiles(pathname, result)
    else if (entry.isFile() && TEST_FILE_RE.test(entry.name)) result.push(pathname)
  }
  return result
}

/**
 * Find Molecule package manifests below the repository's packages directory.
 * @param repoRoot - The repository root.
 * @returns The package directories and names.
 */
function findPackages(repoRoot) {
  const packagesRoot = path.join(repoRoot, 'packages')
  const result = []
  const stack = [packagesRoot]
  while (stack.length > 0) {
    const directory = stack.pop()
    let entries
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true })
    } catch (_error) {
      continue
    }
    for (const entry of entries) {
      if (['node_modules', 'dist', '.svelte-kit', 'coverage'].includes(entry.name)) continue
      const pathname = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        stack.push(pathname)
        continue
      }
      if (!entry.isFile() || entry.name !== 'package.json') continue
      const manifest = readJson(pathname)
      if (manifest?.name?.startsWith('@molecule/')) {
        result.push({ dir: path.dirname(pathname), name: manifest.name })
      }
    }
  }
  return result.sort((left, right) => left.name.localeCompare(right.name))
}

/**
 * Find test files containing type assertions or named type suites.
 * @param packageDir - The package directory.
 * @returns The matching absolute paths.
 */
function typeAssertionFiles(packageDir) {
  return walkFiles(path.join(packageDir, 'src'))
    .filter((pathname) => {
      if (DEDICATED_TYPE_TEST_RE.test(pathname)) return true
      const source = fs.readFileSync(pathname, 'utf8')
      return TYPE_ASSERTION_RE.test(source) || NAMED_TYPE_SUITE_RE.test(source)
    })
    .sort()
}

/**
 * Find the package's source Vitest configuration.
 * @param packageDir - The package directory.
 * @returns The configuration path, if present.
 */
function vitestConfig(packageDir) {
  for (const name of [
    'vitest.config.ts',
    'vitest.config.mts',
    'vitest.config.js',
    'vitest.config.mjs',
    'vitest.config.cjs',
  ]) {
    const pathname = path.join(packageDir, name)
    if (fs.existsSync(pathname)) return pathname
  }
  return null
}

/**
 * Find the closing brace matching an opening brace while ignoring strings and comments.
 * @param source - The source text.
 * @param open - The opening brace offset.
 * @returns The closing brace offset, or -1 when it is unbalanced.
 */
function matchingBrace(source, open) {
  let depth = 0
  let quote = null
  let escaped = false
  let lineComment = false
  let blockComment = false
  for (let index = open; index < source.length; index += 1) {
    const character = source[index]
    const next = source[index + 1]
    if (lineComment) {
      if (character === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = null
      continue
    }
    if (character === '/' && next === '/') {
      lineComment = true
      index += 1
      continue
    }
    if (character === '/' && next === '*') {
      blockComment = true
      index += 1
      continue
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character
      continue
    }
    if (character === '{') depth += 1
    else if (character === '}' && --depth === 0) return index
  }
  return -1
}

/**
 * Extract Vitest typecheck object literals from a configuration source.
 * @param config - The configuration source.
 * @returns The typecheck object literal texts.
 */
function typecheckBlocks(config) {
  const blocks = []
  const key = /\btypecheck\s*:\s*\{/g
  for (const match of config.matchAll(key)) {
    const open = config.indexOf('{', match.index)
    const close = matchingBrace(config, open)
    if (close >= 0) blocks.push(config.slice(open, close + 1))
  }
  return blocks
}

/**
 * Expand simple brace alternatives in a Vitest include pattern.
 * @param pattern - The include pattern.
 * @returns The expanded patterns.
 */
function expandBraces(pattern) {
  const open = pattern.indexOf('{')
  if (open < 0) return [pattern]
  let depth = 0
  for (let index = open; index < pattern.length; index += 1) {
    if (pattern[index] === '{') depth += 1
    if (pattern[index] === '}') {
      depth -= 1
      if (depth !== 0) continue
      const alternatives = pattern.slice(open + 1, index).split(',')
      return alternatives.flatMap((alternative) =>
        expandBraces(pattern.slice(0, open) + alternative + pattern.slice(index + 1)),
      )
    }
  }
  return [pattern]
}

/**
 * Convert the supported Vitest glob syntax to a regular expression.
 * @param pattern - The glob pattern.
 * @returns The matching regular expression.
 */
function globRegExp(pattern) {
  let expression = '^'
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index]
    if (character === '*') {
      if (pattern[index + 1] === '*') {
        index += 1
        if (pattern[index + 1] === '/') {
          index += 1
          expression += '(?:.*/)?'
        } else expression += '.*'
      } else expression += '[^/]*'
    } else if (character === '?') expression += '[^/]'
    else expression += /[\\.^$+()|[\]]/.test(character) ? `\\${character}` : character
  }
  return new RegExp(`${expression}$`)
}

/**
 * Read string include patterns from a typecheck block.
 * @param block - The typecheck object literal text.
 * @returns The configured include patterns.
 */
function includePatterns(block) {
  return [...block.matchAll(/'([^']+)'|"([^"]+)"|`([^`]+)`/g)].map(
    (match) => match[1] ?? match[2] ?? match[3],
  )
}

/**
 * Check whether a type assertion file is covered by an enabled typecheck block.
 * @param file - The assertion file.
 * @param packageDir - The package directory.
 * @param blocks - The enabled typecheck blocks.
 * @returns Whether the file is covered.
 */
function isCovered(file, packageDir, blocks) {
  const relative = path.relative(packageDir, file).split(path.sep).join('/')
  const dedicated = DEDICATED_TYPE_TEST_RE.test(relative)
  return blocks.some((block) => {
    if (dedicated && !/\binclude\s*:/.test(block)) return true
    if (/configDefaults\.typecheck\.include/.test(block) && dedicated) return true
    return includePatterns(block).some((pattern) =>
      expandBraces(pattern.replace(/^\.\//, '')).some((expanded) =>
        globRegExp(expanded).test(relative),
      ),
    )
  })
}

/**
 * Report packages whose type assertion files are not covered by Vitest typechecking.
 * @param repoRoot - The repository root.
 * @returns The gaps.
 */
export function findVitestTypecheckGaps(repoRoot) {
  const gaps = []
  for (const packageInfo of findPackages(repoRoot)) {
    const files = typeAssertionFiles(packageInfo.dir)
    if (files.length === 0) continue
    const configPath = vitestConfig(packageInfo.dir)
    const config = configPath ? fs.readFileSync(configPath, 'utf8') : ''
    const blocks = typecheckBlocks(config).filter((block) => /\benabled\s*:\s*true\b/.test(block))
    if (blocks.length === 0) {
      gaps.push({
        package: packageInfo.name,
        dir: path.relative(repoRoot, packageInfo.dir),
        file: null,
        reason: 'no enabled Vitest typecheck project',
      })
      continue
    }
    for (const file of files) {
      if (isCovered(file, packageInfo.dir, blocks)) continue
      gaps.push({
        package: packageInfo.name,
        dir: path.relative(repoRoot, packageInfo.dir),
        file: path.relative(packageInfo.dir, file),
        reason: 'type assertion file is outside every enabled typecheck include',
      })
    }
  }
  return gaps
}

/**
 * Format typecheck coverage gaps for the command-line report.
 * @param gaps - The gaps.
 * @returns The newline-separated report.
 */
export function formatVitestTypecheckGaps(gaps) {
  return gaps
    .map((gap) => `${gap.package}: ${gap.reason}${gap.file ? ` (${gap.file})` : ''}`)
    .join('\n')
}

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  const repoRoot = path.resolve(process.argv[2] ?? process.cwd())
  const gaps = findVitestTypecheckGaps(repoRoot)
  if (gaps.length > 0) {
    process.stderr.write(`${formatVitestTypecheckGaps(gaps)}\n`)
    process.exitCode = 1
  } else {
    process.stdout.write(
      'All packages with test type assertions have an enabled Vitest typecheck.\n',
    )
  }
}
