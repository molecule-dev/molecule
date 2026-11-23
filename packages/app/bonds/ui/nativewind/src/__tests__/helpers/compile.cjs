/**
 * Compiles classes the way a NativeWind app's build does: Tailwind v3 with
 * `nativewind/preset` and this package's preset, then (for a device)
 * NativeWind's own compiler, `cssToReactNativeRuntime`.
 *
 * Two lookups are pointed where an app's install puts them: `tailwindcss` is
 * the v3 copy this package installs (NativeWind's plugins need v3; the
 * workspace root hoists v4), and `react-native/package.json`, which the
 * compiler reads for its feature flags, is the scaffold's react-native version.
 */
'use strict'

const Module = require('node:module')
const path = require('node:path')
const process = require('node:process')

const PACKAGE = path.resolve(__dirname, '../../..')
const tailwindDir = path.dirname(require.resolve('tailwindcss/package.json', { paths: [PACKAGE] }))
const nativewindDir = path.dirname(require.resolve('nativewind/package.json', { paths: [PACKAGE] }))
const interopDir = path.dirname(
  require.resolve('react-native-css-interop/package.json', { paths: [nativewindDir] }),
)

const resolveFilename = Module._resolveFilename
Module._resolveFilename = function (request, parent, ...rest) {
  if (request === 'react-native/package.json')
    return path.join(__dirname, 'react-native-package.json')
  if (request === 'tailwindcss' || request.startsWith('tailwindcss/'))
    return resolveFilename.call(
      this,
      tailwindDir + request.slice('tailwindcss'.length),
      parent,
      ...rest,
    )
  return resolveFilename.call(this, request, parent, ...rest)
}

const appRequire = Module.createRequire(path.join(PACKAGE, 'package.json'))
const PRESET = path.join(PACKAGE, 'dist/preset.cjs')

/**
 * Loads the built preset for one platform (it reads `NATIVEWIND_OS` when loaded).
 *
 * @param {string | undefined} os - `ios`, `android`, or `undefined` for the web.
 * @returns {Record<string, unknown>} The preset.
 */
function loadPreset(os) {
  return withOs(os, () => {
    delete require.cache[PRESET]
    return require(PRESET)
  })
}

/**
 * Runs a function with `NATIVEWIND_OS` set as a build for that platform sets it.
 *
 * @template T
 * @param {string | undefined} os - The platform.
 * @param {() => T} fn - The function.
 * @returns {T} Its result.
 */
function withOs(os, fn) {
  const previous = process.env.NATIVEWIND_OS
  if (os === undefined) delete process.env.NATIVEWIND_OS
  else process.env.NATIVEWIND_OS = os
  try {
    return fn()
  } finally {
    if (previous === undefined) delete process.env.NATIVEWIND_OS
    else process.env.NATIVEWIND_OS = previous
  }
}

/**
 * Tailwind's CSS for some classes, as a build for that platform generates it.
 *
 * @param {string[]} classes - The classes the sources contain.
 * @param {string | undefined} os - `ios`, `android`, or `undefined` for the web.
 * @returns {Promise<{ css: string, root: import('postcss').Root }>} The CSS.
 */
async function tailwindCss(classes, os) {
  const postcss = appRequire('postcss')
  const tailwind = appRequire('tailwindcss')
  const preset = loadPreset(os)
  const nativewindPreset = withOs(os, () => {
    for (const id of Object.keys(require.cache))
      if (id.startsWith(nativewindDir)) delete require.cache[id]
    return appRequire('nativewind/preset')
  })
  const config = { content: [{ raw: classes.join(' ') }], presets: [nativewindPreset, preset] }
  const previous = process.env.NATIVEWIND_OS
  if (os === undefined) delete process.env.NATIVEWIND_OS
  else process.env.NATIVEWIND_OS = os
  try {
    const result = await postcss([tailwind(config)]).process(
      '@tailwind base;\n@tailwind components;\n@tailwind utilities;',
      { from: undefined },
    )
    return { css: result.css, root: result.root }
  } finally {
    if (previous === undefined) delete process.env.NATIVEWIND_OS
    else process.env.NATIVEWIND_OS = previous
  }
}

/**
 * The class names that have a rule in some CSS.
 *
 * @param {import('postcss').Root} root - The parsed CSS.
 * @returns {Set<string>} The classes.
 */
function classesWithRules(root) {
  const selectorParser = Module.createRequire(path.join(tailwindDir, 'package.json'))(
    'postcss-selector-parser',
  )
  const found = new Set()
  root.walkRules((rule) => {
    selectorParser((selectors) =>
      selectors.walkClasses((node) => found.add(node.value)),
    ).processSync(rule.selector)
  })
  return found
}

/**
 * The classes NativeWind's compiler gives a device style.
 *
 * @param {string} css - Tailwind's CSS for a device build.
 * @returns {Set<string>} The classes.
 */
function classesWithNativeStyles(css) {
  const { cssToReactNativeRuntime } = require(path.join(interopDir, 'dist/css-to-rn/index.js'))
  const compiled = cssToReactNativeRuntime(css, {})
  const rules =
    compiled.rules instanceof Map ? compiled.rules : new Map(Object.entries(compiled.rules ?? {}))
  return new Set(rules.keys())
}

module.exports = { classesWithNativeStyles, classesWithRules, loadPreset, tailwindCss }
