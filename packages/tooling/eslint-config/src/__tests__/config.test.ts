import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { afterAll, describe, expect, it } from 'vitest'

import { moleculeEslintConfig } from '../config.mjs'
import { type LintProject, lintProject } from './project.js'

const projects: LintProject[] = []
afterAll(() => Promise.all(projects.map((project) => project.remove())))
const project = async (...args: Parameters<typeof lintProject>): Promise<LintProject> => {
  const created = await lintProject(...args)
  projects.push(created)
  return created
}
const ruleIds = (messages: { ruleId: string | null }[]): (string | null)[] =>
  messages.map((message) => message.ruleId)

const reactApp = { dependencies: { react: '19.2.0' } }
const api = { dependencies: { '@molecule/api-resource-user': '1.0.0', express: '5.1.0' } }

describe('the switches a workspace manifest decides', () => {
  it("applies React's hook rules where React is a dependency, and only there", async () => {
    expect(await (await project(reactApp)).severity('react-hooks/rules-of-hooks', 'src/a.ts')).toBe(
      2,
    )
    expect(await (await project(api)).severity('react-hooks/rules-of-hooks', 'src/a.ts')).toBe(0)
    const vue = await project({ dependencies: { vue: '3.5.0' } })
    expect(await vue.severity('react-hooks/rules-of-hooks', 'src/useCart.ts')).toBe(0)
  })

  it('checks optional guards in an api workspace, and nowhere else', async () => {
    const rule = 'molecule-local/no-unanswered-optional-guard'
    expect(await (await project(api)).severity(rule, 'src/routes.ts')).toBe(2)
    expect(await (await project(reactApp)).severity(rule, 'src/routes.ts')).toBeUndefined()
  })

  it('turns on the query-cache rules with @molecule/app-query-react', async () => {
    const rule = 'molecule-local/fetch-hooks-use-the-query-cache'
    const app = await project({
      dependencies: { ...reactApp.dependencies, '@molecule/app-query-react': '1.0.0' },
    })
    expect(await app.severity(rule, 'src/hooks.ts')).toBe(2)
    expect(await (await project(reactApp)).severity(rule, 'src/hooks.ts')).toBeUndefined()
  })

  it('turns on the URL-selection rules with the React Router bond', async () => {
    const rule = 'molecule-local/url-selections-declare-access'
    const app = await project({
      dependencies: { ...reactApp.dependencies, '@molecule/app-routing-react-router': '1.0.0' },
    })
    expect(await app.severity(rule, 'src/App.tsx')).toBe(2)
    expect(await (await project(reactApp)).severity(rule, 'src/App.tsx')).toBeUndefined()
  })

  it('reads the manifest next to the config URL, and a directory without one gets the defaults', async () => {
    const bare = await project(null)
    expect(await bare.severity('react-hooks/rules-of-hooks', 'src/a.ts')).toBe(0)
    expect(await bare.severity('molecule-local/no-class-code', 'src/a.ts')).toBe(2)
  })

  it('refuses a manifest it cannot parse instead of linting with the defaults', async () => {
    const root = await mkdtemp(join(tmpdir(), 'molecule-eslint-config-'))
    try {
      await writeFile(join(root, 'package.json'), '{ "dependencies": ')
      await expect(
        moleculeEslintConfig(pathToFileURL(join(root, 'eslint.config.js'))),
      ).rejects.toThrow(SyntaxError)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('generated resource clients', () => {
  const registration = { args: ['task'], clients: [{ path: './src/resources/task.ts' }] }

  it('names the mlcl command when a registered client file is missing', async () => {
    await expect(
      project(reactApp, {}, { generatedResourceClients: [registration] }),
    ).rejects.toThrow(
      'Generated resource client ./src/resources/task.ts is missing. Run mlcl resources task',
    )
  })

  it('installs the client rule once the client exists', async () => {
    const app = await project(
      reactApp,
      { 'src/resources/task.ts': 'export {}\n' },
      { generatedResourceClients: [registration] },
    )
    expect(await app.severity('molecule-resources/prefer-generated-client', 'src/App.tsx')).toBe(2)
    expect(
      await (
        await project(reactApp)
      ).severity('molecule-resources/prefer-generated-client', 'src/App.tsx'),
    ).toBeUndefined()
  })
})

describe('linting React components', () => {
  it('reports a hook called conditionally and an image without alt text', async () => {
    const app = await project(reactApp)
    const messages = await app.lint(
      `import { useState } from 'react'

export function Card({ open }: { open: boolean }) {
  if (open) useState(0)
  return <img src="/card.png" />
}
`,
      'src/Card.tsx',
    )
    expect(ruleIds(messages)).toEqual(
      expect.arrayContaining(['react-hooks/rules-of-hooks', 'jsx-a11y/alt-text']),
    )
    expect(messages.filter((message) => message.fatal)).toEqual([])
  })

  it('accepts a focusable separator with aria-valuenow, and judges one without it as before', async () => {
    const app = await project(reactApp)
    const splitter = (
      value: string,
    ): string => `export function Splitter({ onKeyDown }: { onKeyDown: () => void }) {
  return <div role="separator" ${value} tabIndex={0} onKeyDown={onKeyDown} />
}
`
    const a11y = (messages: { ruleId: string | null }[]): (string | null)[] =>
      ruleIds(messages).filter((id) => id?.startsWith('jsx-a11y/'))
    expect(a11y(await app.lint(splitter('aria-valuenow={50}'), 'src/Splitter.tsx'))).toEqual([])
    expect(a11y(await app.lint(splitter(''), 'src/Splitter.tsx'))).toEqual(
      expect.arrayContaining(['jsx-a11y/no-noninteractive-tabindex']),
    )
  })
})

describe('framework component files', () => {
  it('lints a Vue component, script included, with the separator correction', async () => {
    const app = await project({
      dependencies: { vue: '3.5.0' },
      devDependencies: {
        'eslint-plugin-vue': '10.12.0',
        'eslint-plugin-vuejs-accessibility': '2.6.3',
      },
    })
    const component = (attributes: string): string => `<script setup lang="ts">
const value: any = 1
const move = (): void => {}
</script>

<template>
  <div role="separator" ${attributes} @keydown="move" @click="move">{{ value }}</div>
</template>
`
    const accepted = await app.lint(
      component(':aria-valuenow="value" tabindex="0"'),
      'src/Pane.vue',
    )
    expect(messagesWithout(accepted, 'vuejs-accessibility/no-static-element-interactions')).toBe(
      true,
    )
    expect(ruleIds(accepted)).toContain('@typescript-eslint/no-explicit-any')
    expect(accepted.filter((message) => message.fatal)).toEqual([])
    const reported = await app.lint(component(''), 'src/Pane.vue')
    expect(ruleIds(reported)).toContain('vuejs-accessibility/no-static-element-interactions')
  })

  it('lints a Svelte component with its recommended rules and allows {@html}', async () => {
    const app = await project({
      dependencies: { svelte: '5.57.2' },
      devDependencies: { 'eslint-plugin-svelte': '3.23.1' },
    })
    const messages = await app.lint(
      `<script lang="ts">
  let { items, icon }: { items: string[]; icon: string } = $props()
</script>

{@html icon}
{#each items as item}
  <p>{item}</p>
{/each}
`,
      'src/List.svelte',
    )
    expect(messages.filter((message) => message.fatal)).toEqual([])
    expect(ruleIds(messages)).toContain('svelte/require-each-key')
    expect(ruleIds(messages)).not.toContain('svelte/no-at-html-tags')
  })

  it('leaves component files to no config where the workspace declares no framework plugin', async () => {
    const app = await project(reactApp)
    expect(app.config.some((block) => block.files?.flat().includes('**/*.vue'))).toBe(false)
    expect(app.config.some((block) => block.files?.flat().includes('**/*.svelte'))).toBe(false)
  })
})

/**
 * Whether no message has this rule id.
 *
 * @param messages - Lint messages.
 * @param rule - The rule id.
 * @returns True when the rule reported nothing.
 */
function messagesWithout(messages: { ruleId: string | null }[], rule: string): boolean {
  return !messages.some((message) => message.ruleId === rule)
}
