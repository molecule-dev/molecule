/**
 * The composer helpers in `chat-composer-utilities`: the two persistence keys,
 * the viewer gate, the command-menu filter, the keyboard index wrap, the
 * file-mention ranking and message block, the `/explain` and `/lint` prompts,
 * the limit-refusal parse, the submit classifier that fixes the order of
 * `handleSubmit`'s checks, and the keydown reducer behind the composer
 * textarea. The tests drive every reachable branch with the values React's
 * `ChatPanel` passes today.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { AppModelDefinition } from '@molecule/app-ai-models'

import type { CommandDef } from '../command-metadata.js'
import { COMMANDS } from '../command-metadata.js'
import type { CommandMenu, FileEntry } from '../components/chat-card-event-utilities.js'
import type {
  ComposerKeyEvent,
  ComposerKeyState,
  ComposerSubmitState,
} from '../components/chat-composer-utilities.js'
import {
  buildExplainPrompt,
  buildFileMentionBlock,
  buildLintPrompt,
  chatConversationStorageKey,
  chatDraftStorageKey,
  composerKeyAction,
  filterCommandMenu,
  limitRefusalFromError,
  rankFileMentionEntries,
  routeComposerSubmit,
  viewerCommandAllowed,
  wrapIdx,
} from '../components/chat-composer-utilities.js'

/** A command definition with the fields the helpers read. */
function cmd(overrides: Partial<CommandDef> & Pick<CommandDef, 'id'>): CommandDef {
  return {
    label: `/${overrides.id}`,
    description: 'A command',
    category: 'settings',
    ...overrides,
  }
}

/** A file entry with the fields the mention ranking reads. */
function entry(name: string, type: FileEntry['type'] = 'file'): FileEntry {
  return { name, type }
}

describe('chatDraftStorageKey', () => {
  it('prefixes the project id with the draft namespace', () => {
    expect(chatDraftStorageKey('p1')).toBe('mol-chat-draft:p1')
  })

  it('keeps an id that contains colons intact', () => {
    expect(chatDraftStorageKey('a:b')).toBe('mol-chat-draft:a:b')
  })
})

describe('chatConversationStorageKey', () => {
  it('prefixes the project id with the conversation namespace', () => {
    expect(chatConversationStorageKey('p1')).toBe('mol-chat-conv:p1')
  })
})

describe('viewerCommandAllowed', () => {
  it('allows a command flagged viewerSafe', () => {
    expect(viewerCommandAllowed(cmd({ id: 'cost', viewerSafe: true }))).toBe(true)
  })

  it('denies a command without the flag (default deny)', () => {
    expect(viewerCommandAllowed(cmd({ id: 'commit' }))).toBe(false)
  })

  it('denies an explicit viewerSafe: false', () => {
    expect(viewerCommandAllowed(cmd({ id: 'commit', viewerSafe: false }))).toBe(false)
  })

  it('denies an unknown command', () => {
    expect(viewerCommandAllowed(undefined)).toBe(false)
  })

  it('does not treat the side-channel flag as viewer-safe on its own', () => {
    expect(viewerCommandAllowed(cmd({ id: 'teamsay', sideChannel: true }))).toBe(false)
  })

  it('matches the registry: /cost is viewer-safe, /commit is not', () => {
    expect(viewerCommandAllowed(COMMANDS.find((c) => c.id === 'cost'))).toBe(true)
    expect(viewerCommandAllowed(COMMANDS.find((c) => c.id === 'commit'))).toBe(false)
  })
})

describe('filterCommandMenu', () => {
  const commands = [
    cmd({ id: 'help', label: '/help', viewerSafe: true }),
    cmd({ id: 'commit', label: '/commit' }),
    cmd({ id: 'cost', label: '/cost', viewerSafe: true }),
    cmd({ id: 'share', label: '/share' }),
    cmd({ id: 'teamsay', label: '/teamsay', sideChannel: true }),
  ]

  it('returns nothing when the menu is closed', () => {
    expect(filterCommandMenu(commands, null, true, true)).toEqual([])
  })

  it('filters by the typed text, matching the start of the label', () => {
    const menu: CommandMenu = { selectedIdx: -1, text: '/co' }
    expect(filterCommandMenu(commands, menu, true, true).map((c) => c.id)).toEqual([
      'commit',
      'cost',
    ])
  })

  it('lists every command in showAll mode regardless of the text', () => {
    const menu: CommandMenu = { selectedIdx: -1, text: 'not a command', showAll: true }
    expect(filterCommandMenu(commands, menu, true, true).map((c) => c.id)).toEqual([
      'help',
      'commit',
      'cost',
      'share',
      'teamsay',
    ])
  })

  it('shows a viewer only viewer-safe commands and the team side channel', () => {
    const menu: CommandMenu = { selectedIdx: -1, text: '/', showAll: true }
    expect(filterCommandMenu(commands, menu, false, true).map((c) => c.id)).toEqual([
      'help',
      'cost',
      'teamsay',
    ])
  })

  it('treats an undefined canEdit as an editor', () => {
    const menu: CommandMenu = { selectedIdx: -1, text: '/', showAll: true }
    expect(filterCommandMenu(commands, menu, undefined, true)).toHaveLength(5)
  })

  it('hides /share when the host does not allow sharing', () => {
    const menu: CommandMenu = { selectedIdx: -1, text: '/share' }
    expect(filterCommandMenu(commands, menu, true, false)).toEqual([])
    expect(filterCommandMenu(commands, menu, true, true).map((c) => c.id)).toEqual(['share'])
  })

  it('keeps registry order', () => {
    const menu: CommandMenu = { selectedIdx: -1, text: '/' }
    expect(filterCommandMenu(commands, menu, true, true).map((c) => c.id)).toEqual([
      'help',
      'commit',
      'cost',
      'share',
      'teamsay',
    ])
  })
})

describe('wrapIdx', () => {
  it('moves down from no selection to the first item', () => {
    expect(wrapIdx(-1, 1, 4)).toBe(0)
  })

  it('moves up from no selection to the last item', () => {
    expect(wrapIdx(-1, -1, 4)).toBe(3)
  })

  it('wraps forward past the end', () => {
    expect(wrapIdx(3, 1, 4)).toBe(0)
  })

  it('wraps backward past the start', () => {
    expect(wrapIdx(0, -1, 4)).toBe(3)
  })

  it('moves within the list', () => {
    expect(wrapIdx(1, 1, 4)).toBe(2)
    expect(wrapIdx(2, -1, 4)).toBe(1)
  })

  it('handles a single-item list in both directions', () => {
    expect(wrapIdx(0, 1, 1)).toBe(0)
    expect(wrapIdx(0, -1, 1)).toBe(0)
  })
})

describe('rankFileMentionEntries', () => {
  it('lists alphabetically when nothing is selected or open', () => {
    const entries = [entry('b.ts'), entry('a.ts'), entry('c.ts')]
    expect(rankFileMentionEntries(entries, '', null, undefined).map((e) => e.name)).toEqual([
      'a.ts',
      'b.ts',
      'c.ts',
    ])
  })

  it('filters by the query, case-insensitively', () => {
    const entries = [entry('src/App.tsx'), entry('src/app.test.tsx'), entry('README.md')]
    expect(rankFileMentionEntries(entries, 'APP', null, []).map((e) => e.name)).toEqual([
      'src/app.test.tsx',
      'src/App.tsx',
    ])
  })

  it('ranks the active file first', () => {
    const entries = [entry('a.ts'), entry('b.ts'), entry('active.ts')]
    expect(rankFileMentionEntries(entries, '', 'active.ts', []).map((e) => e.name)).toEqual([
      'active.ts',
      'a.ts',
      'b.ts',
    ])
  })

  it('normalizes a /workspace/ active path and a leading-slash active path', () => {
    const entries = [entry('a.ts'), entry('active.ts')]
    expect(
      rankFileMentionEntries(entries, '', '/workspace/active.ts', []).map((e) => e.name),
    ).toEqual(['active.ts', 'a.ts'])
    expect(rankFileMentionEntries(entries, '', '/active.ts', []).map((e) => e.name)).toEqual([
      'active.ts',
      'a.ts',
    ])
  })

  it('ranks open tabs above plain entries, and the active file above a tab', () => {
    const entries = [entry('a.ts'), entry('b.ts'), entry('tab.ts'), entry('active.ts')]
    const ranked = rankFileMentionEntries(entries, '', 'active.ts', ['/workspace/tab.ts'])
    expect(ranked.map((e) => e.name)).toEqual(['active.ts', 'tab.ts', 'a.ts', 'b.ts'])
  })

  it('boosts a filename whose basename starts with the query', () => {
    const entries = [entry('lib/azap.ts'), entry('zap.ts')]
    expect(rankFileMentionEntries(entries, 'zap', null, undefined).map((e) => e.name)).toEqual([
      'zap.ts',
      'lib/azap.ts',
    ])
  })

  it('treats the query as a match anywhere in the full path (directory matches score 0)', () => {
    const entries = [entry('src/helper/x.ts'), entry('helper.ts')]
    expect(rankFileMentionEntries(entries, 'helper', null, undefined).map((e) => e.name)).toEqual([
      'helper.ts',
      'src/helper/x.ts',
    ])
  })

  it('caps the list at fifteen entries', () => {
    const entries = Array.from({ length: 20 }, (_, i) =>
      entry(`file-${String(i).padStart(2, '0')}.ts`),
    )
    const ranked = rankFileMentionEntries(entries, '', null, undefined)
    expect(ranked).toHaveLength(15)
    expect(ranked[0]?.name).toBe('file-00.ts')
  })

  it('returns nothing for an empty entry list', () => {
    expect(rankFileMentionEntries([], 'x', null, undefined)).toEqual([])
  })

  it('drops entries that do not match the query', () => {
    expect(rankFileMentionEntries([entry('a.ts')], 'zzz', null, undefined)).toEqual([])
  })
})

describe('buildFileMentionBlock', () => {
  it('fences the content with the file extension', () => {
    expect(buildFileMentionBlock('src/a.ts', 'ts', 'const a = 1')).toBe(
      '<file path="src/a.ts">\n```ts\nconst a = 1\n```\n</file>',
    )
  })

  it('fences empty content', () => {
    expect(buildFileMentionBlock('a.txt', 'txt', '')).toBe(
      '<file path="a.txt">\n```txt\n\n```\n</file>',
    )
  })

  it('writes the unreadable placeholder for null content', () => {
    expect(buildFileMentionBlock('src/a.ts', 'ts', null)).toBe(
      '<file path="src/a.ts">[Could not read file]</file>',
    )
  })

  it('keeps a path without slashes', () => {
    expect(buildFileMentionBlock('README.md', 'md', 'hi')).toBe(
      '<file path="README.md">\n```md\nhi\n```\n</file>',
    )
  })
})

describe('buildExplainPrompt', () => {
  it('names the target when one was typed', () => {
    expect(buildExplainPrompt('src/a.ts', false)).toBe('Explain this in detail: src/a.ts')
    expect(buildExplainPrompt('the auth flow', true)).toBe('Explain this in detail: the auth flow')
  })

  it('asks about the shared code with no target and no attachments', () => {
    expect(buildExplainPrompt(undefined, false)).toBe(
      'Explain the code I just shared or the most recently discussed code. Be thorough but concise.',
    )
  })

  it('asks about the attached files with no target and attachments', () => {
    expect(buildExplainPrompt(undefined, true)).toBe(
      'Explain the attached file(s) in detail. Be thorough but concise.',
    )
  })
})

describe('buildLintPrompt', () => {
  it('lints the named path', () => {
    expect(buildLintPrompt('src/')).toBe(
      'Run the linter on src/ and fix any issues found: npm run lint -- src/',
    )
  })

  it('lints the whole project when no argument was typed', () => {
    expect(buildLintPrompt(undefined)).toBe(
      'Run the project linter (npm run lint) and fix any issues found. Show what you fixed.',
    )
  })

  it('treats an empty argument as no argument', () => {
    expect(buildLintPrompt('')).toBe(
      'Run the project linter (npm run lint) and fix any issues found. Show what you fixed.',
    )
  })
})

describe('limitRefusalFromError', () => {
  it('parses a complete limit refusal', () => {
    expect(
      limitRefusalFromError({
        response: {
          data: {
            error: 'Max loops limit reached.',
            limitType: 'max_tool_loops',
            requiresSignup: false,
            billingAction: 'upgrade',
            upgradeTier: 'pro',
          },
        },
      }),
    ).toEqual({
      error: 'Max loops limit reached.',
      limitType: 'max_tool_loops',
      requiresSignup: false,
      billingAction: 'upgrade',
      upgradeTier: 'pro',
    })
  })

  it('keeps a null upgradeTier (no higher plan)', () => {
    expect(
      limitRefusalFromError({
        response: { data: { limitType: 'max_tool_loops', upgradeTier: null } },
      }),
    ).toEqual({
      error: undefined,
      limitType: 'max_tool_loops',
      requiresSignup: undefined,
      billingAction: undefined,
      upgradeTier: null,
    })
  })

  it('parses any other limit type too', () => {
    expect(limitRefusalFromError({ response: { data: { limitType: 'daily' } } })?.limitType).toBe(
      'daily',
    )
  })

  it('returns null for a plain error', () => {
    expect(limitRefusalFromError(new Error('boom'))).toBeNull()
  })

  it('returns null when the body carries no limitType', () => {
    expect(limitRefusalFromError({ response: { data: { error: 'bad request' } } })).toBeNull()
  })

  it('returns null when limitType is not a string', () => {
    expect(limitRefusalFromError({ response: { data: { limitType: 42 } } })).toBeNull()
  })

  it('returns null for a non-object error', () => {
    expect(limitRefusalFromError(undefined)).toBeNull()
    expect(limitRefusalFromError('nope')).toBeNull()
  })

  it('returns null when the response has no body', () => {
    expect(limitRefusalFromError({ response: {} })).toBeNull()
  })
})

/** A submit state with the defaults React's ChatPanel passes for an editor. */
function submitState(overrides: Partial<ComposerSubmitState> = {}): ComposerSubmitState {
  return {
    transcriptOnly: false,
    attachedCount: 0,
    canEdit: true,
    canSendTeamMessages: true,
    allCommands: COMMANDS,
    extraCommands: undefined,
    readTestsBarVisible: () => true,
    ...overrides,
  }
}

/** The team side-channel command host apps add (e.g. molecule.dev's /teamsay). */
const teamSay = cmd({ id: 'teamsay', aliases: ['t'], sideChannel: true })

describe('routeComposerSubmit', () => {
  it('ignores a transcript-only submit before any other check', () => {
    expect(
      routeComposerSubmit('/autofix', submitState({ transcriptOnly: true, canEdit: false })),
    ).toEqual({ kind: 'ignored' })
  })

  it('ignores an empty submit with no attachments', () => {
    expect(routeComposerSubmit('   ', submitState())).toEqual({ kind: 'ignored' })
  })

  it('still classifies an empty submit that carries attachments', () => {
    expect(routeComposerSubmit('   ', submitState({ attachedCount: 1 }))).toEqual({
      kind: 'send',
      message: '',
    })
  })

  it('blocks a team message when team messaging is unavailable', () => {
    expect(
      routeComposerSubmit(
        '/teamsay hi',
        submitState({ canSendTeamMessages: false, extraCommands: [teamSay] }),
      ),
    ).toEqual({ kind: 'team-blocked' })
  })

  it('uses the host extra commands for the team gate', () => {
    expect(
      routeComposerSubmit(
        '/t hi',
        submitState({ canSendTeamMessages: false, extraCommands: [teamSay] }),
      ),
    ).toEqual({ kind: 'team-blocked' })
  })

  it('does not block a plain message when team messaging is unavailable', () => {
    expect(routeComposerSubmit('hello', submitState({ canSendTeamMessages: false }))).toEqual({
      kind: 'send',
      message: 'hello',
    })
  })

  it('blocks a read-only viewer from running the assistant', () => {
    expect(routeComposerSubmit('hello', submitState({ canEdit: false }))).toEqual({
      kind: 'viewer-blocked',
    })
  })

  it('blocks a viewer before a mutating slash command', () => {
    expect(routeComposerSubmit('/autofix', submitState({ canEdit: false }))).toEqual({
      kind: 'viewer-blocked',
    })
  })

  it('lets a viewer run a viewer-safe command', () => {
    expect(
      routeComposerSubmit(
        '/cost',
        submitState({ canEdit: false, allCommands: [cmd({ id: 'cost', viewerSafe: true })] }),
      ),
    ).toEqual({ kind: 'send', message: '/cost' })
  })

  it('lets a viewer message the team through the side channel', () => {
    expect(
      routeComposerSubmit('/teamsay hi', submitState({ canEdit: false, allCommands: [teamSay] })),
    ).toEqual({ kind: 'side-channel', message: '/teamsay hi' })
  })

  it('takes the viewer path for an undefined canEdit', () => {
    expect(routeComposerSubmit('/autofix', submitState({ canEdit: undefined }))).toEqual({
      kind: 'viewer-blocked',
    })
  })

  it('routes /autofix and /autoapprove case-insensitively', () => {
    expect(routeComposerSubmit('/autofix', submitState())).toEqual({ kind: 'autofix' })
    expect(routeComposerSubmit('/AUTOFIX', submitState())).toEqual({ kind: 'autofix' })
    expect(routeComposerSubmit('/autoapprove', submitState())).toEqual({ kind: 'autoapprove' })
  })

  it('routes a bare /sounds only', () => {
    expect(routeComposerSubmit('/sounds', submitState())).toEqual({ kind: 'sounds' })
    expect(routeComposerSubmit('/sounds now', submitState())).toEqual({
      kind: 'send',
      message: '/sounds now',
    })
  })

  it('sets the tests bar from /test on|off|toggle', () => {
    expect(routeComposerSubmit('/test on', submitState())).toEqual({
      kind: 'tests-bar',
      visible: true,
    })
    expect(routeComposerSubmit('/tests off', submitState())).toEqual({
      kind: 'tests-bar',
      visible: false,
    })
    expect(
      routeComposerSubmit('/test toggle', submitState({ readTestsBarVisible: () => false })),
    ).toEqual({ kind: 'tests-bar', visible: true })
  })

  it('falls through to the tests browser when /test has an unknown argument', () => {
    expect(routeComposerSubmit('/test unknown', submitState())).toEqual({
      kind: 'tests',
      query: 'unknown',
      runAll: false,
    })
  })

  it('routes the /timestamps forms', () => {
    expect(routeComposerSubmit('/timestamps', submitState())).toEqual({
      kind: 'timestamps',
      command: { action: 'toggle' },
    })
    expect(routeComposerSubmit('/timestamps on', submitState())).toEqual({
      kind: 'timestamps',
      command: { action: 'on' },
    })
    expect(routeComposerSubmit('/timestamps off', submitState())).toEqual({
      kind: 'timestamps',
      command: { action: 'off' },
    })
    expect(routeComposerSubmit('/timestamps maybe', submitState())).toEqual({
      kind: 'timestamps',
      command: { action: 'invalid' },
    })
  })

  it('routes /settings', () => {
    expect(routeComposerSubmit('/settings', submitState())).toEqual({ kind: 'settings' })
  })

  it('routes /skills with and without a query', () => {
    expect(routeComposerSubmit('/skills', submitState())).toEqual({ kind: 'skills', query: '' })
    expect(routeComposerSubmit('/skills deploy', submitState())).toEqual({
      kind: 'skills',
      query: 'deploy',
    })
  })

  it('routes /scripts with and without a query', () => {
    expect(routeComposerSubmit('/scripts', submitState())).toEqual({ kind: 'scripts', query: '' })
    expect(routeComposerSubmit('/scripts lint', submitState())).toEqual({
      kind: 'scripts',
      query: 'lint',
    })
  })

  it('routes the /test browser forms', () => {
    expect(routeComposerSubmit('/test', submitState())).toEqual({
      kind: 'tests',
      query: '',
      runAll: false,
    })
    expect(routeComposerSubmit('/test foo', submitState())).toEqual({
      kind: 'tests',
      query: 'foo',
      runAll: false,
    })
    expect(routeComposerSubmit('/tests all', submitState())).toEqual({
      kind: 'tests',
      query: '',
      runAll: true,
    })
  })

  it('routes /run with and without a name', () => {
    expect(routeComposerSubmit('/run', submitState())).toEqual({
      kind: 'run-script',
      name: '',
      params: {},
    })
    expect(routeComposerSubmit('/run deploy --env prod', submitState())).toEqual({
      kind: 'run-script',
      name: 'deploy',
      params: { env: 'prod' },
    })
  })

  it('routes /report and /bug', () => {
    expect(routeComposerSubmit('/report', submitState())).toEqual({ kind: 'report', title: '' })
    expect(routeComposerSubmit('/bug Broken build', submitState())).toEqual({
      kind: 'report',
      title: 'Broken build',
    })
  })

  it('routes the /share forms', () => {
    expect(routeComposerSubmit('/share', submitState())).toEqual({
      kind: 'share',
      command: { kind: 'create', role: 'viewer' },
    })
    expect(routeComposerSubmit('/share editor', submitState())).toEqual({
      kind: 'share',
      command: { kind: 'create', role: 'editor' },
    })
    expect(routeComposerSubmit('/share bogus', submitState())).toEqual({
      kind: 'share',
      command: { kind: 'invalid', arg: 'bogus' },
    })
  })

  it('routes the /autocommit forms', () => {
    expect(routeComposerSubmit('/autocommit', submitState())).toEqual({
      kind: 'autocommit',
      seconds: null,
    })
    expect(routeComposerSubmit('/autocommit 30', submitState())).toEqual({
      kind: 'autocommit',
      seconds: 30,
    })
    expect(routeComposerSubmit('/autocommit 0', submitState())).toEqual({
      kind: 'autocommit',
      seconds: 0,
    })
  })

  it('routes the per-mode /model forms before the generic /model', () => {
    expect(routeComposerSubmit('/model --plan', submitState())).toEqual({
      kind: 'model-mode',
      mode: 'plan',
    })
    expect(routeComposerSubmit('/model --execute opus', submitState())).toEqual({
      kind: 'model-mode',
      mode: 'execute',
    })
    expect(routeComposerSubmit('/model --compact', submitState())).toEqual({
      kind: 'model-mode',
      mode: 'compact',
    })
  })

  it('routes /mic and /dictate', () => {
    expect(routeComposerSubmit('/mic', submitState())).toEqual({ kind: 'mic' })
    expect(routeComposerSubmit('/dictate', submitState())).toEqual({ kind: 'mic' })
  })

  it('routes the generic /model forms', () => {
    expect(routeComposerSubmit('/model', submitState())).toEqual({
      kind: 'model',
      query: undefined,
    })
    expect(routeComposerSubmit('/model opus', submitState())).toEqual({
      kind: 'model',
      query: 'opus',
    })
  })

  it('routes the /effort forms', () => {
    expect(routeComposerSubmit('/effort', submitState())).toEqual({
      kind: 'effort',
      command: { kind: 'menu' },
    })
    expect(routeComposerSubmit('/effort ?', submitState())).toEqual({
      kind: 'effort',
      command: { kind: 'query' },
    })
    expect(routeComposerSubmit('/effort xhigh', submitState())).toEqual({
      kind: 'effort',
      command: { kind: 'set', arg: 'xhigh' },
    })
    expect(routeComposerSubmit('/effort --plan high', submitState())).toEqual({
      kind: 'effort',
      command: { kind: 'set', arg: 'high', mode: 'plan' },
    })
  })

  it('routes /maxloops and clamps the count', () => {
    expect(routeComposerSubmit('/maxloops 5', submitState())).toEqual({
      kind: 'max-loops',
      loops: 5,
    })
    expect(routeComposerSubmit('/maxloops 0', submitState())).toEqual({
      kind: 'max-loops',
      loops: 1,
    })
  })

  it('routes /explain with no attachments to the built prompt', () => {
    expect(routeComposerSubmit('/explain', submitState())).toEqual({
      kind: 'explain',
      prompt:
        'Explain the code I just shared or the most recently discussed code. Be thorough but concise.',
    })
    expect(routeComposerSubmit('/explain src/app.ts', submitState())).toEqual({
      kind: 'explain',
      prompt: 'Explain this in detail: src/app.ts',
    })
  })

  it('rewrites /explain with attachments into a message', () => {
    expect(routeComposerSubmit('/explain', submitState({ attachedCount: 1 }))).toEqual({
      kind: 'send',
      message: 'Explain the attached file(s) in detail. Be thorough but concise.',
    })
  })

  it('routes /lint to the built prompt', () => {
    expect(routeComposerSubmit('/lint', submitState())).toEqual({
      kind: 'lint',
      prompt:
        'Run the project linter (npm run lint) and fix any issues found. Show what you fixed.',
    })
    expect(routeComposerSubmit('/lint src', submitState())).toEqual({
      kind: 'lint',
      prompt: 'Run the linter on src and fix any issues found: npm run lint -- src',
    })
  })

  it('routes a host side-channel command with its trimmed text', () => {
    expect(routeComposerSubmit('  /teamsay hi  ', submitState({ allCommands: [teamSay] }))).toEqual(
      { kind: 'side-channel', message: '/teamsay hi' },
    )
  })

  it('routes a plain message, trimmed', () => {
    expect(routeComposerSubmit('  hello there  ', submitState())).toEqual({
      kind: 'send',
      message: 'hello there',
    })
  })
})

/**
 * Builds a minimal model definition for the keydown reducer's model tests.
 * @param overrides - Partial fields to override on the base model.
 * @returns A complete `AppModelDefinition`.
 */
function model(overrides: Partial<AppModelDefinition>): AppModelDefinition {
  return {
    id: 'm',
    provider: 'anthropic',
    label: 'Model',
    description: 'desc',
    contextWindow: 100_000,
    maxOutputTokens: 8_000,
    supportsThinking: false,
    thinkingBudgetTokens: 0,
    thinkingConfigurable: false,
    supportsVision: false,
    supportsPromptCaching: false,
    supportsTools: true,
    inputPricePerMTok: 3,
    outputPricePerMTok: 15,
    cacheReadPricePerMTok: 0.3,
    cacheWritePricePerMTok: 3.75,
    knowledgeCutoff: '2025-01-01',
    ...overrides,
  }
}

/**
 * The composer state React passes when nothing is open.
 * @param overrides - Partial fields to override on the base state.
 * @returns A complete `ComposerKeyState`.
 */
function keyState(overrides: Partial<ComposerKeyState> = {}): ComposerKeyState {
  return {
    input: '',
    soundsPicker: null,
    micOpen: false,
    effortPicker: null,
    effortPickerVisible: [],
    modelPicker: null,
    visibleModels: [],
    hasManageCustomModels: false,
    liveMode: 'execute',
    overlayOpen: false,
    filePicker: null,
    filteredEntries: [],
    commandMenu: null,
    filteredCmds: [],
    abortable: false,
    isFreeTier: false,
    freeTierModelId: '',
    models: [],
    serverModelDefaults: undefined,
    ...overrides,
  }
}

/**
 * A keydown event with the fields the reducer reads.
 * @param overrides - Partial fields to override on a bare Enter.
 * @returns The event fields.
 */
function keyEvent(overrides: Partial<ComposerKeyEvent> = {}): ComposerKeyEvent {
  return { key: 'Enter', shiftKey: false, ...overrides }
}

describe('composerKeyAction', () => {
  describe('IME guard', () => {
    it('ignores a key that is part of a composition', () => {
      expect(composerKeyAction(keyEvent({ isComposing: true }), keyState())).toEqual({
        preventDefault: false,
        effect: { kind: 'none' },
      })
    })

    it('ignores the legacy keyCode 229 composition marker', () => {
      expect(composerKeyAction(keyEvent({ keyCode: 229 }), keyState())).toEqual({
        preventDefault: false,
        effect: { kind: 'none' },
      })
    })
  })

  describe('Escape', () => {
    it('closes the sounds picker first', () => {
      expect(
        composerKeyAction(
          keyEvent({ key: 'Escape' }),
          keyState({
            soundsPicker: { selectedIdx: 0 },
            micOpen: true,
            commandMenu: { selectedIdx: -1, text: '' },
          }),
        ),
      ).toEqual({ preventDefault: false, effect: { kind: 'close-sounds' } })
    })

    it('closes the mic picker next', () => {
      expect(composerKeyAction(keyEvent({ key: 'Escape' }), keyState({ micOpen: true }))).toEqual({
        preventDefault: false,
        effect: { kind: 'close-mic' },
      })
    })

    it('closes the effort picker', () => {
      expect(
        composerKeyAction(
          keyEvent({ key: 'Escape' }),
          keyState({ effortPicker: { selectedIdx: 0, text: '', mode: 'plan' } }),
        ),
      ).toEqual({ preventDefault: false, effect: { kind: 'close-effort' } })
    })

    it('closes the model picker', () => {
      expect(
        composerKeyAction(
          keyEvent({ key: 'Escape' }),
          keyState({ modelPicker: { selectedIdx: 0, text: '' } }),
        ),
      ).toEqual({ preventDefault: false, effect: { kind: 'close-model' } })
    })

    it('closes the panel overlay', () => {
      expect(
        composerKeyAction(keyEvent({ key: 'Escape' }), keyState({ overlayOpen: true })),
      ).toEqual({ preventDefault: false, effect: { kind: 'close-overlay' } })
    })

    it('closes the file picker', () => {
      expect(
        composerKeyAction(
          keyEvent({ key: 'Escape' }),
          keyState({ filePicker: { entries: [], query: '', selectedIdx: -1 } }),
        ),
      ).toEqual({ preventDefault: false, effect: { kind: 'close-file' } })
    })

    it('closes the command menu', () => {
      expect(
        composerKeyAction(
          keyEvent({ key: 'Escape' }),
          keyState({ commandMenu: { selectedIdx: -1, text: '' } }),
        ),
      ).toEqual({ preventDefault: false, effect: { kind: 'close-command' } })
    })

    it('aborts the stream when nothing is open', () => {
      expect(composerKeyAction(keyEvent({ key: 'Escape' }), keyState({ abortable: true }))).toEqual(
        {
          preventDefault: false,
          effect: { kind: 'abort' },
        },
      )
    })

    it('does nothing when nothing is open and nothing is streaming', () => {
      expect(composerKeyAction(keyEvent({ key: 'Escape' }), keyState())).toEqual({
        preventDefault: false,
        effect: { kind: 'none' },
      })
    })
  })

  describe('sounds picker', () => {
    it('moves the highlight down and up', () => {
      expect(
        composerKeyAction(
          keyEvent({ key: 'ArrowDown' }),
          keyState({ soundsPicker: { selectedIdx: 0 } }),
        ),
      ).toEqual({ preventDefault: true, effect: { kind: 'sounds-move', delta: 1 } })
      expect(
        composerKeyAction(
          keyEvent({ key: 'ArrowUp' }),
          keyState({ soundsPicker: { selectedIdx: 0 } }),
        ),
      ).toEqual({ preventDefault: true, effect: { kind: 'sounds-move', delta: -1 } })
    })

    it('picks "all" when no row is highlighted', () => {
      expect(
        composerKeyAction(keyEvent(), keyState({ soundsPicker: { selectedIdx: -1 } })),
      ).toEqual({ preventDefault: true, effect: { kind: 'sounds-pick', event: 'all' } })
    })

    it('picks "all" for the first row', () => {
      expect(composerKeyAction(keyEvent(), keyState({ soundsPicker: { selectedIdx: 0 } }))).toEqual(
        {
          preventDefault: true,
          effect: { kind: 'sounds-pick', event: 'all' },
        },
      )
    })

    it('picks the event row at index 1', () => {
      expect(composerKeyAction(keyEvent(), keyState({ soundsPicker: { selectedIdx: 1 } }))).toEqual(
        {
          preventDefault: true,
          effect: { kind: 'sounds-pick', event: 'message' },
        },
      )
    })

    it('picks on Tab as well as Enter', () => {
      expect(
        composerKeyAction(keyEvent({ key: 'Tab' }), keyState({ soundsPicker: { selectedIdx: 2 } })),
      ).toEqual({ preventDefault: true, effect: { kind: 'sounds-pick', event: 'done' } })
    })

    it('lets an unrelated key fall through', () => {
      expect(
        composerKeyAction(keyEvent({ key: 'a' }), keyState({ soundsPicker: { selectedIdx: 0 } })),
      ).toEqual({ preventDefault: false, effect: { kind: 'none' } })
    })
  })

  describe('effort picker', () => {
    const open = {
      effortPicker: { selectedIdx: 0, text: '', mode: 'plan' as const },
      effortPickerVisible: [{ value: 'low' }, { value: 'high' }],
    }

    it('moves the highlight down and up', () => {
      expect(composerKeyAction(keyEvent({ key: 'ArrowDown' }), keyState(open))).toEqual({
        preventDefault: true,
        effect: { kind: 'effort-move', delta: 1 },
      })
      expect(composerKeyAction(keyEvent({ key: 'ArrowUp' }), keyState(open))).toEqual({
        preventDefault: true,
        effect: { kind: 'effort-move', delta: -1 },
      })
    })

    it('applies the highlighted row', () => {
      expect(
        composerKeyAction(
          keyEvent(),
          keyState({ ...open, effortPicker: { ...open.effortPicker, selectedIdx: 1 } }),
        ),
      ).toEqual({
        preventDefault: true,
        effect: { kind: 'effort-pick', mode: 'plan', level: 'high' },
      })
    })

    it('prefers an exactly-typed level when nothing is highlighted', () => {
      expect(
        composerKeyAction(
          keyEvent(),
          keyState({
            ...open,
            input: '/effort high',
            effortPicker: { ...open.effortPicker, selectedIdx: -1 },
          }),
        ),
      ).toEqual({
        preventDefault: true,
        effect: { kind: 'effort-pick', mode: 'plan', level: 'high' },
      })
    })

    it('falls back to the first row when the typed level matches none', () => {
      expect(
        composerKeyAction(
          keyEvent(),
          keyState({
            ...open,
            input: '/effort xh',
            effortPicker: { ...open.effortPicker, selectedIdx: -1 },
          }),
        ),
      ).toEqual({
        preventDefault: true,
        effect: { kind: 'effort-pick', mode: 'plan', level: 'low' },
      })
    })

    it('picks on Tab as well as Enter', () => {
      expect(composerKeyAction(keyEvent({ key: 'Tab' }), keyState(open))).toEqual({
        preventDefault: true,
        effect: { kind: 'effort-pick', mode: 'plan', level: 'low' },
      })
    })

    it('lets Enter fall through to submit when the filter lists nothing', () => {
      expect(
        composerKeyAction(
          keyEvent(),
          keyState({ effortPicker: { selectedIdx: 0, text: '', mode: 'plan' } }),
        ),
      ).toEqual({ preventDefault: true, effect: { kind: 'submit' } })
    })
  })

  describe('model picker', () => {
    const opus = model({ id: 'claude-opus-4-6', label: 'Opus' })

    it('moves the highlight down and up', () => {
      const state = keyState({ modelPicker: { selectedIdx: 0, text: '' }, visibleModels: [opus] })
      expect(composerKeyAction(keyEvent({ key: 'ArrowDown' }), state)).toEqual({
        preventDefault: true,
        effect: { kind: 'model-move', delta: 1 },
      })
      expect(composerKeyAction(keyEvent({ key: 'ArrowUp' }), state)).toEqual({
        preventDefault: true,
        effect: { kind: 'model-move', delta: -1 },
      })
    })

    it('opens the custom-model manager for the picker mode', () => {
      expect(
        composerKeyAction(
          keyEvent(),
          keyState({
            modelPicker: { selectedIdx: 1, text: '', mode: 'plan' },
            visibleModels: [opus],
            hasManageCustomModels: true,
            liveMode: 'execute',
          }),
        ),
      ).toEqual({ preventDefault: true, effect: { kind: 'model-manage', mode: 'plan' } })
    })

    it('falls back to the live mode for an auxiliary picker mode', () => {
      expect(
        composerKeyAction(
          keyEvent(),
          keyState({
            modelPicker: { selectedIdx: 1, text: '', mode: 'commit' },
            visibleModels: [opus],
            hasManageCustomModels: true,
            liveMode: 'execute',
          }),
        ),
      ).toEqual({ preventDefault: true, effect: { kind: 'model-manage', mode: 'execute' } })
    })

    it('ignores Enter past the last row when there is no manager row', () => {
      expect(
        composerKeyAction(
          keyEvent(),
          keyState({ modelPicker: { selectedIdx: 5, text: '' }, visibleModels: [opus] }),
        ),
      ).toEqual({ preventDefault: true, effect: { kind: 'none' } })
    })

    it('selects the first row when none is highlighted', () => {
      expect(
        composerKeyAction(
          keyEvent(),
          keyState({ modelPicker: { selectedIdx: -1, text: '' }, visibleModels: [opus] }),
        ),
      ).toEqual({
        preventDefault: true,
        effect: { kind: 'model-pick', model: opus, mode: undefined, locked: false },
      })
    })

    it('locks a paid model on the free tier in the picker mode', () => {
      expect(
        composerKeyAction(
          keyEvent(),
          keyState({
            modelPicker: { selectedIdx: 0, text: '', mode: 'plan' },
            visibleModels: [opus],
            models: [opus],
            isFreeTier: true,
          }),
        ),
      ).toEqual({
        preventDefault: true,
        effect: { kind: 'model-pick', model: opus, mode: 'plan', locked: true },
      })
    })

    it('unlocks a free-tier model in the picker mode', () => {
      const free = model({ id: 'free', freeTier: true })
      expect(
        composerKeyAction(
          keyEvent(),
          keyState({
            modelPicker: { selectedIdx: 0, text: '', mode: 'plan' },
            visibleModels: [free],
            models: [free],
            isFreeTier: true,
          }),
        ),
      ).toEqual({
        preventDefault: true,
        effect: { kind: 'model-pick', model: free, mode: 'plan', locked: false },
      })
    })

    it('locks a non-default model on the free tier without a mode', () => {
      expect(
        composerKeyAction(
          keyEvent(),
          keyState({
            modelPicker: { selectedIdx: 0, text: '' },
            visibleModels: [opus],
            isFreeTier: true,
            freeTierModelId: 'free',
          }),
        ),
      ).toEqual({
        preventDefault: true,
        effect: { kind: 'model-pick', model: opus, mode: undefined, locked: true },
      })
    })

    it('unlocks the free-tier model and any custom provider', () => {
      const custom = model({ id: 'mine', provider: 'custom' })
      expect(
        composerKeyAction(
          keyEvent(),
          keyState({
            modelPicker: { selectedIdx: 0, text: '' },
            visibleModels: [opus],
            isFreeTier: true,
            freeTierModelId: opus.id,
          }),
        ),
      ).toEqual({
        preventDefault: true,
        effect: { kind: 'model-pick', model: opus, mode: undefined, locked: false },
      })
      expect(
        composerKeyAction(
          keyEvent(),
          keyState({
            modelPicker: { selectedIdx: 0, text: '' },
            visibleModels: [custom],
            isFreeTier: true,
            freeTierModelId: 'free',
          }),
        ),
      ).toEqual({
        preventDefault: true,
        effect: { kind: 'model-pick', model: custom, mode: undefined, locked: false },
      })
    })

    it('lets Enter fall through to submit when there are no rows', () => {
      expect(
        composerKeyAction(keyEvent(), keyState({ modelPicker: { selectedIdx: 0, text: '' } })),
      ).toEqual({ preventDefault: true, effect: { kind: 'submit' } })
    })
  })

  describe('file picker', () => {
    const a = entry('src/a.ts')

    it('moves the highlight down and up', () => {
      const state = keyState({
        filePicker: { entries: [], query: '', selectedIdx: 0 },
        filteredEntries: [a],
      })
      expect(composerKeyAction(keyEvent({ key: 'ArrowDown' }), state)).toEqual({
        preventDefault: true,
        effect: { kind: 'file-move', delta: 1 },
      })
      expect(composerKeyAction(keyEvent({ key: 'ArrowUp' }), state)).toEqual({
        preventDefault: true,
        effect: { kind: 'file-move', delta: -1 },
      })
    })

    it('attaches the highlighted entry', () => {
      expect(
        composerKeyAction(
          keyEvent(),
          keyState({
            filePicker: { entries: [], query: '', selectedIdx: 0 },
            filteredEntries: [a],
          }),
        ),
      ).toEqual({ preventDefault: true, effect: { kind: 'file-pick', entry: a } })
    })

    it('does nothing when no entry is highlighted', () => {
      expect(
        composerKeyAction(
          keyEvent(),
          keyState({
            filePicker: { entries: [], query: '', selectedIdx: -1 },
            filteredEntries: [a],
          }),
        ),
      ).toEqual({ preventDefault: true, effect: { kind: 'none' } })
    })
  })

  describe('command menu', () => {
    const help = cmd({ id: 'help' })
    const clear = cmd({ id: 'clear' })

    it('moves the highlight down and up', () => {
      const state = keyState({
        commandMenu: { selectedIdx: 0, text: '' },
        filteredCmds: [help, clear],
      })
      expect(composerKeyAction(keyEvent({ key: 'ArrowDown' }), state)).toEqual({
        preventDefault: true,
        effect: { kind: 'command-move', delta: 1 },
      })
      expect(composerKeyAction(keyEvent({ key: 'ArrowUp' }), state)).toEqual({
        preventDefault: true,
        effect: { kind: 'command-move', delta: -1 },
      })
    })

    it('runs the highlighted command', () => {
      expect(
        composerKeyAction(
          keyEvent(),
          keyState({ commandMenu: { selectedIdx: 1, text: '' }, filteredCmds: [help, clear] }),
        ),
      ).toEqual({ preventDefault: true, effect: { kind: 'command-run', id: 'clear' } })
    })

    it('runs the first command when none is highlighted', () => {
      expect(
        composerKeyAction(
          keyEvent({ key: 'Tab' }),
          keyState({ commandMenu: { selectedIdx: -1, text: '' }, filteredCmds: [help, clear] }),
        ),
      ).toEqual({ preventDefault: true, effect: { kind: 'command-run', id: 'help' } })
    })

    it('closes a showAll menu on a bare Enter and submits the text', () => {
      expect(
        composerKeyAction(
          keyEvent(),
          keyState({
            commandMenu: { selectedIdx: -1, text: '', showAll: true },
            filteredCmds: [help, clear],
          }),
        ),
      ).toEqual({ preventDefault: true, effect: { kind: 'command-dismiss-submit' } })
    })

    it('only closes a showAll menu on Shift+Enter', () => {
      expect(
        composerKeyAction(
          keyEvent({ shiftKey: true }),
          keyState({
            commandMenu: { selectedIdx: -1, text: '', showAll: true },
            filteredCmds: [help, clear],
          }),
        ),
      ).toEqual({ preventDefault: false, effect: { kind: 'close-command' } })
    })

    it('runs the highlighted command in a showAll menu', () => {
      expect(
        composerKeyAction(
          keyEvent(),
          keyState({
            commandMenu: { selectedIdx: 1, text: '', showAll: true },
            filteredCmds: [help, clear],
          }),
        ),
      ).toEqual({ preventDefault: true, effect: { kind: 'command-run', id: 'clear' } })
    })

    it('lets Enter submit when the filter lists nothing', () => {
      expect(
        composerKeyAction(keyEvent(), keyState({ commandMenu: { selectedIdx: -1, text: '' } })),
      ).toEqual({ preventDefault: true, effect: { kind: 'submit' } })
    })
  })

  describe('submit', () => {
    it('submits on a bare Enter', () => {
      expect(composerKeyAction(keyEvent(), keyState())).toEqual({
        preventDefault: true,
        effect: { kind: 'submit' },
      })
    })

    it('leaves Shift+Enter to the textarea', () => {
      expect(composerKeyAction(keyEvent({ shiftKey: true }), keyState())).toEqual({
        preventDefault: false,
        effect: { kind: 'none' },
      })
    })

    it('ignores any other key', () => {
      expect(composerKeyAction(keyEvent({ key: 'a' }), keyState())).toEqual({
        preventDefault: false,
        effect: { kind: 'none' },
      })
    })
  })
})
