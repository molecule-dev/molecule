/**
 * Tests for the `/scripts` + `/run` command parsing and list-render helpers.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { COMMANDS } from '../components/chat-commands.js'
import {
  buildSaveScriptPayload,
  filterScripts,
  findScriptByName,
  formatRunOutput,
  isSaveScriptValid,
  missingRequiredParams,
  normalizeScriptName,
  parseFlagArgs,
  parseRunCommand,
  parseScriptsCommand,
  runSucceeded,
  type ScriptInfo,
} from '../components/chat-scripts-utilities.js'

const sampleScripts: ScriptInfo[] = [
  { name: 'run-tests', description: 'Run the unit test suite', createdAt: '2026-06-01T00:00:00Z' },
  { name: 'lint-all', description: 'Lint api and app', createdAt: '2026-06-02T00:00:00Z' },
  { name: 'deploy-staging', description: 'Push to staging', createdAt: '2026-06-03T00:00:00Z' },
]

describe('normalizeScriptName', () => {
  it('lowercases, drops a trailing .sh, and slugifies disallowed runs', () => {
    expect(normalizeScriptName('Run Tests.sh')).toBe('run-tests')
    expect(normalizeScriptName('  Deploy   Staging!! ')).toBe('deploy-staging')
    expect(normalizeScriptName('build_app')).toBe('build_app')
  })

  it('strips leading/trailing dashes and collapses repeats', () => {
    expect(normalizeScriptName('--foo--bar--')).toBe('foo-bar')
    expect(normalizeScriptName('***')).toBe('')
    expect(normalizeScriptName('')).toBe('')
  })
})

describe('parseScriptsCommand', () => {
  it('returns an empty query for a bare /scripts', () => {
    expect(parseScriptsCommand('/scripts')).toEqual({ query: '' })
    expect(parseScriptsCommand('  /scripts  ')).toEqual({ query: '' })
  })

  it('captures the trimmed filter query', () => {
    expect(parseScriptsCommand('/scripts deploy')).toEqual({ query: 'deploy' })
    expect(parseScriptsCommand('/SCRIPTS  lint ')).toEqual({ query: 'lint' })
  })

  it('returns null for non-/scripts input', () => {
    expect(parseScriptsCommand('/script')).toBeNull()
    expect(parseScriptsCommand('scripts')).toBeNull()
    expect(parseScriptsCommand('/run x')).toBeNull()
  })
})

describe('parseRunCommand', () => {
  it('returns an empty name for a bare /run', () => {
    expect(parseRunCommand('/run')).toEqual({ name: '', params: {} })
    expect(parseRunCommand(' /run ')).toEqual({ name: '', params: {} })
  })

  it('captures the script name (first token) with no options', () => {
    expect(parseRunCommand('/run run-tests')).toEqual({ name: 'run-tests', params: {} })
    expect(parseRunCommand('/RUN  deploy ')).toEqual({ name: 'deploy', params: {} })
  })

  it('parses trailing --option flags into params', () => {
    expect(parseRunCommand('/run setup-ci --platform github --target fly')).toEqual({
      name: 'setup-ci',
      params: { platform: 'github', target: 'fly' },
    })
    expect(parseRunCommand('/run deploy --env=prod')).toEqual({
      name: 'deploy',
      params: { env: 'prod' },
    })
  })

  it('returns null for non-/run input', () => {
    expect(parseRunCommand('/runner')).toBeNull()
    expect(parseRunCommand('run-tests')).toBeNull()
    expect(parseRunCommand('/scripts')).toBeNull()
  })
})

describe('parseFlagArgs', () => {
  it('parses space- and equals-separated flags', () => {
    expect(parseFlagArgs('--a 1 --b=2')).toEqual({ a: '1', b: '2' })
  })

  it('keeps quoted values intact and treats a bare flag as empty', () => {
    expect(parseFlagArgs('--msg "hello world" --force')).toEqual({ msg: 'hello world', force: '' })
  })

  it('returns an empty object for no flags', () => {
    expect(parseFlagArgs('')).toEqual({})
    expect(parseFlagArgs('just words')).toEqual({})
  })
})

describe('missingRequiredParams', () => {
  const script: ScriptInfo = {
    name: 'setup-ci',
    description: 'Add CI',
    createdAt: '',
    params: [
      {
        name: 'platform',
        type: 'enum',
        description: 'CI',
        required: true,
        options: ['github', 'gitlab'],
      },
      { name: 'target', type: 'string', description: 'Host', required: false },
    ],
  }

  it('flags a required param with no value or default', () => {
    expect(missingRequiredParams(script, {}).map((p) => p.name)).toEqual(['platform'])
  })

  it('is satisfied once the required value is supplied', () => {
    expect(missingRequiredParams(script, { platform: 'github' })).toEqual([])
  })

  it('treats a script with no params as satisfied', () => {
    expect(missingRequiredParams({ name: 'x', description: '', createdAt: '' }, {})).toEqual([])
  })
})

describe('findScriptByName', () => {
  it('matches case- and .sh-insensitively (exact)', () => {
    expect(findScriptByName(sampleScripts, 'Run-Tests')?.name).toBe('run-tests')
    expect(findScriptByName(sampleScripts, 'run-tests.sh')?.name).toBe('run-tests')
  })

  it('matches a unique prefix or substring', () => {
    expect(findScriptByName(sampleScripts, 'deploy')?.name).toBe('deploy-staging')
    expect(findScriptByName(sampleScripts, 'staging')?.name).toBe('deploy-staging')
  })

  it('returns undefined when ambiguous, empty, or unmatched', () => {
    const ambiguous: ScriptInfo[] = [
      { name: 'build-api', description: '', createdAt: '' },
      { name: 'build-app', description: '', createdAt: '' },
    ]
    expect(findScriptByName(ambiguous, 'build')).toBeUndefined()
    expect(findScriptByName(sampleScripts, '')).toBeUndefined()
    expect(findScriptByName(sampleScripts, 'nope')).toBeUndefined()
  })
})

describe('filterScripts', () => {
  it('returns all scripts (copy) for a blank query', () => {
    const out = filterScripts(sampleScripts, '   ')
    expect(out).toHaveLength(3)
    expect(out).not.toBe(sampleScripts)
  })

  it('matches name or description, case-insensitively, preserving order', () => {
    expect(filterScripts(sampleScripts, 'lint').map((s) => s.name)).toEqual(['lint-all'])
    expect(filterScripts(sampleScripts, 'STAGING').map((s) => s.name)).toEqual(['deploy-staging'])
    // "Run" matches run-tests' description ("Run the unit test suite") only by name here
    expect(filterScripts(sampleScripts, 'run').map((s) => s.name)).toEqual(['run-tests'])
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterScripts(sampleScripts, 'zzz')).toEqual([])
  })
})

describe('formatRunOutput', () => {
  it('returns stdout alone when there is no stderr', () => {
    expect(formatRunOutput({ stdout: 'ok\n', stderr: '', exitCode: 0 })).toBe('ok')
  })

  it('joins stdout and stderr with a blank line, trimming trailing space', () => {
    expect(formatRunOutput({ stdout: 'out  \n', stderr: 'err\n\n', exitCode: 1 })).toBe(
      'out\n\nerr',
    )
  })

  it('returns an empty string when there is no output', () => {
    expect(formatRunOutput({ stdout: '   ', stderr: '', exitCode: 0 })).toBe('')
  })
})

describe('runSucceeded', () => {
  it('is true only for exit code 0', () => {
    expect(runSucceeded({ stdout: '', stderr: '', exitCode: 0 })).toBe(true)
    expect(runSucceeded({ stdout: '', stderr: '', exitCode: 1 })).toBe(false)
    expect(runSucceeded({ stdout: '', stderr: '', exitCode: 127 })).toBe(false)
  })
})

describe('buildSaveScriptPayload', () => {
  it('normalizes the name and trims description + trailing body whitespace', () => {
    expect(
      buildSaveScriptPayload({
        name: 'Run Tests.sh',
        description: '  runs the tests  ',
        body: '#!/bin/sh\nnpm test\n\n',
      }),
    ).toEqual({ name: 'run-tests', description: 'runs the tests', body: '#!/bin/sh\nnpm test' })
  })
})

describe('isSaveScriptValid', () => {
  it('requires a non-empty name and a non-empty body', () => {
    expect(isSaveScriptValid({ name: 'run-tests', description: '', body: 'npm test' })).toBe(true)
    expect(isSaveScriptValid({ name: '', description: '', body: 'npm test' })).toBe(false)
    expect(isSaveScriptValid({ name: 'run-tests', description: '', body: '   ' })).toBe(false)
  })
})

describe('command registry wiring', () => {
  it('registers /scripts and /run under the code category with usage', () => {
    const scripts = COMMANDS.find((c) => c.id === 'scripts')
    const run = COMMANDS.find((c) => c.id === 'run')
    expect(scripts).toMatchObject({
      label: '/scripts',
      category: 'code',
      usage: '/scripts [query]',
    })
    expect(run).toMatchObject({
      label: '/run',
      category: 'code',
      usage: '/run <name> [--option value]',
    })
  })
})
