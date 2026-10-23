/** Execute the workflow's actual shell with inert package-manager commands. */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { load } from 'js-yaml'
import { afterEach, describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../..')
const workflow = load(fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8'))
const steps = workflow.jobs.build.steps
const scope = steps.find((step) => step.id === 'test-scope')
const install = steps.find((step) => step.run?.includes('playwright@1.63.0 install'))
const tests = steps.find((step) => step.run?.startsWith('npm test --'))
const native = steps.find((step) => step.name === 'Prove native Node deployment on amd64')
const fixtures = []

afterEach(() => {
  fixtures.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true }))
})

/** Run the actual scope, installer and test shell; no downloads or installs. */
function execute(filter, { installExit = 0, scopeExit = 0, browserExit = 0 } = {}) {
  const scratch = path.resolve(ROOT, '../.experiments/x0/live/ship/P14-ci-chromium-scope/fixtures')
  fs.mkdirSync(scratch, { recursive: true })
  const dir = fs.mkdtempSync(path.join(scratch, 'shell-'))
  fixtures.push(dir)
  const bin = path.join(dir, 'bin')
  fs.mkdirSync(bin)
  const writeCommand = (name, body) =>
    fs.writeFileSync(path.join(bin, name), `#!/bin/bash\n${body}\n`, { mode: 0o755 })
  writeCommand(
    'node',
    'if [ "$1" = scripts/affected-projects.mjs ]; then printf "%s" "$FIXTURE_FILTER"; exit "$SCOPE_EXIT"; fi\nprintf "%s\\n" "$@" > "$BROWSER_ARGS"; exit "$BROWSER_EXIT"',
  )
  writeCommand('npx', 'printf "%s\\n" "$@" > "$NPX_ARGS"; exit "$INSTALL_EXIT"')
  writeCommand('npm', 'printf "%s\\n" "$@" > "$NPM_ARGS"')
  writeCommand('sudo', 'exit 88')
  const output = path.join(dir, 'output')
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    GITHUB_OUTPUT: output,
    FIXTURE_FILTER: filter,
    SCOPE_EXIT: String(scopeExit),
    INSTALL_EXIT: String(installExit),
    BROWSER_EXIT: String(browserExit),
    BROWSER_ARGS: path.join(dir, 'browser-args'),
    NPX_ARGS: path.join(dir, 'npx-args'),
    NPM_ARGS: path.join(dir, 'npm-args'),
  }
  const run = (step) =>
    spawnSync('/bin/bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', step.run], {
      cwd: dir,
      env,
      encoding: 'utf8',
      timeout: 5000,
    })
  // The old workflow had no shared scope step; still execute its installer so
  // the original unconditional download is a real negative control.
  let status = scope ? run(scope).status : 0
  env.FILTER =
    scope && status === 0
      ? fs.readFileSync(output, 'utf8').trimEnd().slice('filter='.length)
      : filter
  if (status === 0) status = run(install).status
  if (status === 0) status = run(tests).status
  const args = (file) =>
    fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trimEnd().split('\n') : []
  return {
    status,
    installed: args(env.NPX_ARGS),
    browser: args(env.BROWSER_ARGS),
    tested: args(env.NPM_ARGS),
  }
}

describe('CI Chromium follows the affected test scope', () => {
  it.each([
    'packages/app/features/e2e-fixtures-default',
    'packages/app/bonds/e2e/preview',
    'packages/app/bonds/e2e/playwright',
    '', // Empty is the canonical full/unknown/scheduled scope.
  ])('installs the pinned browser and runs the unchanged selection: %s', (filter) => {
    const result = execute(filter)
    expect(result.status).toBe(0)
    expect(result.installed).toEqual(['--yes', 'playwright@1.63.0', 'install', 'chromium'])
    expect(result.browser[0]).toBe('--input-type=module')
    expect(result.browser[2]).toContain('await chromium.launch()')
    expect(result.browser[2]).toContain('await browser.close()')
    expect(result.tested).toEqual(['test', '--', ...filter.split(' ').filter(Boolean)])
  })

  it.each([
    'packages/api/core/ai-tools', // Browser source strings are parser fixtures.
    'scripts/__tests__',
    'packages/app/bonds/e2e/preview-extra', // Exact package token, not prefix.
  ])('skips the browser download for a nonbrowser selection: %s', (filter) => {
    const result = execute(filter)
    expect(result.status).toBe(0)
    expect(result.installed).toEqual([])
    expect(result.browser).toEqual([])
    expect(result.tested).toEqual(['test', '--', filter])
  })

  it('recognizes a browser package among multiple affected packages', () => {
    expect(execute('packages/api/core/ai-tools packages/app/bonds/e2e/preview').installed).toEqual([
      '--yes',
      'playwright@1.63.0',
      'install',
      'chromium',
    ])
  })

  it('propagates installer failure and never reaches tests', () => {
    const result = execute('', { installExit: 37 })
    expect(result.status).toBe(37)
    expect(result.browser).toEqual([])
    expect(result.tested).toEqual([])
  })

  it('propagates real-browser launch failure and never reaches tests', () => {
    const result = execute('', { browserExit: 43 })
    expect(result.status).toBe(43)
    expect(result.browser).not.toEqual([])
    expect(result.tested).toEqual([])
  })

  it('propagates scope-reader failure before any installer or tests', () => {
    const result = execute('', { scopeExit: 29 })
    expect(result.status).toBe(29)
    expect(result.installed).toEqual([])
    expect(result.tested).toEqual([])
  })

  it('reuses the one canonical scope for browser, native and Vitest steps', () => {
    expect(scope?.run).toContain('node scripts/affected-projects.mjs')
    const selected = '${{ steps.test-scope.outputs.filter }}'
    expect(install.env.FILTER).toBe(selected)
    expect(native.env.FILTER).toBe(selected)
    expect(tests.env.FILTER).toBe(selected)
    expect(install['timeout-minutes']).toBe(10)
    expect(install['working-directory']).toBe('packages/app/features/e2e-fixtures-default')
    expect(tests.run).toBe('npm test -- $FILTER')
    expect(
      steps.filter((step) => step.run?.includes('node scripts/affected-projects.mjs')),
    ).toHaveLength(1)
  })
})
