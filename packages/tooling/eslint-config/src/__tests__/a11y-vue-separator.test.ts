import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { lintProject } from './project.js'

const project = await lintProject({
  type: 'module',
  dependencies: { vue: '3.5.0' },
  devDependencies: {
    'eslint-plugin-vue': '10.12.0',
    'eslint-plugin-vuejs-accessibility': '2.6.3',
  },
})
afterAll(() => project.remove())
const { root: vueRoot, engine: vueEngine } = project

/**
 * The config's Vue a11y gate (eslint-plugin-vuejs-accessibility, which the config turns on from a Vue
 * app's devDependencies) reads a focusable separator as the widget WAI-ARIA makes it, as jsx-a11y does
 * for React (a11y-layout-boxes.test.ts).
 */

async function vueA11y(element: string): Promise<string[]> {
  const source = `<script setup lang="ts">
const emit = defineEmits<{ resize: [step: number] }>()
</script>

<template>
  ${element}
</template>
`
  const report = await vueEngine.lintText(source, { filePath: join(vueRoot, 'src/Splitter.vue') })
  expect(report.flatMap((file) => file.messages.filter((row) => row.fatal))).toEqual([])
  return report.flatMap((file) =>
    file.messages
      .filter((row) => row.ruleId?.startsWith('vuejs-accessibility/'))
      .map((row) => row.ruleId!),
  )
}

describe('vuejs-accessibility reads a focusable separator as a widget too', () => {
  it.each([
    ['bound', ':aria-valuenow="50"'],
    ['static', 'aria-valuenow="50"'],
  ])('a window splitter with a %s aria-valuenow passes', async (_kind, valueNow) => {
    expect(
      await vueA11y(
        `<div role="separator" aria-label="Resize" ${valueNow} tabindex="0" @keydown="emit('resize', 16)" />`,
      ),
    ).toEqual([])
  })

  it.each([
    [
      'a separator without aria-valuenow',
      '<div role="separator" tabindex="0" @keydown="emit(\'resize\', 16)" />',
    ],
    [
      'a note with aria-valuenow',
      '<div role="note" :aria-valuenow="50" tabindex="0" @keydown="emit(\'resize\', 16)" />',
    ],
  ])('%s still fails', async (_name, element) => {
    expect(await vueA11y(element)).toEqual(['vuejs-accessibility/no-static-element-interactions'])
  })
})
