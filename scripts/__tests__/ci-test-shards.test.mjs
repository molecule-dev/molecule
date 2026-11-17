/** The workflow must deliver this commit's build to disjoint, fail-fast test runners. */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { URL } from 'node:url'

import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const workflow = parse(
  readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8'),
)

describe('CI test sharding', () => {
  it('lets successful builds save their cache independently of test failures', () => {
    const { build, tests } = workflow.jobs
    expect(build.steps.some((step) => /npm test/.test(step.run ?? ''))).toBe(false)
    expect(tests.needs).toBe('build')
    expect(tests.strategy['fail-fast']).toBe(true)
    expect(tests.strategy.matrix.shard).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(tests.env.MOL_VITEST_SHARD).toBe('${{ matrix.shard }}/8')
    expect(tests.env.MOL_VITEST_FAIL_FAST).toBe('1')
    expect(build.outputs.filter).toBe('${{ steps.test-scope.outputs.filter }}')
    const upload = build.steps.find(
      (step) =>
        step.uses?.startsWith('actions/upload-artifact') &&
        step.with.name.startsWith('molecule-dist'),
    )
    const download = tests.steps.find((step) => step.uses?.startsWith('actions/download-artifact'))
    expect(upload.with.name).toBe(download.with.name)
    expect(tests.steps.find((step) => /npm test/.test(step.run ?? '')).env.FILTER).toBe(
      '${{ needs.build.outputs.filter }}',
    )
  })

  it('round-trips compiled packages and their proof without transferring installed vendors', () => {
    const root = mkdtempSync(join(tmpdir(), 'ci-dist-archive-'))
    const write = (file, text) => {
      mkdirSync(dirname(join(root, file)), { recursive: true })
      writeFileSync(join(root, file), text)
    }
    try {
      write('packages/api/core/example/dist/index.js', 'export const value = 42\n')
      write('packages/api/core/example/node_modules/vendor/dist/index.js', 'must stay local')
      write('.dist-manifest.json', '{"proof":"same-run"}')
      const archive = workflow.jobs.build.steps.find(
        (step) => step.name === 'Archive compiled packages',
      )
      expect(archive).toBeDefined()
      execFileSync('bash', ['-e', '-o', 'pipefail', '-c', archive.run], {
        cwd: root,
        env: { ...process.env, RUNNER_TEMP: root },
      })
      const output = join(root, 'restored')
      mkdirSync(output)
      const restore = workflow.jobs.tests.steps.find(
        (step) => step.name === "Restore this commit's compiled packages",
      )
      execFileSync('bash', ['-e', '-c', restore.run], {
        cwd: output,
        env: { ...process.env, RUNNER_TEMP: root },
      })
      expect(
        readFileSync(join(output, 'packages/api/core/example/dist/index.js'), 'utf8'),
      ).toContain('42')
      expect(readFileSync(join(output, '.dist-manifest.json'), 'utf8')).toContain('same-run')
      expect(existsSync(join(output, 'packages/api/core/example/node_modules'))).toBe(false)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
