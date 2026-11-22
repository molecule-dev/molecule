/** The full config: timestamp serialization must retain milliseconds and UTC. */
import { ESLint } from 'eslint'
import { afterAll, describe, expect, it } from 'vitest'

import { lintProject } from './project.js'

const project = await lintProject({
  type: 'module',
  dependencies: { '@molecule/api-resource': '1.0.0' },
})
// An app workspace with API test tooling, linted by its own manifest.
const app = await lintProject({
  type: 'module',
  dependencies: { '@molecule/app-http': '1.0.0' },
  devDependencies: { '@molecule/api-mock-server': '1.0.0' },
})
afterAll(() => Promise.all([project.remove(), app.remove()]))
const eslint = new ESLint({
  cwd: project.root,
  overrideConfigFile: project.configFile,
  overrideConfig: {
    rules: {
      'molecule-local/preserve-timestamp-precision': ['error', { fields: ['changedAt'] }],
    },
  },
})

describe('timestamp precision under the full config', () => {
  it('allows datetime input formatting in an app, including one with API test tooling', async () => {
    expect(
      await app.lint(
        'export const datetimeInput = new Date().toISOString().slice(0, 19)\n',
        'src/format.ts',
      ),
    ).toEqual([])
  })

  it('allows generic serializers and display values without a field precision contract', async () => {
    const [result] = await eslint.lintText(
      'export const display = new Date().toISOString().slice(0, 19)',
      { filePath: 'src/format.ts' },
    )
    expect(result.messages).toEqual([])
  })

  it.each(['slice', 'substring', 'substr'])(
    'rejects whole-second %s serialization for a job API',
    async (method) => {
      const [result] = await eslint.lintText(
        `export function jobDto(changedAt: Date): { changedAt: string } {\n  return { changedAt: changedAt.toISOString().${method}(0, 19) }\n}\n`,
        { filePath: 'src/handlers/jobs.ts' },
      )
      expect(result.messages.map(({ ruleId }) => ruleId)).toEqual([
        'molecule-local/preserve-timestamp-precision',
      ])
    },
  )

  it.each([20, 21, 22, 23])('rejects an incomplete timestamp of %i characters', async (length) => {
    const [result] = await eslint.lintText(
      `export const row = { changedAt: new Date().toISOString().slice(0, ${length}) }\n`,
      { filePath: 'src/jobs.ts' },
    )
    expect(result.messages.map(({ ruleId }) => ruleId)).toEqual([
      'molecule-local/preserve-timestamp-precision',
    ])
  })

  it.each([
    'new Date().toISOString()',
    'new Date().toISOString().slice(0, 10)',
    'new Date().toISOString().substring(0, 10)',
    'new Date().toISOString().slice(11, 19)',
    'new Date().toISOString().slice(0, 24)',
    'new Date().toISOString().slice(0)',
    'new Date().toISOString().slice(0, width)',
    "'an arbitrary string'.slice(0, 19)",
    "new Intl.DateTimeFormat('en-GB', { timeStyle: 'medium', timeZone: 'UTC' }).format(new Date())",
  ])(
    'allows full timestamps and intentional date, clock or unrelated string formatting: %s',
    async (expression) => {
      const [result] = await eslint.lintText(`export const row = { changedAt: ${expression} }\n`, {
        filePath: 'src/format.ts',
      })
      expect(result.messages).toEqual([])
    },
  )
})
