import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { ESLint, type Linter } from 'eslint'

import { moleculeEslintConfig } from '../config.mjs'

const require = createRequire(import.meta.url)

/** A throwaway workspace linted with the config its manifest selects. */
export interface LintProject {
  /** The workspace directory. */
  root: string
  /** The config `moleculeEslintConfig` returned for it. */
  config: Linter.Config[]
  /** The engine that lints with that config from the workspace directory. */
  engine: ESLint
  /**
   * The workspace's `eslint.config.mjs`, which calls the factory with the same options, for a test
   * that builds its own engine with extra overrides (`overrideConfigFile: configFile`).
   */
  configFile: string
  /**
   * Lint source text as the given workspace file.
   *
   * @param source - The file's text.
   * @param file - Its path inside the workspace.
   * @returns Every message ESLint reported.
   */
  lint(source: string, file: string): Promise<Linter.LintMessage[]>
  /**
   * The severity the config gives a rule for a file, as ESLint computes it.
   *
   * @param rule - The rule id.
   * @param file - A path inside the workspace.
   * @returns 0 (off), 1 (warn) or 2 (error).
   */
  severity(rule: string, file: string): Promise<number>
  /** Delete the workspace. */
  remove(): Promise<void>
}

/**
 * Create a workspace with this `package.json` (none when `manifest` is null) and resolve its
 * config the way a workspace's `eslint.config.js` does.
 *
 * @param manifest - The workspace manifest, or null for a directory without one.
 * @param files - Extra files to write first, by path inside the workspace.
 * @param options - Options passed to the factory.
 * @returns The workspace and its linter.
 */
export async function lintProject(
  manifest: Record<string, unknown> | null,
  files: Record<string, string> = {},
  options: Parameters<typeof moleculeEslintConfig>[1] = {},
): Promise<LintProject> {
  const root = await mkdtemp(join(tmpdir(), 'molecule-eslint-config-'))
  // The workspace resolves packages (a stylesheet's npm import) where this package does.
  await symlink(
    dirname(dirname(require.resolve('eslint/package.json'))),
    join(root, 'node_modules'),
  )
  if (manifest) await writeFile(join(root, 'package.json'), JSON.stringify(manifest))
  for (const [file, text] of Object.entries(files)) {
    await mkdir(dirname(join(root, file)), { recursive: true })
    await writeFile(join(root, file), text)
  }
  const configFile = join(root, 'eslint.config.mjs')
  const factory = new URL('../config.mjs', import.meta.url).href
  await writeFile(
    configFile,
    `import { moleculeEslintConfig } from ${JSON.stringify(factory)}\n\nexport default await moleculeEslintConfig(import.meta.url, ${JSON.stringify(options)})\n`,
  )
  const config = await moleculeEslintConfig(pathToFileURL(configFile), options)
  const engine = new ESLint({ cwd: root, overrideConfig: config, overrideConfigFile: true })
  return {
    root,
    config,
    engine,
    configFile,
    async lint(source, file) {
      const [result] = await engine.lintText(source, { filePath: join(root, file) })
      return result?.messages ?? []
    },
    async severity(rule, file) {
      const resolved = (await engine.calculateConfigForFile(join(root, file))) as Linter.Config
      const entry = resolved.rules?.[rule]
      return (Array.isArray(entry) ? entry[0] : entry) as number
    },
    remove: () => rm(root, { recursive: true, force: true }),
  }
}
