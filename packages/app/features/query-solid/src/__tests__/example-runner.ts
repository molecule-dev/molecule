/**
 * Compiles a published doc example (TSX) with Solid's own JSX compiler
 * (babel-preset-solid, the compiler vite-plugin-solid runs under vitest), then
 * evaluates the compiled module with the import map a test provides. The
 * compiled example is real client Solid: its JSX branches are reactive, so a
 * mounted example updates as its query state changes.
 *
 * @module
 */
import { createRequire } from 'node:module'

import './node-globals.js'
import { transform } from '@babel/core'
import solidPreset from 'babel-preset-solid'
import { transformSync as esbuildTransform } from 'esbuild'

const require = createRequire(import.meta.url)

/**
 * Compiles one example to CommonJS: esbuild strips the TypeScript, Solid's
 * compiler lowers the JSX to client DOM calls, esbuild wraps the result as CJS.
 *
 * @param code - The example's TSX source.
 * @returns CommonJS source.
 */
function compileToCjs(code: string): string {
  const stripped = esbuildTransform(code, {
    loader: 'tsx',
    jsx: 'preserve',
    target: 'es2022',
    format: 'esm',
  }).code
  const compiled = transform(stripped ?? '', {
    filename: 'published-example.jsx',
    parserOpts: { sourceType: 'module' },
    presets: [solidPreset],
  })
  return (
    esbuildTransform(compiled?.code ?? '', {
      loader: 'js',
      format: 'cjs',
      target: 'node20',
    }).code ?? ''
  )
}

/**
 * Compiles one example and runs it, returning the named exports.
 *
 * @param code - The example's TSX source.
 * @param imports - The module names the example imports, mapped to the test's bindings;
 *   anything else resolves as a real package (solid-js, solid-js/web).
 * @param names - The exports to return.
 * @returns The named exports of the compiled example.
 */
export function runExample(
  code: string,
  imports: Record<string, unknown>,
  names: string[],
): Record<string, unknown> {
  // The example bodies declare their parts without exporting them; the test
  // names what it wants, exactly like the React package's compiler harness.
  // A part the body already exports (`export const invoices`) is left alone.
  const alreadyExported = new Set(
    [...code.matchAll(/export\s+(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)].map(
      (match) => match[1],
    ),
  )
  const toExport = names.filter((name) => !alreadyExported.has(name))
  const cjs = compileToCjs(
    toExport.length ? `${code}\nexport { ${toExport.join(', ')} };\n` : `${code}\n`,
  )
  const module = { exports: {} as Record<string, unknown> }
  const shim = (name: string): unknown => (name in imports ? imports[name] : require(name))
  // esbuild's CommonJS wrapper writes through `module.exports`, so it is in scope.
  new Function('require', 'module', 'exports', cjs)(shim, module, module.exports)
  return Object.fromEntries(names.map((name) => [name, module.exports[name]]))
}
