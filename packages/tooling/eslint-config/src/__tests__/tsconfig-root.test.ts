import { join } from 'node:path'

import { ESLint } from 'eslint'
import { expect, it } from 'vitest'

import { lintProject } from './project.js'

// typescript-eslint records every `eslint.config.*` file that reads its configs as a candidate
// tsconfig root, and refuses to parse once one process holds two, unless the config names its root.
it('parses TypeScript in two workspaces linted by one process', async () => {
  const api = await lintProject({ dependencies: { '@molecule/api-resource': '1.0.0' } })
  const app = await lintProject({ dependencies: { '@molecule/app-react': '1.0.0' } })
  try {
    for (const workspace of [api, app]) {
      const engine = new ESLint({ cwd: workspace.root, overrideConfigFile: workspace.configFile })
      const [result] = await engine.lintText('export const total: number = 1\n', {
        filePath: join(workspace.root, 'src/total.ts'),
      })
      expect(result.messages.filter((message) => message.fatal)).toEqual([])
    }
  } finally {
    await Promise.all([api.remove(), app.remove()])
  }
})
