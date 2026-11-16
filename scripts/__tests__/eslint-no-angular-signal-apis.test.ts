import { join } from 'node:path'
import process from 'node:process'

import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

/**
 * The ban on Angular's signal component APIs, through the config molecule's lint loads. Angular
 * tests here compile with the JIT compiler, which reads inputs, outputs and queries from
 * decorator metadata only, so a binding to `input()`, `output()`, `model()` or a signal query is
 * dropped under test without an error. The cross-stack and static-`t` bans that share the rule
 * must keep working beside it. `ESLINT_CONFIG_UNDER_TEST` points it at another config file (a
 * copy before the ban, to prove these cases fail there).
 *
 * @module
 */

const eslint = new ESLint({
  cwd: join(import.meta.dirname, '../..'),
  overrideConfigFile: process.env.ESLINT_CONFIG_UNDER_TEST,
})

/**
 * The `no-restricted-imports` messages for one source at one path.
 *
 * @param code - The source text.
 * @param filePath - Where it would live, relative to molecule.
 * @returns The rule's messages.
 */
async function restricted(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath })
  return (result?.messages ?? [])
    .filter((message) => message.ruleId === 'no-restricted-imports')
    .map((message) => message.message)
}

const SIGNAL_APIS =
  "import { Component, input, output, model, viewChild, contentChildren } from '@angular/core'\nexport const used = [Component, input, output, model, viewChild, contentChildren]\n"

// The first lintText loads the whole molecule config (plugins, the typed parser, svelte and vue),
// which takes several seconds on a busy machine.
describe('no Angular signal component APIs', { timeout: 120_000 }, () => {
  it('refuses each one in a feature component, a binding package and a test', async () => {
    for (const file of [
      'packages/app/features/chat-panel-angular/src/chat-panel.component.ts',
      'packages/app/frameworks/angular/src/chat.ts',
      'packages/app/features/chat-panel-angular/src/__tests__/chat-panel.test.ts',
    ]) {
      const messages = await restricted(SIGNAL_APIS, file)
      expect(messages, file).toHaveLength(5)
      expect(
        messages.every((message) => message.includes("component's metadata")),
        file,
      ).toBe(true)
    }
    expect(
      await restricted(
        "import { outputFromObservable } from '@angular/core/rxjs-interop'\nexport const used = outputFromObservable\n",
        'packages/app/features/chat-panel-angular/src/chat-panel.component.ts',
      ),
    ).toHaveLength(1)
  })

  it('allows dndkit-angular, whose suite runs on its ngc build', async () => {
    expect(
      await restricted(
        SIGNAL_APIS,
        'packages/app/bonds/drag-drop/dndkit-angular/src/sortable-list.ts',
      ),
    ).toEqual([])
  })

  it('allows the metadata form and the other signal primitives (counterexample)', async () => {
    const code =
      "import { Component, computed, effect, EventEmitter, inject, signal, ViewChild } from '@angular/core'\nexport const used = [Component, computed, effect, EventEmitter, inject, signal, ViewChild]\n"
    expect(
      await restricted(
        code,
        'packages/app/features/chat-panel-angular/src/chat-panel.component.ts',
      ),
    ).toEqual([])
  })

  it('keeps the cross-stack and static-t bans that share the rule', async () => {
    const file = 'packages/app/features/chat-panel-angular/src/chat-panel.component.ts'
    expect(
      await restricted("import { x } from '@molecule/api-database'\nexport const used = x\n", file),
    ).toHaveLength(1)
    expect(
      await restricted("import { t } from '@molecule/app-i18n'\nexport const used = t\n", file),
    ).toHaveLength(1)
    expect(
      await restricted(
        "import { x } from '@molecule/api-database'\nexport const used = x\n",
        'packages/app/bonds/drag-drop/dndkit-angular/src/sortable-list.ts',
      ),
    ).toHaveLength(1)
  })
})
