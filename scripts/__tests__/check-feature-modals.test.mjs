/**
 * A feature's modal attribute fails the same standalone check CI and the hook run.
 *
 * @module
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'

import { afterEach, describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '..', '..')
const CHECK = 'scripts/check-feature-modals.mjs'
const dirs = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const BAD = {
  'react/src/Dialog.tsx': 'const Dialog = () => <Box role="dialog" aria-modal />',
  'solid/src/Dialog.tsx': 'const Dialog = () => <div aria-modal={true} />',
  'vue/src/Dialog.ts': "const render = () => h('div', { 'aria-modal': true })",
  'vue/src/Property.ts': "const render = () => h('div', { ariaModal: 'true' })",
  'svelte/src/Dialog.svelte': '<div title="1 > 0" aria-modal="true"></div>',
  'svelte/src/Spread.svelte':
    "<script>const props = { ['aria-modal']: true }</script>\n<div {...props} />",
  'angular/src/Dialog.ts': 'const view = { template: `\n<div [attr.aria-modal]="true"></div>` }',
  'angular/src/Interpolated.ts':
    'const view = { template: `<div class="${size}" aria-modal="true"></div>` }',
  'angular/src/dialog.html': '<div aria-modal></div>',
  'angular/src/Host.ts': "const view = { host: { '[attr.aria-modal]': 'true' } }",
  'dom/src/dialog.js': "element.setAttribute('aria-modal', 'true')",
  'dom/src/dialog.ts': "element.ariaModal = 'true'",
}

const GOOD = {
  'react/src/Dialog.tsx': 'const Dialog = () => <Modal aria-label="Summary" />',
  'vue/src/Dialog.ts': "const render = () => h(Modal, { 'aria-label': 'Summary' })",
  'svelte/src/Dialog.svelte': '<!-- <div aria-modal="true"> -->\n<Modal />',
  'angular/src/Dialog.ts': 'const view = { template: `<mol-modal [open]="open"></mol-modal>` }',
  'angular/src/Interpolated.ts':
    'const view = { template: `<div title="${label}">aria-modal</div>` }',
  'chat/src/Panel.tsx': 'const Panel = () => <section role="dialog" aria-label="Chat" />',
  'chat/src/keys.ts':
    "window.addEventListener('keydown', (event) => event.key === 'Escape' && close())",
  'docs/src/example.ts':
    '// <div aria-modal="true">\nconst read = (el) => el.getAttribute("aria-modal")',
  'docs/src/example.html': '<div title="Set aria-modal instead" data-aria-modal="true"></div>',
  'react/src/__tests__/Dialog.test.tsx': 'const fixture = <div aria-modal />',
}

/**
 * Writes a disposable molecule-shaped tree and invokes its actual check.
 *
 * @param features - Feature files and their contents.
 * @param checkoutParent - Directory containing the checkout in the fixture.
 * @returns The check's exit status and diagnostics.
 */
function check(features, checkoutParent = '.') {
  const dir = mkdtempSync(join(tmpdir(), 'check-feature-modals-'))
  dirs.push(dir)
  const root = join(dir, checkoutParent, 'checkout')
  for (const file of [CHECK, 'scripts/lib/is-main.mjs']) {
    mkdirSync(dirname(join(root, file)), { recursive: true })
    copyFileSync(join(ROOT, file), join(root, file))
  }
  symlinkSync(join(ROOT, 'node_modules'), join(root, 'node_modules'), 'dir')
  for (const [file, contents] of Object.entries(features)) {
    const path = join(root, 'packages/app/features', file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, contents)
  }
  const result = spawnSync(process.execPath, [CHECK], { cwd: root, encoding: 'utf8' })
  return { status: result.status, output: result.stdout + result.stderr }
}

describe('check-feature-modals', () => {
  it('fails with the source location for every handwritten modal', () => {
    const { status, output } = check({ ...GOOD, ...BAD })
    expect(status).toBe(1)
    const lines = output.trim().split('\n')
    expect(lines).toHaveLength(Object.keys(BAD).length)
    for (const file of Object.keys(BAD)) {
      expect(lines).toContain(
        `packages/app/features/${file}:${file === 'angular/src/Dialog.ts' ? 2 : 1}: use the kit Modal or Drawer for a blocking dialog.`,
      )
    }
  })

  it('passes kit dialogs, non-modal dialogs, other Escape shortcuts and test fixtures', () => {
    expect(check(GOOD)).toEqual({
      status: 0,
      output: 'Every feature delegates modal semantics to the UI kit.\n',
    })
  })

  it('still checks feature source when the checkout is under a directory named tests', () => {
    const file = 'react/src/Dialog.tsx'
    const { status, output } = check({ [file]: BAD[file] }, 'tests')

    expect(status).toBe(1)
    expect(output).toContain(`packages/app/features/${file}:1:`)
  })
})
