/**
 * `molecule-local/no-vite-import-meta`: a React Native app reads nothing Vite adds to
 * `import.meta`, because Metro bundles it and its `import.meta` has only `url`.
 *
 * @module
 */
import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { afterEach, describe, expect, it } from 'vitest'

import { moleculeLocalPlugin } from '../plugin.mjs'
import { type LintProject, lintProject } from './project.js'

const lint = (source: string): string[] =>
  new Linter()
    .verify(
      source,
      [
        {
          files: ['**/*.ts'],
          languageOptions: { parser: tseslint.parser },
          plugins: { local: moleculeLocalPlugin },
          rules: { 'local/no-vite-import-meta': 'error' },
        },
      ],
      { filename: 'fixture.ts' },
    )
    .map((message) => message.message)

describe('molecule-local/no-vite-import-meta', () => {
  it.each([
    ['export const url = import.meta.env.VITE_API_URL', 'env', 'EXPO_PUBLIC_'],
    ["export const url = import.meta['env'].VITE_API_URL", 'env', 'EXPO_PUBLIC_'],
    ['export const { env } = import.meta', 'env', 'EXPO_PUBLIC_'],
    ["export const pages = import.meta.glob('./pages/*.ts')", 'glob', 'require.context'],
    ["export const pages = import.meta.globEager('./pages/*.ts')", 'globEager', 'require.context'],
    ['import.meta.hot?.accept()', 'hot', 'Fast Refresh'],
  ])('reports %s', (source, name, instead) => {
    const messages = lint(source)
    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain(`\`import.meta.${name}\` is undefined in a React Native app`)
    expect(messages[0]).toContain(instead)
  })

  it.each([
    "export const font = new URL('./arimo.ttf', import.meta.url).href",
    'export const url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000"',
    'export const meta = { env: 1 }.env',
    "export const files = require.context('./locales', true, /\\.ts$/)",
    'export const { url } = import.meta',
  ])('accepts %s', (source) => {
    expect(lint(source)).toEqual([])
  })
})

describe('the config enables no-vite-import-meta', () => {
  let project: LintProject | undefined

  afterEach(() => project?.remove())

  /**
   * The rule's severity for a file: 0 when the config never names it there.
   *
   * @param file - A path inside the workspace.
   * @returns 0, 1 or 2.
   */
  const severity = async (file: string): Promise<number> =>
    (await project!.severity('molecule-local/no-vite-import-meta', file)) ?? 0

  it('in the source of a React Native app, not in its tests, which vitest runs under Vite', async () => {
    project = await lintProject({ dependencies: { expo: '53.0.27', 'react-native': '0.79.6' } })
    expect(await severity('src/config.ts')).toBe(2)
    expect(await severity('src/App.tsx')).toBe(2)
    expect(await severity('src/__tests__/bonds.test.ts')).toBe(0)
    expect(await severity('src/a.test.ts')).toBe(0)
    const [finding] = await project.lint(
      'export const API_URL = import.meta.env.VITE_API_URL\n',
      'src/config.ts',
    )
    expect(finding).toMatchObject({ ruleId: 'molecule-local/no-vite-import-meta', severity: 2 })
  })

  it("passes a fresh React Native app's own reads of import.meta and the environment", async () => {
    project = await lintProject({ dependencies: { expo: '53.0.27', 'react-native': '0.79.6' } })
    // src/config.ts and src/__tests__/bonds.test.ts as the react-native scaffold writes them.
    const config = await project.lint(
      "export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'\n",
      'src/config.ts',
    )
    const test = await project.lint(
      "export const bondFiles = import.meta.glob<Record<string, unknown>>('../bonds/**/*.ts')\n",
      'src/__tests__/bonds.test.ts',
    )
    expect(
      [...config, ...test].filter(
        (message) => message.ruleId === 'molecule-local/no-vite-import-meta',
      ),
    ).toEqual([])
  })

  it('in no app that Vite builds, react-native-web included', async () => {
    project = await lintProject({
      dependencies: { react: '19.3.1', 'react-dom': '19.3.1', 'react-native-web': '0.20.0' },
    })
    expect(await severity('src/config.ts')).toBe(0)
  })
})
