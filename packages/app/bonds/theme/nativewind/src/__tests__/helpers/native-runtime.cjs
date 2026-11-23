/**
 * Runs NativeWind's real DEVICE runtime under Node, the way Metro resolves it in
 * an iOS build:
 *
 * - `nativewind` is `react-native-css-interop`'s native runtime API, which is
 *   what nativewind's entry re-exports on a device (`StyleSheet`, `colorScheme`,
 *   `cssInterop`). The entries themselves cannot load under Node: they require a
 *   JSX pragma check (`doctor.js`) that only Metro's Babel compiles;
 * - inside that runtime, a file with a `.native.js` sibling loads the sibling
 *   (Metro's platform extensions);
 * - `react-native` is the stand-in in `react-native.cjs`, and its version (the
 *   compiler's feature flags read it) is the scaffold's, in `react-native-package.json`;
 * - `tailwindcss` is the v3 copy this package installs (NativeWind's Tailwind
 *   plugins need v3; the workspace root hoists v4).
 *
 * The stylesheet is compiled as NativeWind's Metro transformer compiles it:
 * Tailwind v3 with `nativewind/preset` and `@molecule/app-ui-nativewind/preset`,
 * `NATIVEWIND_OS=ios`, then `cssToReactNativeRuntime` and `registerCompiled`.
 */
'use strict'

const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const process = require('node:process')

const PACKAGE = path.resolve(__dirname, '../../..')
const anchor = path.join(PACKAGE, 'package.json')
const tailwindDir = path.dirname(require.resolve('tailwindcss/package.json', { paths: [PACKAGE] }))
const interopDir = path.dirname(
  require.resolve('react-native-css-interop/package.json', {
    paths: [path.dirname(require.resolve('nativewind/package.json', { paths: [PACKAGE] }))],
  }),
)
const nativewindDir = path.dirname(require.resolve('nativewind/package.json', { paths: [PACKAGE] }))

const resolveFilename = Module._resolveFilename
Module._resolveFilename = function (request, parent, ...rest) {
  if (request === 'react-native') return path.join(__dirname, 'react-native.cjs')
  if (request === 'react-native/package.json')
    return path.join(__dirname, 'react-native-package.json')
  if (request === 'react-native-reanimated' || request === 'react-native-safe-area-context')
    return path.join(__dirname, 'empty.cjs')
  if (request === 'tailwindcss' || request.startsWith('tailwindcss/'))
    return resolveFilename.call(
      this,
      tailwindDir + request.slice('tailwindcss'.length),
      parent,
      ...rest,
    )
  const resolved = resolveFilename.call(this, request, parent, ...rest)
  if (resolved.startsWith(interopDir) || resolved.startsWith(nativewindDir)) {
    const native = resolved.replace(/\.js$/, '.native.js')
    if (native !== resolved && fs.existsSync(native)) return native
  }
  return resolved
}

// NativeWind's runtime takes a test-only shortcut when NODE_ENV is 'test': it sets
// the scheme without the Appearance event a device fires, and reads 'system' as
// light. Run it as an app build runs it.
process.env.NODE_ENV = 'production'

const appRequire = Module.createRequire(anchor)
const React = appRequire('react')
const { renderToStaticMarkup } = appRequire('react-dom/server')
const nativewind = appRequire(path.join(interopDir, 'dist/runtime/native/api.js'))
const { cssToReactNativeRuntime } = appRequire(path.join(interopDir, 'dist/css-to-rn/index.js'))
const reactNative = appRequire('react-native')

/**
 * Compiles classes the way an iOS build does and registers the result.
 *
 * @param {string[]} classes - The classes the app's sources contain.
 * @returns {Promise<void>}
 */
async function registerClasses(classes) {
  const postcss = appRequire('postcss')
  const tailwind = appRequire('tailwindcss')
  const previous = process.env.NATIVEWIND_OS
  process.env.NATIVEWIND_OS = 'ios'
  try {
    const presetPath = appRequire.resolve('@molecule/app-ui-nativewind/preset')
    delete require.cache[presetPath]
    const config = {
      content: [{ raw: classes.join(' ') }],
      presets: [appRequire('nativewind/preset'), appRequire(presetPath)],
    }
    const { css } = await postcss([tailwind(config)]).process(
      '@tailwind base;\n@tailwind components;\n@tailwind utilities;',
      { from: undefined },
    )
    nativewind.StyleSheet.registerCompiled(cssToReactNativeRuntime(css, {}))
  } finally {
    if (previous === undefined) delete process.env.NATIVEWIND_OS
    else process.env.NATIVEWIND_OS = previous
  }
}

/**
 * Renders one host component through NativeWind's runtime and returns the
 * style it received.
 *
 * @param {string} className - The classes.
 * @param {string} [component] - The react-native host component.
 * @returns {Record<string, unknown>} The style.
 */
function styleOf(className, component = 'View') {
  const Interop = nativewind.cssInterop(reactNative[component], { className: 'style' })
  const html = renderToStaticMarkup(React.createElement(Interop, { className }))
  const match = /data-style="([^"]*)"/.exec(html)
  if (!match) throw new Error(`no style rendered for "${className}"`)
  return JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'))
}

module.exports = { nativewind, reactNative, registerClasses, styleOf }
