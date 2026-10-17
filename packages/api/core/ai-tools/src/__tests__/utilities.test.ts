import { execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { suiteRunExitCode } from '../cut-run.js'
import {
  checkBlockedCommand,
  earlyReturnCause,
  failureCausesNote,
  failuresByCause,
  findPatternArgs,
  fusedLine,
  isEnvFilePath,
  isSuiteRunCommand,
  isValidGlob,
  matchingExcludedTitles,
  outputRedirectTarget,
  redactSecrets,
  redactSecretsInCode,
  type RepeatingFailure,
  repeatingFailure,
  repeatingFailureNote,
  resolvePath,
  shellQuote,
  streamingBackgroundCommand,
  stripControlChars,
  stripTrailingSuiteFilters,
  suiteRunPipedAfterRunner,
  suiteRunPipelinePlacement,
  suiteRunPriorityLaunch,
  TOOL_RESULT_CHARS,
  truncate,
  truncateMiddle,
  universalCause,
  whitespaceTolerantReplace,
} from '../utilities.js'

describe('shellQuote', () => {
  it('wraps plain strings in single quotes', () => {
    expect(shellQuote('hello')).toBe("'hello'")
  })

  it('escapes embedded single quotes via the close-quote-escape-reopen trick', () => {
    expect(shellQuote("it's")).toBe(`'it'\\''s'`)
  })

  it('does NOT escape $ or backticks (they are inert inside single quotes)', () => {
    expect(shellQuote('$HOME')).toBe("'$HOME'")
    expect(shellQuote('`pwd`')).toBe("'`pwd`'")
  })

  it('handles empty string', () => {
    expect(shellQuote('')).toBe("''")
  })
})

describe('stripControlChars', () => {
  it('strips NUL', () => {
    expect(stripControlChars('a\x00b')).toBe('ab')
  })

  it('strips ESC, BEL, vertical tab, form feed', () => {
    expect(stripControlChars('a\x07\x0B\x0C\x1Bb')).toBe('ab')
  })

  it('preserves tab, newline, carriage return', () => {
    expect(stripControlChars('a\tb\nc\rd')).toBe('a\tb\nc\rd')
  })

  it('preserves printable characters and unicode', () => {
    expect(stripControlChars('Hello, 世界 🌍')).toBe('Hello, 世界 🌍')
  })

  it('handles empty string', () => {
    expect(stripControlChars('')).toBe('')
  })
})

describe('redactSecrets', () => {
  it('redacts KEY=value pairs for known secret keywords', () => {
    expect(redactSecrets('SECRET_KEY=hunter2')).toBe('SECRET_KEY=[REDACTED]')
    expect(redactSecrets('DB_PASSWORD=foo')).toBe('DB_PASSWORD=[REDACTED]')
    expect(redactSecrets('GITHUB_TOKEN=ghp_abc')).toBe('GITHUB_TOKEN=[REDACTED]')
    expect(redactSecrets('API_KEY=xyz')).toBe('API_KEY=[REDACTED]')
  })

  it('redacts DATABASE_URL / REDIS_URL', () => {
    expect(redactSecrets('DATABASE_URL=postgres://...')).toBe('DATABASE_URL=[REDACTED]')
    expect(redactSecrets('REDIS_URL=redis://...')).toBe('REDIS_URL=[REDACTED]')
  })

  it('preserves non-secret-looking variables', () => {
    expect(redactSecrets('PORT=3000')).toBe('PORT=3000')
    expect(redactSecrets('NODE_ENV=production')).toBe('NODE_ENV=production')
  })

  it('redacts JSON-formatted secrets (double-quoted)', () => {
    const out = redactSecrets('"apiToken": "abc123"')
    expect(out).toContain('"[REDACTED]"')
    expect(out).not.toContain('abc123')
  })

  it('redacts JSON-formatted secrets (single-quoted)', () => {
    const out = redactSecrets("'apiToken': 'abc123'")
    expect(out).toContain("'[REDACTED]'")
    expect(out).not.toContain('abc123')
  })

  it('redacts within multi-line log output', () => {
    const log = 'PORT=3000\nAPI_KEY=secret123\nSECRET_TOKEN=hidden\n'
    const out = redactSecrets(log)
    expect(out).toContain('PORT=3000')
    expect(out).toContain('API_KEY=[REDACTED]')
    expect(out).toContain('SECRET_TOKEN=[REDACTED]')
    expect(out).not.toContain('secret123')
    expect(out).not.toContain('hidden')
  })

  it('still masks a keyword assignment that arrives mid-line in command output', () => {
    // Env-dump grade keeps the permissive prefix: a leaked var routinely shows up
    // mid-line on stderr, and command output is never written back to a file.
    const out = redactSecrets('Error: DATABASE_URL=postgres://leak@host/db')
    expect(out).toContain('DATABASE_URL=[REDACTED]')
    expect(out).not.toContain('postgres://leak')
  })

  it('never eats a JSX expression container, at either grade', () => {
    // `auth={authClient}` → `auth=[REDACTED]` broke JSX outright. An env value never
    // opens with `{` or `<`, so both grades refuse those.
    expect(redactSecrets('  auth={authClient}')).toBe('  auth={authClient}')
    expect(redactSecrets('auth={authClient}')).toBe('auth={authClient}')
    expect(redactSecretsInCode('      oauthConfig={oauthConfig}')).toBe(
      '      oauthConfig={oauthConfig}',
    )
  })
})

describe('redactSecretsInCode', () => {
  it('masks real env assignments, including bare and exported names', () => {
    expect(redactSecretsInCode('DB_PASSWORD=hunter2')).toBe('DB_PASSWORD=[REDACTED]')
    expect(redactSecretsInCode('SECRET=abc')).toBe('SECRET=[REDACTED]')
    // A name that IS the keyword has nothing before it — this regressed once.
    expect(
      redactSecretsInCode('DATABASE_URL=postgres://postgres:postgres@localhost:5432/app'),
    ).toBe('DATABASE_URL=[REDACTED]')
    expect(
      redactSecretsInCode('export DATABASE_URL=postgres://postgres:postgres@localhost:5432/app'),
    ).toBe('export DATABASE_URL=[REDACTED]')
    expect(redactSecretsInCode('REDIS_URL=redis://:redis@localhost:6379')).toBe(
      'REDIS_URL=[REDACTED]',
    )
  })

  it('leaves non-secret env assignments alone', () => {
    expect(redactSecretsInCode('PORT=3000')).toBe('PORT=3000')
    expect(redactSecretsInCode('NODE_ENV=production')).toBe('NODE_ENV=production')
  })

  it('preserves ordinary source code verbatim', () => {
    // Every line here was corrupted by the name-keyed JSON passes, and the agent
    // wrote the token back into the user's project on the next edit.
    const code = [
      "  forgotPasswordEndpoint: '/users/forgot-password',",
      "  changePasswordEndpoint: '/users/me/password',",
      "  apiKeys: 'API keys',",
      "  'login.hidePassword': 'Nascondi password',",
      "  passwordPlaceholder: '••••••••',",
      "const TEST_PASSWORD = 'TestPass!1'",
      "export async function signup(page: Page, password = 'TestPass123!') {",
      '      auth={authClient}',
      '      oauthConfig={oauthConfig}',
      '  authorName=""',
      "await page.goto(base + '/reset-password?token=invalid-token')",
    ].join('\n')
    expect(redactSecretsInCode(code)).toBe(code)
  })

  it('omits the name-keyed JSON passes that redactSecrets applies', () => {
    const dump = `{ "apiToken": "abc123" }`
    expect(redactSecrets(dump)).toContain('[REDACTED]')
    expect(redactSecretsInCode(dump)).toBe(dump)
  })
})

describe('isEnvFilePath', () => {
  it('recognizes env files, which keep full env-dump redaction', () => {
    expect(isEnvFilePath('.env')).toBe(true)
    expect(isEnvFilePath('/workspace/app/.env')).toBe(true)
    expect(isEnvFilePath('/workspace/.env.local')).toBe(true)
    expect(isEnvFilePath('api/.env.production')).toBe(true)
    expect(isEnvFilePath('config/staging.env')).toBe(true)
  })

  it('does not treat source files as env files', () => {
    expect(isEnvFilePath('app/src/config.ts')).toBe(false)
    expect(isEnvFilePath('app/src/App.tsx')).toBe(false)
    expect(isEnvFilePath('.environment.ts')).toBe(false)
    expect(isEnvFilePath('README.md')).toBe(false)
  })
})

describe('checkBlockedCommand', () => {
  it('allows env as a launcher: env -u KEY cmd, env KEY=value cmd, env -i cmd', () => {
    expect(checkBlockedCommand('env -u ANTHROPIC_API_KEY npm run build')).toBeNull()
    expect(
      checkBlockedCommand(
        'cd app && env -u ANTHROPIC_API_KEY -u OPENAI_API_KEY npm run build 2>&1 | tail -40',
      ),
    ).toBeNull()
    expect(checkBlockedCommand('env SUMMARY_GENERATE=1 node scripts/prerender.mjs')).toBeNull()
    expect(checkBlockedCommand("env -i PATH=/usr/bin sh -c 'npm test'")).toBeNull()
  })

  it('allows an escaped `\\|env` inside a grep pattern, and still blocks a real env (flash-m58)', () => {
    expect(checkBlockedCommand('grep -rn "setupBonds\\|dotenv\\|env" api/src')).toBeNull()
    expect(checkBlockedCommand('ls | env')).not.toBeNull()
    expect(checkBlockedCommand('ls && env')).not.toBeNull()
    expect(checkBlockedCommand('env')).not.toBeNull()
    expect(checkBlockedCommand('bash -c "env"')).not.toBeNull()
  })

  it('says a blocked command ran none of its parts (X1 m53 lost a chained mkdir)', () => {
    expect(checkBlockedCommand('mkdir -p /workspace/x && env | grep URL')).toMatch(
      /Nothing in this command ran — none of its other parts either/,
    )
  })

  it('still blocks env when it dumps: bare, -0, piped, redirected, chained', () => {
    expect(checkBlockedCommand('env -0')).toMatch(/dumping environment variables/)
    expect(checkBlockedCommand('env --null | tr "\\0" "\\n"')).toMatch(
      /dumping environment variables/,
    )
    expect(checkBlockedCommand('env | grep KEY')).toMatch(/dumping environment variables/)
    expect(checkBlockedCommand('env > /tmp/e.txt')).toMatch(/dumping environment variables/)
    expect(checkBlockedCommand('env; echo done')).toMatch(/dumping environment variables/)
    expect(checkBlockedCommand('echo hi && env')).toMatch(/dumping environment variables/)
  })

  it('blocks bare env / printenv', () => {
    expect(checkBlockedCommand('env')).toMatch(/dumping environment variables/)
    expect(checkBlockedCommand('printenv')).toMatch(/dumping environment variables/)
  })

  it('names a way to check one variable, and that way is allowed', () => {
    const steer = checkBlockedCommand('printenv | grep DEEPSEEK') ?? ''
    const suggested = /`(test -n [^`]+)`/.exec(steer)?.[1]
    expect(suggested).toBeDefined()
    expect(checkBlockedCommand(suggested!.replace('NAME', 'DEEPSEEK_API_KEY'))).toBeNull()
  })

  it('blocks env through sh -c wrapper', () => {
    expect(checkBlockedCommand('sh -c "env"')).toMatch(/dumping environment variables/)
    expect(checkBlockedCommand('bash -c env')).toMatch(/dumping environment variables/)
  })

  it('blocks pipe / chain to env (env after ; & |)', () => {
    expect(checkBlockedCommand('echo hi; env')).toMatch(/dumping environment variables/)
    expect(checkBlockedCommand('echo hi && env')).toMatch(/dumping environment variables/)
  })

  it('blocks cat /etc/environment', () => {
    expect(checkBlockedCommand('cat /etc/environment')).toMatch(/dumping environment/)
  })

  it('blocks /proc/<pid>/environ via cat', () => {
    expect(checkBlockedCommand('cat /proc/1234/environ')).toMatch(/environment/)
    expect(checkBlockedCommand('cat /proc/self/environ')).toMatch(/environment/)
  })

  it('blocks redirect from /proc/environ', () => {
    expect(checkBlockedCommand('xxd < /proc/self/environ')).toMatch(/\/proc\/environ/)
  })

  it('blocks reads of /etc/mol (platform secrets dir — /etc/mol/env holds vault + platform secrets)', () => {
    expect(checkBlockedCommand('cat /etc/mol/env')).toMatch(/dumping environment/)
    expect(checkBlockedCommand('cat /etc/mol/env.extra')).toMatch(/dumping environment/)
    expect(checkBlockedCommand('cat /etc/mol')).toMatch(/dumping environment/)
    expect(checkBlockedCommand('base64 /etc/mol/env')).toMatch(/dumping environment/)
    expect(checkBlockedCommand('head -n 5 /etc/mol/env')).toMatch(/dumping environment/)
    expect(checkBlockedCommand('strings /etc/mol/vault.json')).toMatch(/dumping environment/)
    // A reader in front also blocks (reader rule fires first)…
    expect(checkBlockedCommand('xxd < /etc/mol/env')).toMatch(/dumping environment/)
    // …and a NON-reader command redirecting from /etc/mol hits the redirect rule.
    expect(checkBlockedCommand('sha256sum < /etc/mol/env')).toMatch(/platform secrets/)
    // Reads of sibling /etc paths that are NOT the platform secrets dir stay allowed.
    expect(checkBlockedCommand('cat /etc/hostname')).toBeNull()
    expect(checkBlockedCommand('cat /etc/motd')).toBeNull()
  })

  it('blocks interpreter-based env dumps (python / node / ruby)', () => {
    expect(checkBlockedCommand('python -c "import os; print(os.environ)"')).toMatch(
      /from an interpreter/,
    )
    expect(checkBlockedCommand('node -e "console.log(process.env)"')).toMatch(/from an interpreter/)
    expect(checkBlockedCommand('ruby -e "puts ENV[\'X\']"')).toMatch(/from an interpreter/)
  })

  it('returns null for innocuous commands', () => {
    expect(checkBlockedCommand('ls -la')).toBeNull()
    expect(checkBlockedCommand('npm run build')).toBeNull()
    expect(checkBlockedCommand('node script.js')).toBeNull()
    expect(checkBlockedCommand('echo hello')).toBeNull()
  })
})

describe('resolvePath', () => {
  const root = '/var/projects/app'

  it('empty string resolves to root', () => {
    expect(resolvePath('', root)).toBe(root)
  })

  it('bare slash resolves to root', () => {
    expect(resolvePath('/', root)).toBe(root)
  })

  it('relative path resolves under root', () => {
    expect(resolvePath('src/index.ts', root)).toBe(`${root}/src/index.ts`)
  })

  it('absolute path inside root is preserved', () => {
    expect(resolvePath(`${root}/src/x.ts`, root)).toBe(`${root}/src/x.ts`)
  })

  it('absolute path OUTSIDE root collapses to root (path-traversal defense)', () => {
    expect(resolvePath('/etc/passwd', root)).toBe(root)
    expect(resolvePath('/var/projects/other/file.ts', root)).toBe(root)
  })

  it('upward traversal (..) that escapes root collapses to root', () => {
    expect(resolvePath('../../../etc/passwd', root)).toBe(root)
  })

  it('strips NUL bytes from input', () => {
    expect(resolvePath('src/\x00index.ts', root)).toBe(`${root}/src/index.ts`)
  })
})

describe('isValidGlob', () => {
  it('accepts simple file globs', () => {
    expect(isValidGlob('*.ts')).toBe(true)
    expect(isValidGlob('src/**/*.test.ts')).toBe(true) // multi-* is allowed by the char class
  })

  it('accepts ? wildcards', () => {
    expect(isValidGlob('?file.txt')).toBe(true)
  })

  it('accepts alphanumeric + ./-/_ characters', () => {
    expect(isValidGlob('my-file_name.txt')).toBe(true)
  })

  it('accepts bracket/paren glob chars for Next.js App Router route dirs', () => {
    expect(isValidGlob('[id]')).toBe(true)
    expect(isValidGlob('[...slug]')).toBe(true)
    expect(isValidGlob('(group)')).toBe(true)
    expect(isValidGlob('[[...optional]]')).toBe(true)
    expect(isValidGlob('app/invoices/[id]/*.tsx')).toBe(true)
    expect(isValidGlob('app/(marketing)/**/*.ts')).toBe(true)
  })

  it('rejects shell metacharacters (incl. the ones that make () dangerous)', () => {
    expect(isValidGlob('file; rm -rf /')).toBe(false)
    expect(isValidGlob('file && rm')).toBe(false)
    expect(isValidGlob('file | grep')).toBe(false)
    expect(isValidGlob('file > /tmp/x')).toBe(false)
    expect(isValidGlob('$(rm)')).toBe(false) // $ still rejected, so no command substitution
    expect(isValidGlob('`rm`')).toBe(false) // backtick still rejected
    expect(isValidGlob('a{b,c}')).toBe(false) // braces not enabled (find has no brace expansion)
  })

  it('rejects whitespace', () => {
    expect(isValidGlob('file name.txt')).toBe(false)
  })

  it('rejects empty input', () => {
    expect(isValidGlob('')).toBe(false)
  })
})

describe('findPatternArgs', () => {
  it('matches a bare name/glob with -name', () => {
    expect(findPatternArgs('*.ts')).toBe("-name '*.ts'")
    expect(findPatternArgs('Dashboard*')).toBe("-name 'Dashboard*'")
  })

  it('matches a pattern containing a slash against the path, anchored by a leading */', () => {
    // The live run's own patterns: `-name` compared these against the basename
    // and answered [] (xr-molecule-flash-m77).
    expect(findPatternArgs('helpers/*')).toBe("-path '*/helpers/*'")
    expect(findPatternArgs('e2e/*.spec.ts')).toBe("-path '*/e2e/*.spec.ts'")
    expect(findPatternArgs('node_modules/@molecule/app-ui/*')).toBe(
      "-path '*/node_modules/@molecule/app-ui/*'",
    )
  })

  it('strips a leading ./ or / before anchoring', () => {
    expect(findPatternArgs('./src/index.ts')).toBe("-path '*/src/index.ts'")
    expect(findPatternArgs('/src/index.ts')).toBe("-path '*/src/index.ts'")
  })

  it('gives a doubled-star segment the zero-or-more meaning it has as a glob', () => {
    // `*` crosses `/` in a -path glob, so the KEPT segment already covers one or
    // more directories; only the DROPPED one matches the file directly in `src/`.
    const args = findPatternArgs('src/**/App.tsx')
    expect(args).toBe("\\( -path '*/src/App.tsx' -o -path '*/src/**/App.tsx' \\)")
    const anyDepth = findPatternArgs('**/SELECTORS.md')
    expect(anyDepth).toBe("\\( -path '*/SELECTORS.md' -o -path '*/**/SELECTORS.md' \\)")
  })

  it('keeps the leading `*/` inside the shell quoting, never as a bare glob', () => {
    // The anchor is part of the quoted pattern: an unquoted `*` would be
    // expanded by the shell against this machine's cwd before find ever ran.
    expect(findPatternArgs('a b/c')).toBe("-path '*/a b/c'")
  })
})

describe('truncate', () => {
  it('returns input unchanged when below maxLength', () => {
    expect(truncate('hello', 100)).toBe('hello')
  })

  it('returns input unchanged when exactly at maxLength', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })

  it('truncates + appends notice when over maxLength', () => {
    const out = truncate('a'.repeat(200), 10)
    expect(out.startsWith('aaaaaaaaaa')).toBe(true)
    expect(out).toContain('(truncated)')
  })

  it('handles maxLength = 0', () => {
    const out = truncate('hello', 0)
    expect(out).toContain('(truncated)')
  })
})

describe('truncateMiddle', () => {
  it('puts back a run tally the cut lost (flash-m60)', () => {
    const blocks = Array.from(
      { length: 40 },
      (_, i) =>
        `  ${i + 1}) [chromium] › e2e/a.spec.ts:${i}:3 › A › case ${i}\n    Error: boom ${'x'.repeat(200)}`,
    ).join('\n')
    const list = Array.from(
      { length: 40 },
      (_, i) => `    [chromium] › e2e/a.spec.ts:${i}:3 › A › case ${i}`,
    ).join('\n')
    const out = `Running 139 tests\n${blocks}\n  40 failed\n${list}\n  65 skipped\n  34 passed (5.6m)`
    const cut = truncateMiddle(out, 6000)
    expect(cut).toContain('40 failed')
    expect(cut).toContain('34 passed (5.6m)')
  })

  it('returns input unchanged when at or below maxLength', () => {
    expect(truncateMiddle('hello', 100)).toBe('hello')
    expect(truncateMiddle('hello', 5)).toBe('hello')
  })

  it('KEEPS THE TAIL — a failing command error at the end survives (the bug)', () => {
    // Head-only truncate() would drop this; truncateMiddle must retain it.
    const progress = 'PASS a passing line of test output\n'.repeat(4000)
    const failure =
      'FAIL payment.test.ts\n  expected 200 got 500: relation "payments" does not exist\nTests: 1 failed, 240 passed\n'
    const output = progress + failure
    expect(output.length).toBeGreaterThan(102400)
    const out = truncateMiddle(output, 102400)
    expect(out).toContain('1 failed, 240 passed')
    expect(out).toContain('relation "payments" does not exist')
  })

  it('keeps the head too (what ran / first errors) and marks the elision', () => {
    const out = truncateMiddle('HEAD_MARKER' + 'x'.repeat(2000) + 'TAIL_MARKER', 400)
    expect(out.startsWith('HEAD_MARKER')).toBe(true)
    expect(out.endsWith('TAIL_MARKER')).toBe(true)
    expect(out).toMatch(/middle truncated/)
  })

  it('stays WITHIN maxLength (reserves room for the notice — the cap is a real budget)', () => {
    // Both a big and a small cap: total output (head + notice + tail) must not
    // exceed maxLength, so exec_command's MAX_OUTPUT_SIZE bound actually holds.
    for (const cap of [1000, 102400, 300]) {
      const out = truncateMiddle('z'.repeat(cap * 3), cap)
      expect(out.length, `cap=${cap}`).toBeLessThanOrEqual(cap)
    }
  })
})

describe('whitespaceTolerantReplace', () => {
  const file = ['function f() {', '    const x = 1', '    return x', '}', ''].join('\n')

  it('applies an edit when only indentation differs (unique match)', () => {
    // old_string uses 2-space indent; file uses 4-space — exact match would fail.
    const out = whitespaceTolerantReplace(file, '  const x = 1\n  return x', '  return 2')
    expect(out).toBe(['function f() {', '  return 2', '}', ''].join('\n'))
  })

  it('tolerates trailing whitespace differences', () => {
    const f = 'const a = 1   \nconst b = 2'
    const out = whitespaceTolerantReplace(f, 'const a = 1', 'const a = 99')
    expect(out).toBe('const a = 99\nconst b = 2')
  })

  it('refuses an ambiguous match (returns null)', () => {
    const f = ['x()', 'x()', 'y()'].join('\n')
    expect(whitespaceTolerantReplace(f, 'x()', 'z()')).toBeNull()
  })

  it('returns null when no line-run matches even normalized', () => {
    expect(whitespaceTolerantReplace(file, 'const y = 9', 'const y = 0')).toBeNull()
  })

  it('refuses a degenerate all-blank search block', () => {
    expect(whitespaceTolerantReplace('a\n\nb', '   \n\t', 'x')).toBeNull()
  })

  it('preserves surrounding lines exactly (only the matched run changes)', () => {
    const f = ['header', '   target line', 'footer'].join('\n')
    const out = whitespaceTolerantReplace(f, 'target line', 'new line')
    expect(out).toBe(['header', 'new line', 'footer'].join('\n'))
  })

  it('applies a multi-line replacement verbatim', () => {
    const out = whitespaceTolerantReplace(file, '  return x', 'const y = x\n  return y')
    expect(out).toContain('const y = x\n  return y')
  })
})

describe('isValidGlob — scoped packages', () => {
  it('accepts a scoped package path', () => {
    // Measured on a live build: the executor tried this twice and was refused
    // both times, so in a molecule project it could not glob its own deps.
    expect(isValidGlob('node_modules/@molecule/app-ui/*')).toBe(true)
    expect(isValidGlob('@molecule/api-*/src/index.ts')).toBe(true)
  })

  it('still accepts what it always did', () => {
    expect(isValidGlob('*.tsx')).toBe(true)
    expect(isValidGlob('app/src/pages/[id]/page.tsx')).toBe(true)
    expect(isValidGlob('Dashboard*')).toBe(true)
  })

  it('still refuses shell metacharacters', () => {
    for (const bad of ['foo;rm -rf /', 'a|b', '$(whoami)', '`id`', 'a>b', 'a&b']) {
      expect(isValidGlob(bad), bad).toBe(false)
    }
  })
})

describe('streamingBackgroundCommand', () => {
  /**
   * The head the rewrite puts on every background suite run: the `list` reporter prints each
   * failure's own error as that test fails when Playwright's inline switch is set (flash-m99).
   */
  const INLINE_HEAD = 'export PLAYWRIGHT_LIST_PRINT_FAILURES_INLINE=1; '
  /** The sentence that head is announced with. */
  const INLINE_CHANGE =
    'Each failure’s own error is now written into the log as that test fails, not only in the ' +
    'summary at the end — so a run that is still walking already says what its failures are, ' +
    'and you need not wait for it to end to start on them.'

  it('drops a trailing tail, in both of its spellings', () => {
    expect(streamingBackgroundCommand('npm run build 2>&1 | tail -40').command).toBe(
      'npm run build 2>&1',
    )
    expect(streamingBackgroundCommand('npm test | tail -n 100').command).toBe('npm test')
  })

  it('drops a trailing head from a Playwright run, whose tally prints last (flash-m32)', () => {
    expect(streamingBackgroundCommand('npx playwright test 2>&1 | head -60').command).toBe(
      `${INLINE_HEAD}npx playwright test 2>&1 --reporter=list`,
    )
    expect(streamingBackgroundCommand('cat big.log | head -60').changes).toEqual([])
  })

  it('keeps a tail that is not the last step, and any other pipe', () => {
    expect(streamingBackgroundCommand('npm test | tail -5 > out.txt').changes).toEqual([])
    expect(streamingBackgroundCommand('npm test | grep -c passed').changes).toEqual([])
  })

  it('adds the reporter the platform reads a background suite back in (flash-m62)', () => {
    // The fail-fast note (molecule-dev `api/src/ai/suite-fail-fast.ts`) matches the `list`
    // reporter's `  ✓/✘  <n> … (…)` lines and reads their durations. The `line` reporter writes
    // `[n/N] <title>` with no durations, so under it the note could never fire on a suite
    // repeating one cause: X0 flash-m62 spent 8.3 minutes walking 139 tests that way.
    //
    // ONE reporter, iterating or not: a second one writes every result into the log twice
    // (flash-m83 — see the test below).
    expect(streamingBackgroundCommand('cd e2e && npx playwright test specs/auth.spec.ts')).toEqual({
      command: `${INLINE_HEAD}cd e2e && npx playwright test specs/auth.spec.ts --reporter=list --retries=0`,
      changes: [
        'Added `--reporter=list` so each test result is written to the log as it finishes ' +
          '(the config reporter may print nothing until the end).',
        INLINE_CHANGE,
        'Added `--retries=0`: a diagnosis or re-run walks each failure once; keep the suite’s retries for the proof run.',
      ],
    })
  })

  it('runs a diagnosis or re-run with --retries=0, and leaves the proof run alone (flash-m71)', () => {
    expect(streamingBackgroundCommand('npx playwright test --max-failures=15').command).toBe(
      `${INLINE_HEAD}npx playwright test --max-failures=15 --reporter=list --retries=0`,
    )
    expect(streamingBackgroundCommand('npx playwright test --last-failed').command).toContain(
      '--retries=0',
    )
    expect(streamingBackgroundCommand('npx playwright test e2e/home.spec.ts:12').command).toContain(
      '--retries=0',
    )
    // The uncapped proof run keeps the suite's retries; an explicit --retries is respected.
    expect(streamingBackgroundCommand('npx playwright test').command).not.toContain('--retries')
    expect(
      streamingBackgroundCommand('npx playwright test --max-failures=15 --retries=1').command,
    ).not.toContain('--retries=0')
  })

  it('keeps the suite’s retries on the uncapped proof run the platform asked for (flash-m89)', () => {
    // The platform's own `testRunNote` asks for the whole suite with `--max-failures=0` ("run the
    // whole suite once with `--max-failures=0`"), and every one of those runs came back "Added
    // `--retries=0`: a diagnosis or re-run walks each failure once" — including m89's two proofs
    // against the deployed URL (+36:40 and +49:57), where the retries it dropped are the ones that
    // absorb a network blip. `maxFailures: 0` is Playwright's own spelling of NO cap ("Setting to
    // zero disables the feature"), so the run is the whole suite and keeps them.
    //
    // m89's proof command: its last local whole-suite run, which the platform's deploy note hands
    // back with the base URL swapped for the deployed one.
    const proof =
      'cd /workspace/.mol-scratch/e2e && TEST_MODE=fullstack ' +
      'BASE_URL=https://loopcheck-xr-molecule-flash-m89.apps.mlcl.dev npx --no-install ' +
      'playwright test --config=playwright.config.ts --reporter=list --workers=1 --max-failures=0'
    // Already the shape the platform reads back (one `list` reporter): the reporter is not
    // rewritten, and the run is still put on the inline-failure switch (flash-m99).
    expect(streamingBackgroundCommand(proof)).toEqual({
      command: `${INLINE_HEAD}${proof}`,
      changes: [INLINE_CHANGE],
    })
    // The space spelling is the same flag to Playwright, and neither is a cap.
    expect(
      streamingBackgroundCommand('npx playwright test --max-failures 0').command,
    ).not.toContain('--retries')
    // A cap that bounds something still is a diagnosis — m89's own first local run.
    expect(
      streamingBackgroundCommand(
        'cd /workspace/.mol-scratch/e2e && TEST_MODE=fullstack BASE_URL=http://localhost:5173 ' +
          'npx --no-install playwright test --max-failures=15 --config=playwright.config.ts ' +
          '2>&1 | tail -70',
      ).command,
    ).toContain('--retries=0')
    // And so is a run that is uncapped AND narrowed: it still walks a part of the suite.
    expect(
      streamingBackgroundCommand('npx playwright test --max-failures=0 -g "signs in"').command,
    ).toContain('--retries=0')
  })

  it('switches a final playwright run off a printing reporter the fail-fast cannot read', () => {
    expect(
      streamingBackgroundCommand('cd spec/run && npx playwright test --reporter=line'),
    ).toEqual({
      command: `${INLINE_HEAD}cd spec/run && npx playwright test --reporter=list`,
      changes: [
        'Switched the test reporters to `--reporter=list`: `list` writes each test result as it ' +
          'finishes and is the shape the platform reads back from a background run, and it is the ' +
          'only printing reporter — two of them write every result into the log twice (X1 flash-m83).',
        INLINE_CHANGE,
      ],
    })
    // `dot` prints one dot per test and nothing a note can read, so it is put on `list` too.
    expect(streamingBackgroundCommand('npx playwright test --reporter=dot').command).toBe(
      `${INLINE_HEAD}npx playwright test --reporter=list`,
    )
    // The space spelling is the same flag to Playwright, and only the last step is rewritten.
    expect(streamingBackgroundCommand('cd e2e; npx playwright test --reporter line').command).toBe(
      `${INLINE_HEAD}cd e2e; npx playwright test --reporter list`,
    )
    expect(
      streamingBackgroundCommand('npx playwright test --reporter line && echo done').command,
    ).toBe('npx playwright test --reporter line && echo done')
  })

  it('never leaves TWO reporters printing each failure (flash-m83)', () => {
    // flash-m83's whole remote run (2026-10-16): `--reporter=list,line`, its `line` added by this
    // function one run earlier. Both reporters print every failure, so the log carried each test
    // twice and the mid-run repeating-cause note read two distinct failures as four.
    const run =
      'TEST_MODE=fullstack npx playwright test --config=e2e-realworld.config.ts ' +
      '--max-failures=15 --reporter=list,line --retries=0'
    const { command, changes } = streamingBackgroundCommand(run)
    expect(command).toBe(`${INLINE_HEAD}${run.replace('--reporter=list,line', '--reporter=list')}`)
    expect(changes).toEqual([
      'Dropped `line` from your `--reporter=list,line`: two reporters that both print each failure ' +
        'write every test result into the log twice — the whole log doubled for nothing (X1 ' +
        'flash-m83) — so this run keeps `list` alone.',
      INLINE_CHANGE,
    ])
    // The inline switch belongs to `list` alone: it is not set when the only reporters are machine
    // formats, which write no per-test line at all.
    expect(
      streamingBackgroundCommand('npx playwright test --reporter=json --reporter=list').command,
    ).toBe(`${INLINE_HEAD}npx playwright test --reporter=json --reporter=list`)
    // A file the executor asked for is theirs and stays: only the printers are collapsed.
    expect(streamingBackgroundCommand('npx playwright test --reporter=html,line').command).toBe(
      `${INLINE_HEAD}npx playwright test --reporter=html,list`,
    )
    expect(streamingBackgroundCommand('npx playwright test --reporter=html,line,dot').command).toBe(
      `${INLINE_HEAD}npx playwright test --reporter=html,list`,
    )
  })

  it('puts a background suite on the reporter that prints each failure as it fails (flash-m99)', () => {
    // xr-molecule-flash-m99 (+19:27 → +21:00, 2026-10-16): the wait note handed the model
    // `grep -n -A 20 '<test name>' <log>` to read one failure's error, and under a bare `list` run
    // that grep returns only the `✘` row — the errors print at `onEnd`, minutes later. Four greps
    // returned nothing, the model inferred causes from the spec prose and edited `app/src` while
    // the run was still walking, which voids the run. `list` prints each failure as it fails when
    // Playwright's inline switch is set, so the background run is put on it.
    const { command, changes } = streamingBackgroundCommand('npx playwright test')
    expect(command).toBe(`${INLINE_HEAD}npx playwright test --reporter=list`)
    expect(changes).toEqual([
      'Added `--reporter=list` so each test result is written to the log as it finishes ' +
        '(the config reporter may print nothing until the end).',
      INLINE_CHANGE,
    ])
    // The head is an `export` at the start of the WHOLE command, never written in front of the
    // last step: `timeout 280 npx playwright test` and a multi-line command whose last line is the
    // run would both read the assignment as the program to run.
    expect(streamingBackgroundCommand('timeout 280 npx playwright test').command).toBe(
      `${INLINE_HEAD}timeout 280 npx playwright test --reporter=list`,
    )
    const multi = 'cd /workspace/my-app\nnpx playwright test'
    expect(streamingBackgroundCommand(multi).command).toBe(
      `export PLAYWRIGHT_LIST_PRINT_FAILURES_INLINE=1; ${multi} --reporter=list`,
    )
    // Still exactly ONE reporter printing each failure — the inline switch is a switch on that one
    // reporter, never a second reporter beside it (flash-m83).
    expect(command.match(/--reporter/g)).toHaveLength(1)
  })

  it('leaves playwright alone when it picks a reporter, redirects, or is not the last step', () => {
    // `--reporter=list` is the shape the platform reads back: its reporter is left exactly as the
    // executor spelled it, and only the inline switch is set on it (flash-m99).
    expect(streamingBackgroundCommand('npx playwright test --reporter=list')).toEqual({
      command: `${INLINE_HEAD}npx playwright test --reporter=list`,
      changes: [INLINE_CHANGE],
    })
    for (const command of [
      'npx playwright test --reporter=html',
      // A machine format written to a file is the executor's own business: no printer of the
      // platform's is added beside it, and there is no per-test failure line to make inline.
      'npx playwright test --reporter=json',
      'npx playwright test --reporter=junit,html',
      'npx playwright test > log.txt',
      'npx playwright test && echo done',
      'npm run build',
    ]) {
      expect(streamingBackgroundCommand(command)).toEqual({ command, changes: [] })
    }
  })

  it('rewrites no part of a Playwright command that runs no test (flash-m79)', () => {
    // flash-m79's config check: a config written and copied beside the suite, used with `--list`.
    // It was held and never ran; had it run, the platform would have added `--reporter` and
    // `--retries=0` to a command that walks no test.
    const list = [
      'cd /workspace/fixtures/realworld/specs/e2e',
      "cat > /tmp/pw.config.ts <<'EOF'",
      'export default {}',
      'EOF',
      'cp /tmp/pw.config.ts playwright.local.config.ts && npx playwright test -c playwright.local.config.ts --list 2>&1 | tail -5',
    ].join('\n')
    expect(streamingBackgroundCommand(list)).toEqual({ command: list, changes: [] })
    for (const command of [
      'npx playwright test --list',
      'npx playwright test --help',
      'npx playwright show-report',
      'npx playwright install chromium',
    ])
      expect(streamingBackgroundCommand(command), command).toEqual({ command, changes: [] })
    // A run in the same command is still a run.
    expect(streamingBackgroundCommand('npx playwright test --list && npx playwright test')).toEqual(
      {
        command: `${INLINE_HEAD}npx playwright test --list && npx playwright test --reporter=list`,
        changes: [
          'Added `--reporter=list` so each test result is written to the log as it finishes ' +
            '(the config reporter may print nothing until the end).',
          INLINE_CHANGE,
        ],
      },
    )
  })

  it('keeps an iterating run on `list` alone, with no second reporter beside it (flash-m76/m83)', () => {
    // flash-m76's diagnosis run ended `--max-failures=15 … --reporter=list`: 15 tests took the
    // full 4.0 minutes to report one cause, because the log carried each failure's duration and
    // nothing of its error until the very end. m76 answered that by adding `line` beside `list`;
    // m83 showed what two printers cost (the log doubled, and the repeating-cause count with it),
    // so an iterating run is put on `list` alone, exactly like a whole-suite proof run.
    expect(
      streamingBackgroundCommand('npx playwright test --max-failures=15 --reporter=list'),
    ).toEqual({
      command: `${INLINE_HEAD}npx playwright test --max-failures=15 --reporter=list --retries=0`,
      changes: [
        INLINE_CHANGE,
        'Added `--retries=0`: a diagnosis or re-run walks each failure once; keep the suite’s retries for the proof run.',
      ],
    })
  })
})

/**
 * X1 flash-m76: a capped diagnosis run walked 17 tests in 4.0 minutes; all 15 failures were the
 * same `TimeoutError: page.waitForURL` from one missing `navigate('/')`, and the executor learned
 * it only when the whole run was over. Lines below are that run's own log.
 */
describe('repeatingFailure', () => {
  /** A `list`-reporter result line, as the log writes it. */
  const list = (mark: string, n: number, where: string, title: string, seconds: string): string =>
    `  ${mark}  ${String(n).padStart(3)} [chromium] › ../../fixtures/realworld/specs/e2e/${where} › ${title} (${seconds})`

  const m76 = [
    'Running 139 tests using 1 worker',
    '',
    list('✘', 1, 'articles.spec.ts:32:3', 'Articles › should create a new article', '15.6s'),
    list('✘', 2, 'articles.spec.ts:50:3', 'Articles › should edit an existing article', '15.6s'),
    list('✘', 3, 'articles.spec.ts:71:3', 'Articles › should delete an article', '15.6s'),
  ].join('\n')

  it('names the cause at the third failure of one shape, mid-run', () => {
    const found = repeatingFailure(m76)
    expect(found).not.toBeNull()
    expect(found!.count).toBe(3)
    expect(found!.seconds).toBe(15.6)
    expect(found!.message).toBeNull()
    expect(found!.tests.map((t) => t.where)).toEqual([
      '../../fixtures/realworld/specs/e2e/articles.spec.ts:32',
      '../../fixtures/realworld/specs/e2e/articles.spec.ts:50',
      '../../fixtures/realworld/specs/e2e/articles.spec.ts:71',
    ])
    expect(found!.tests[0].title).toBe('should create a new article')
  })

  it('reads through a pass and a second duration that is the same timeout', () => {
    const log = `${m76}\n${list('✓', 13, 'auth.spec.ts:33:3', 'Authentication › should show an error', '1.1s')}\n${list('✘', 14, 'auth.spec.ts:42:3', 'Authentication › should fail login', '15.1s')}`
    // 15.6 s and 15.1 s are 0.5 s apart: one test timeout, not two causes.
    expect(repeatingFailure(log)!.count).toBe(4)
  })

  it('says nothing about two failures, or about three that are not the same', () => {
    expect(repeatingFailure(m76.split('\n').slice(0, 4).join('\n'))).toBeNull()
    const mixed = [
      list('✘', 1, 'a.spec.ts:1:1', 'A › one', '0.2s'),
      list('✘', 2, 'b.spec.ts:2:2', 'B › two', '5.1s'),
      list('✘', 3, 'c.spec.ts:3:3', 'C › three', '12.0s'),
    ].join('\n')
    expect(repeatingFailure(mixed)).toBeNull()
  })

  it('counts DISTINCT tests, so one test printed twice is one test', () => {
    // A `list` line the log carries twice — a second reporter, or a retried test — is the same
    // test, and two of them are not a cause.
    const twice = [
      list('✘', 1, 'a.spec.ts:11:1', 'A › one', '15.6s'),
      list('✘', 1, 'a.spec.ts:11:1', 'A › one', '15.6s'),
      list('✘', 2, 'b.spec.ts:22:1', 'B › two', '15.6s'),
      list('✘', 2, 'b.spec.ts:22:1', 'B › two', '15.6s'),
    ].join('\n')
    expect(repeatingFailure(twice)).toBeNull()
    // Three DISTINCT tests behind one duration still name the cause — counted once each.
    const three = `${twice}\n${list('✘', 3, 'c.spec.ts:33:1', 'C › three', '15.6s')}\n${list('✘', 3, 'c.spec.ts:33:1', 'C › three', '15.6s')}`
    const found = repeatingFailure(three)
    expect(found!.count).toBe(3)
    expect(found!.tests.map((t) => t.where)).toEqual([
      '../../fixtures/realworld/specs/e2e/a.spec.ts:11',
      '../../fixtures/realworld/specs/e2e/b.spec.ts:22',
      '../../fixtures/realworld/specs/e2e/c.spec.ts:33',
    ])
  })

  /**
   * X1 flash-m83 (2026-10-16): a whole remote run under `--reporter=list,line`, so BOTH reporters
   * printed every failure (and every failure block). Two distinct tests — one of them the brief's
   * own excluded `should require login to post comment` — shared one `TimeoutError`, and the note
   * said "4 of this run’s tests have already failed the same way". The executor stopped the
   * 139-test walk at test 21 with a single cause in hand. Lines below are that run's own log.
   */
  const m83 = (() => {
    const block = (n: number, file: string, line: number, title: string): string =>
      [
        `  ${n}) [chromium] › ../fixtures/realworld/specs/e2e/${file}:${line}:3 › Comments › ${title} `,
        '',
        '    TimeoutError: page.waitForURL: Timeout 10000ms exceeded.',
        '    =========================== logs ===========================',
        '    waiting for navigation until "load"',
        '',
        '       at helpers/articles.ts:27',
      ].join('\n')
    // Each test exactly as the two reporters print it: the `line` reporter's `[n/N]` header and
    // its block as the failure happens, the `list` reporter's result line and its block in the
    // summary at the end.
    const test = (n: number, file: string, line: number, title: string, seconds: string): string =>
      [
        `[${n}/139] [chromium] › ../fixtures/realworld/specs/e2e/${file}:${line}:3 › Comments › ${title}`,
        `[${n}/139] [chromium] › ../fixtures/realworld/specs/e2e/${file}:${line}:3 › Comments › ${title}`,
        list('✘', n, `${file}:${line}:3`, `Comments › ${title}`, seconds),
        block(1, file, line, title),
        block(1, file, line, title),
      ].join('\n')
    return [
      'Running 139 tests using 1 worker',
      test(
        21,
        'comments.spec.ts',
        60,
        'should delete comment when server returns 200 instead of 204',
        '11.9s',
      ),
      test(23, 'comments.spec.ts', 102, 'should require login to post comment', '11.8s'),
    ].join('\n')
  })()

  it('says nothing about two distinct tests however many times the log printed them (flash-m83)', () => {
    expect(repeatingFailure(m83)).toBeNull()
  })

  it('prefers the repeated error MESSAGE when the log carries the failure bodies', () => {
    // A `line` reporter writes each failure's body as it happens — the shape an iterating run is
    // put on so a mid-run look can read the cause itself.
    const block = (n: number, title: string): string =>
      [
        `\u001B[1A\u001B[2K  ${n}) [chromium] › ../../fixtures/realworld/specs/e2e/auth.spec.ts:${n}:3 › Authentication › ${title} ────────`,
        '',
        '    Test timeout of 15000ms exceeded while running "beforeEach" hook.',
        '',
        '      12 |',
        '    > 14 |   test.beforeEach(async ({ page }) => {',
        '        at /workspace/fixtures/realworld/specs/e2e/articles.spec.ts:14:8',
        '',
        '    TimeoutError: page.waitForURL: Timeout 10000ms exceeded.',
        '    =========================== logs ===========================',
        '    waiting for navigation to "/" until "load"',
        '',
        '       at helpers/auth.ts:11',
      ].join('\n')
    const log = [
      block(1, 'should register a new user'),
      block(2, 'should login with an existing user'),
      block(3, 'should fail login with the wrong password'),
    ].join('\n\n')
    const found = repeatingFailure(log)
    expect(found!.count).toBe(3)
    // The signature is the cause, not the line verbatim: the error class, what it waited for, and
    // the timeout normalized (the timeout is the config's, not the cause's — flash-m84).
    expect(found!.message).toBe(
      'TimeoutError: page.waitForURL: Timeout <n> exceeded. — waiting for navigation to "/" until "load"',
    )
    expect(found!.tests[0].where).toBe('../../fixtures/realworld/specs/e2e/auth.spec.ts:1')
  })

  it('reads a background run’s inline failures: one reporter, each error under its own ✘ row (flash-m99)', () => {
    // The shape a background suite's log has since 2026-10-16: ONE reporter (`list`), each failure
    // printed as it fails — the numbered block with its error, locator and values right under that
    // test's `✘` row — so the run names its causes while it walks. The block below is what Playwright
    // 1.63 writes with the inline switch on (captured from a real run of this test name).
    const row = (
      mark: string,
      n: number,
      file: string,
      line: number,
      title: string,
      s: string,
    ): string =>
      `  ${mark}  ${String(n).padStart(3)} [chromium] › specs/e2e/${file}:${line}:7 › Articles › ${title} (${s})`
    const block = (n: number, file: string, line: number, title: string): string =>
      [
        `  ${n}) [chromium] › specs/e2e/${file}:${line}:7 › Articles › ${title} ─────────────────────────`,
        '',
        '    Error: expect(locator).toHaveCount(expected) failed',
        '',
        "    Locator:  locator('.tag-pill')",
        '    Expected: 2',
        '    Received: 0',
        '    Timeout:  5000ms',
        '',
        '    Call log:',
        '      - Expect "toHaveCount" locator(\'.tag-pill\') with timeout 5000ms',
        "      - waiting for locator('.tag-pill')",
        '',
        '    Error Context: test-results/articles/error-context.md',
      ].join('\n')
    const log = [
      'Running 139 tests using 1 worker',
      '',
      row(
        '✘',
        9,
        'articles.spec.ts',
        229,
        'should remove all tags when editing an article',
        '3.7s',
      ),
      block(1, 'articles.spec.ts', 229, 'should remove all tags when editing an article'),
      '',
      row('✓', 10, 'articles.spec.ts', 260, 'should show the article list', '2.1s'),
      row('✘', 11, 'articles.spec.ts', 301, 'should keep tags on reload', '3.6s'),
      block(2, 'articles.spec.ts', 301, 'should keep tags on reload'),
      '',
      row('✘', 12, 'comments.spec.ts', 141, 'should tag a comment', '3.8s'),
      block(3, 'comments.spec.ts', 141, 'should tag a comment'),
    ].join('\n')
    const found = repeatingFailure(log)
    expect(found!.count).toBe(3)
    // The cause is the assertion and its locator — not a duration group, which is all a `list` log
    // with no bodies could offer.
    expect(found!.message).toBe(
      "Error: expect(locator).toHaveCount(expected) failed — waiting for locator('.tag-pill')",
    )
    expect(found!.seconds).toBeNull()
    expect(found!.tests.map((t) => t.where)).toEqual([
      'specs/e2e/articles.spec.ts:229',
      'specs/e2e/articles.spec.ts:301',
      'specs/e2e/comments.spec.ts:141',
    ])
  })

  /** One failure of the m84 runs, as those logs wrote it. */
  interface TestBlock {
    n: number
    line: number
    title: string
    seconds: string
    thrown: string
    waited: string
    at: string
  }

  /**
   * A run under `--reporter=list,line`: the `list` result line for each failure, then its
   * numbered `line` block with its `Call log`, in the shape m84's logs wrote them (the config
   * declares no projects, so the `[chromium] › ` half is absent).
   *
   * @param tests - The failures the run printed.
   * @returns The log.
   */
  const m84Run = (tests: TestBlock[]): string =>
    ['Running 139 tests using 1 worker', '']
      .concat(
        tests.flatMap((t) => [
          // The suite sits OUTSIDE the app, so the path is the one m84's log wrote — the same
          // path the block header below carries, which is what ties a body to its result line.
          `  ✘    ${t.n} ../../specs/specs/e2e/articles.spec.ts:${t.line}:3 › Articles › ${t.title} (${t.seconds})`,
          [
            `  ${t.n}) ../../specs/specs/e2e/articles.spec.ts:${t.line}:3 › Articles › ${t.title} ────────`,
            '',
            `    ${t.thrown}`,
            '    Call log:',
            `      - ${t.waited}`,
            '',
            '',
            `       at ${t.at}`,
            '',
            `    Error Context: test-results/articles-Articles-${t.title.replace(/ /g, '-')}/error-context.md`,
          ].join('\n'),
          '',
        ]),
      )
      .join('\n')

  /**
   * X1 flash-m84 (2026-10-16), the log both halves of the finding were read from:
   * `/tmp/pw-art.log`, the `articles.spec.ts` re-run after the tag fix, four failures at
   * 7.4 / 6.8 / 7.0 / 7.3 s. The `TimeoutError` line and the `waiting for locator(…)` line of
   * each block are the ones the run's own +17:40 grep printed, in that order: four different
   * elements were missing — the editor's button label, the preview's heading, its author, and a
   * generated article title — and the suite's config puts `actionTimeout: 5_000` behind every one
   * of those durations, so all four ran the same length for four different reasons.
   */
  const m84 = m84Run([
    {
      n: 1,
      line: 50,
      title: 'should edit an existing article',
      seconds: '7.4s',
      thrown: 'TimeoutError: page.click: Timeout 5000ms exceeded.',
      waited: `waiting for locator('button:has-text("Publish Article")')`,
      at: 'helpers/articles.ts:27',
    },
    {
      n: 2,
      line: 123,
      title: 'should favorite an article',
      seconds: '6.8s',
      thrown: 'TimeoutError: page.click: Timeout 5000ms exceeded.',
      waited: `waiting for locator('.article-preview h1')`,
      at: 'helpers/articles.ts:41',
    },
    {
      n: 3,
      line: 139,
      title: 'should unfavorite an article',
      seconds: '7s',
      thrown: 'TimeoutError: locator.textContent: Timeout 5000ms exceeded.',
      waited: `waiting for locator('.article-preview').first().locator('.author')`,
      at: 'articles.spec.ts:154',
    },
    {
      n: 4,
      line: 207,
      title: 'should display article preview correctly',
      seconds: '7.3s',
      thrown: 'TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.',
      waited: `waiting for locator('h1:has-text("Test Article 1792164491421")') to be visible`,
      at: 'helpers/articles.ts:58',
    },
  ])

  it('reads m84’s four failures as FOUR causes, whatever duration they shared (flash-m84)', () => {
    const causes = failuresByCause(m84)
    expect(causes).toHaveLength(4)
    expect(causes.map((c) => c.tests.length)).toEqual([1, 1, 1, 1])
    // The two `page.click` timeouts are two causes: their locators differ, and the signature is
    // what differs between causes — the error class plus the locator, with the timeout, which is
    // the config's own number, normalized away.
    expect(causes.map((c) => c.message)).toEqual([
      `TimeoutError: page.click: Timeout <n> exceeded. — waiting for locator('button:has-text("Publish Article")')`,
      `TimeoutError: page.click: Timeout <n> exceeded. — waiting for locator('.article-preview h1')`,
      `TimeoutError: locator.textContent: Timeout <n> exceeded. — waiting for locator('.article-preview').first().locator('.author')`,
      `TimeoutError: page.waitForSelector: Timeout <n> exceeded. — waiting for locator('h1:has-text("Test Article <n>")') to be visible`,
    ])
    expect(failureCausesNote(m84)).toContain('4 failures in this run, grouped by cause')
  })

  it('never calls m84’s four failures one cause for their shared duration (flash-m84)', () => {
    // Before this, the four fell through to the duration arm — 6.8-7.4 s is the 0.5 s band — and
    // the note told the executor "4 different tests … have already failed the same way … so one
    // cause is repeating" about four different elements. A duration the suite's own config
    // produces must never overrule a body the log already carries.
    expect(repeatingFailure(m84)).toBeNull()
  })

  it('still names a cause repeating when the SAME locator times out in three tests (flash-m84)', () => {
    // The true repeat this must keep answering for: one element, three tests, one cause — and the
    // signature says WHICH element, which a duration never could. The durations differ by 0.4 s
    // and the timeouts are the same config value, so nothing here rests on either.
    const repeat = m84Run(
      [50, 123, 139].map((line, i) => ({
        n: i + 1,
        line,
        title: [
          'should edit an existing article',
          'should favorite an article',
          'should unfavorite an article',
        ][i]!,
        seconds: ['7.4s', '6.8s', '7.2s'][i]!,
        thrown: 'TimeoutError: page.click: Timeout 5000ms exceeded.',
        waited: `waiting for locator('button:has-text("Publish Article")')`,
        at: 'helpers/articles.ts:27',
      })),
    )
    const found = repeatingFailure(repeat)!
    expect(found.count).toBe(3)
    // A message cause, not a duration one: the count rests on the signature, not on how long the
    // three took.
    expect(found.seconds).toBeNull()
    expect(found.message).toBe(
      `TimeoutError: page.click: Timeout <n> exceeded. — waiting for locator('button:has-text("Publish Article")')`,
    )
    expect(failuresByCause(repeat)).toHaveLength(1)
    // And the note names the shared cause, with the stop still withheld: one file is not the run.
    const note = repeatingFailureNote(found, {
      taskId: 'mol-bg-mvb4g3dq-2erprb',
      log: '/tmp/pw-art.log',
      stop: 'kill 1 2',
      universal: universalCause(repeat, found),
    })
    expect(note).toContain('3 different tests in this run have already failed the same way')
    expect(note).toContain(`every one with \`${found.message}\``)
    expect(note).not.toContain('exec_command')
  })

  /**
   * X1 flash-m83's local loop, 2026-10-16: `+16:21 → +30:51 (8 runs, each stopped at the first
   * repeating cause; no local whole run ever finished)`. Three of the run's tests share one
   * duration inside ONE file while another file fails differently — the shape that must NOT be
   * answered with a stop.
   */
  const oneFileInsideArticles = [
    'Running 139 tests using 1 worker',
    list('✘', 1, 'articles.spec.ts:32:3', 'Articles › should create a new article', '15.6s'),
    list('✘', 2, 'articles.spec.ts:50:3', 'Articles › should edit an existing article', '15.6s'),
    list('✘', 3, 'articles.spec.ts:71:3', 'Articles › should delete an article', '15.6s'),
    list('✘', 4, 'auth.spec.ts:12:3', 'Authentication › should log in', '2.4s'),
  ].join('\n')

  /**
   * The other m83 shape: the app is not answering, so every test the run walked — four files —
   * failed on the same `connect ECONNREFUSED`, with nothing passing between them.
   */
  const refusedEverywhere = (() => {
    const block = (n: number, file: string, line: number, title: string): string =>
      [
        `  ${n}) [chromium] › ../fixtures/realworld/specs/e2e/${file}:${line}:3 › ${title} ────────`,
        '',
        '    Error: connect ECONNREFUSED 127.0.0.1:4000',
        '',
        '       at helpers/request.ts:9',
      ].join('\n')
    const test = (n: number, file: string, line: number, title: string, seconds: string): string =>
      [list('✘', n, `${file}:${line}:3`, title, seconds), block(n, file, line, title)].join('\n')
    return [
      'Running 139 tests using 1 worker',
      test(1, 'articles.spec.ts', 32, 'Articles › should create a new article', '2.1s'),
      test(2, 'auth.spec.ts', 12, 'Authentication › should log in', '1.9s'),
      test(3, 'comments.spec.ts', 60, 'Comments › should delete a comment', '2.0s'),
      test(4, 'tags.spec.ts', 12, 'Tags › shows the pill', '2.2s'),
    ].join('\n')
  })()

  it('names the cause and says to let the run finish, with no stop command (flash-m83)', () => {
    const found = repeatingFailure(oneFileInsideArticles)!
    const note = repeatingFailureNote(found, {
      taskId: 'mol-bg-mvax0rgp-63okfo',
      log: '/tmp/mol-bg-mvax0rgp-63okfo.log',
      stop: '',
      universal: universalCause(oneFileInsideArticles, found),
    })
    // "different tests": the count is of DISTINCT tests, never of log lines (flash-m83).
    expect(note).toContain('3 different tests in this run each failed after ~15.6s')
    // …and it is NOT called one cause: this log is `list`-only, so the duration is all it carries,
    // and a shared duration is what the suite's own timeout produces (flash-m84).
    expect(note).toContain('A shared duration is a lead, not a cause')
    // The row names the test by the path the RUN wrote — the same one the reproduce hint
    // uses (flash-m82: a suite-relative form here, `fixtures/realworld/specs/e2e/…` three
    // lines below, and the run read the short one as the app's own stale starter spec).
    expect(note).toContain(
      '✘ ../../fixtures/realworld/specs/e2e/articles.spec.ts:32 › should create a new article (15.6s)',
    )
    // What is named mid-run so the model can start on it — and the run keeps walking.
    expect(note).toContain('Start on them now, while the run keeps walking')
    expect(note).toContain('Let the rest of the run finish')
    expect(note).toContain('it is the only thing that will name the causes that are NOT this one')
    // And it is told NOT to stop: this cause is one file, and `auth.spec.ts` still has a cause.
    expect(note).not.toContain('exec_command')
    expect(note).not.toContain('Stop it and fix')
  })

  /**
   * xr-molecule-flash-m89's own log at +19:59 (read out of the run's chat dump): three
   * `null-fields.spec.ts` tests, each ~6.6 s, in a `list` log that carries durations and no error
   * bodies — and the command the run was started with, as the platform ran it.
   */
  const m89Log = [
    'Running 139 tests using 1 worker',
    list('✓', 1, 'articles.spec.ts:32:3', 'Articles › should create a new article', '2.3s'),
    list(
      '✘',
      4,
      'null-fields.spec.ts:53:3',
      'newly registered user should show default avatar in comment section',
      '6.7s',
    ),
    list(
      '✘',
      5,
      'null-fields.spec.ts:107:3',
      'null bio should not render as literal "null" on profile page',
      '6.4s',
    ),
    list(
      '✘',
      6,
      'null-fields.spec.ts:152:3',
      'author avatars should render on other user articles in feed',
      '6.8s',
    ),
  ].join('\n')

  const m89Run = {
    command:
      'cd /workspace/.mol-scratch/e2e && TEST_MODE=fullstack BASE_URL=http://localhost:5173 ' +
      'npx --no-install playwright test --max-failures=15 --config=playwright.config.ts ' +
      '--reporter=list --retries=0',
    cwd: '/workspace',
  }

  const m89Note = (over: { run?: { command: string; cwd?: string } }): string =>
    repeatingFailureNote(repeatingFailure(m89Log)!, {
      taskId: 'mol-bg-mvbc3t11-ojf6js',
      log: '/tmp/mol-bg-mvbc3t11-ojf6js.log',
      stop: '',
      universal: universalCause(m89Log, repeatingFailure(m89Log)!),
      ...over,
    })

  it('names the re-run for AFTER the run ends, never one for now (xr-molecule-flash-m89)', () => {
    const note = m89Note({ run: m89Run })
    // The shape that cost the round trip: a bare path, offered for now. The executor built the
    // re-run from it 23 s later and the overlap hold refused exactly that command —
    // "A playwright suite is already running against this app and database … Wait for it."
    expect(note).not.toContain('reproduces the first one')
    // What the note hands over for NOW is the read and the fix…
    expect(note).toContain('Read `../../fixtures/realworld/specs/e2e/null-fields.spec.ts:53`')
    expect(note).toContain('nothing may run against this app while the run walks')
    expect(note).toContain('a second run against the same app and database is refused')
    expect(note).toContain('run it alone once the run has ended')
    // …and for AFTER the run, the exact re-run: the log's own `file:line`, the run's own
    // invocation, and the directory it started in, so the path resolves against the suite it was
    // printed from rather than against whatever directory the next command starts in.
    expect(note).toContain('Send this once the run ends:')
    expect(note).toContain(
      '\n  cd /workspace/.mol-scratch/e2e && TEST_MODE=fullstack BASE_URL=http://localhost:5173 ' +
        'npx --no-install playwright test ../../fixtures/realworld/specs/e2e/null-fields.spec.ts:53 ' +
        '--retries=0 --max-failures=15 --config=playwright.config.ts --reporter=list',
    )
    // Never the whole-suite command back: that is the run the executor must not repeat (flash-m83
    // stopped eight runs at their first repeating cause over 14.5 minutes).
    expect(note).not.toContain('playwright test --max-failures=15 --config')
  })

  it('defers the re-run with the timing alone when the run was not recorded', () => {
    // A run this caller did not see start (a restart between the launch and the wait) leaves no
    // command to narrow. The timing is what the note knows for certain, and it is the half that
    // cost m89 the round trip: no wording of this note offers a run for now.
    const note = m89Note({})
    expect(note).not.toContain('reproduces the first one')
    expect(note).toContain('Read `../../fixtures/realworld/specs/e2e/null-fields.spec.ts:53`')
    expect(note).toContain('nothing may run against this app while the run walks')
    expect(note).toContain('run it alone once the run has ended')
    expect(note).not.toContain('Send this once the run ends')
  })

  it('prints every failure by the SAME path as its own re-run hint (flash-m82)', () => {
    // X1 flash-m82 (+41:52): the note listed `✘ e2e/auth.spec.ts:19 › should login with
    // existing user` while its own hint three lines down said `Re-run
    // fixtures/realworld/specs/e2e/auth.spec.ts:19 alone`. The run read the short form as
    // "the project's own stale starter spec" — a path that does not exist in the suite —
    // rewrote its Playwright config, deleted the app's tests and wrote its own: four
    // minutes of a 60-minute run, on a config that was right. One file, one name.
    const log = [
      'Running 139 tests using 1 worker',
      '',
      '  1) [chromium] › fixtures/realworld/specs/e2e/auth.spec.ts:19:3 › Authentication › should login ────────',
      '',
      '    TimeoutError: page.waitForURL: Timeout 10000ms exceeded.',
      '',
      '       at helpers/auth.ts:11',
      '',
      '  2) [chromium] › fixtures/realworld/specs/e2e/auth.spec.ts:27:3 › Authentication › should sign up ────────',
      '',
      '    TimeoutError: page.waitForURL: Timeout 10000ms exceeded.',
      '',
      '       at helpers/auth.ts:11',
      '',
      '  3) [chromium] › fixtures/realworld/specs/e2e/auth.spec.ts:35:3 › Authentication › should log out ────────',
      '',
      '    TimeoutError: page.waitForURL: Timeout 10000ms exceeded.',
      '',
      '       at helpers/auth.ts:11',
    ].join('\n')
    const found = repeatingFailure(log)!
    const note = repeatingFailureNote(found, {
      taskId: 'mol-bg-mvb3cv1n-1kfydl',
      log: '/tmp/mol-bg-mvb3cv1n-1kfydl.log',
      stop: '',
    })

    const hint = /Read `([^`]+)` and the code it drives now/.exec(note)?.[1]
    expect(hint).toBe('fixtures/realworld/specs/e2e/auth.spec.ts:19')
    // Every row names its test by exactly the path the hint names: same file, same name.
    const hintFile = hint!.replace(/:\d+$/, '')
    for (const test of found.tests) {
      expect(note).toContain(`✘ ${test.where} › ${test.title}`)
      expect(test.where.replace(/:\d+$/, '')).toBe(hintFile)
    }
    // …and none of them is the suite-relative form the run mistook for an app file.
    expect(note).not.toContain('✘ e2e/')
  })

  it('reads a cause confined to one file as NOT failing the whole run', () => {
    const found = repeatingFailure(oneFileInsideArticles)!
    expect(universalCause(oneFileInsideArticles, found)).toBeNull()
  })

  it('reads every test of four files failing on one connection error as the whole run', () => {
    const found = repeatingFailure(refusedEverywhere)!
    // The port is normalized: which port the app was not listening on is a fact about the run's
    // environment, not about the cause (flash-m84 normalizes the values that vary between runs).
    expect(found.message).toBe('Error: connect ECONNREFUSED 127.0.0.1:<n>')
    expect(found.count).toBe(4)
    const universal = universalCause(refusedEverywhere, found)!
    expect(universal.count).toBe(4)
    expect(universal.files.map((f) => f.split('/').pop())).toEqual([
      'articles.spec.ts',
      'auth.spec.ts',
      'comments.spec.ts',
      'tags.spec.ts',
    ])
    const note = repeatingFailureNote(found, {
      taskId: 'mol-bg-mvax0rgp-63okfo',
      log: '/tmp/mol-bg-mvax0rgp-63okfo.log',
      stop: 'kill 412 419',
      universal,
    })
    expect(note).toContain('Every test this run has walked so far has failed the same way')
    expect(note).toContain('across 4 files')
    expect(note).toContain('with nothing passing since the first')
    // Why: the rest of the walk can only repeat this one cause.
    expect(note).toContain('Every remaining test will fail the same way too')
    expect(note).toContain('exec_command: kill 412 419')
  })

  it('does not call a run broken when a test passed after the first failure', () => {
    // The app answered a request, so the remaining failures have a reason this run has not seen.
    const withPass = [
      oneFileInsideArticles,
      list('✓', 5, 'auth.spec.ts:20:3', 'Authentication › should log out', '0.9s'),
      list('✘', 6, 'tags.spec.ts:12:3', 'Tags › shows the pill', '15.6s'),
    ].join('\n')
    const found = repeatingFailure(withPass)!
    expect(found.count).toBeGreaterThanOrEqual(3)
    expect(universalCause(withPass, found)).toBeNull()
  })

  /**
   * xr-molecule-flash-m99's own shape at +43:23, run out to the three files {@link universalCause}
   * asks for: three tests, one `TimeoutError` each after ~16.2 s — the suite's own
   * `timeout: 15_000` plus teardown — nothing passing, nothing else failing, and no error body
   * anywhere in the `list` log. By files, by count and by the pass rule this IS the whole run.
   */
  const m99Timeouts = [
    'Running 24 tests using 1 worker',
    list('✘', 3, 'auth.spec.ts:12:3', 'Authentication › should log in', '16.1s'),
    list('✘', 7, 'articles.spec.ts:32:3', 'Articles › should create an article', '16.2s'),
    list('✘', 14, 'url-navigation.spec.ts:111:3', 'URL navigation › back button', '16.4s'),
  ].join('\n')

  describe('earlyReturnCause', () => {
    it('is null for a shared duration, however whole the run looks (xr-molecule-flash-m99)', () => {
      const found = repeatingFailure(m99Timeouts)!
      // The duration arm, not the message arm: the log carries no error for any of the three.
      expect(found.message).toBeNull()
      expect(found.count).toBe(3)
      // Every other clause of "failing the whole run" holds — which is exactly why the guard has
      // to be here. A suite whose config sets a timeout spends it on every failure that waits for
      // anything, so three unrelated tests timing out together is a LEAD, and the wait that ended
      // on it twice in m99 cost the run a result both times.
      const universal = universalCause(m99Timeouts, found)!
      expect(universal.files).toHaveLength(3)
      expect(earlyReturnCause(found, universal)).toBeNull()
    })

    it('is null for a proven cause that is NOT failing the whole run (flash-m83)', () => {
      // Three tests, one error VERBATIM, and all three in ONE file: the run still has other
      // causes to name, and X1 flash-m83 lost eight runs to stopping at exactly this.
      const oneFileWithBodies = [
        'Running 139 tests using 1 worker',
        ...[1, 2, 3].map((n) =>
          [
            `  ${n}) [chromium] › ../../fixtures/realworld/specs/e2e/articles.spec.ts:${20 + n}:3 › Articles › test ${n} ────────`,
            '',
            `    TimeoutError: page.click: Timeout 5000ms exceeded.`,
            `    waiting for locator('button:has-text("Publish Article")')`,
            '',
            `       at helpers/articles.ts:27`,
          ].join('\n'),
        ),
      ].join('\n')
      const found = repeatingFailure(oneFileWithBodies)!
      expect(found.message).not.toBeNull()
      expect(earlyReturnCause(found, universalCause(oneFileWithBodies, found))).toBeNull()
    })

    it('is the cause for a proven error failing every test of the run (flash-m83)', () => {
      const found = repeatingFailure(refusedEverywhere)!
      const universal = universalCause(refusedEverywhere, found)!
      expect(earlyReturnCause(found, universal)).toBe(universal)
    })

    it('keeps a stop command out of the note for a lead, whatever the caller passes (m99)', () => {
      // The note's wording is decided by the SAME predicate, so a caller holding a pid list — the
      // platform's own log poll does (`suite-fail-fast.ts`) — cannot talk a lead into a stop.
      const found = repeatingFailure(m99Timeouts)!
      const note = repeatingFailureNote(found, {
        taskId: 'mol-bg-m99to-abc130',
        log: '/tmp/mol-bg-m99to-abc130.log',
        stop: 'kill 412 419',
        universal: universalCause(m99Timeouts, found),
      })
      expect(note).toContain('3 different tests in this run each failed after ~16.2s')
      expect(note).toContain('A shared duration is a lead, not a cause')
      expect(note).toContain('Let the rest of the run finish')
      expect(note).not.toContain('Stop it and fix')
      expect(note).not.toContain('kill 412 419')
      expect(note).not.toContain('Every remaining test will fail the same way too')
    })
  })

  describe('failuresByCause', () => {
    /**
     * A finished run (X1 flash-m83's shape): one `TimeoutError` hit three tests in two files,
     * a class assertion hit one — the report prints four bodies with nothing saying which share
     * a cause, and the run's own `3 failed` tally is all it says.
     */
    const finished = [
      'Running 139 tests using 1 worker',
      '',
      '  1) [chromium] › ../fixtures/realworld/specs/e2e/articles.spec.ts:32:3 › Articles › should create ────────',
      '',
      '    TimeoutError: page.waitForURL: Timeout 10000ms exceeded.',
      '',
      '       at helpers/auth.ts:11',
      '',
      '  2) [chromium] › ../fixtures/realworld/specs/e2e/articles.spec.ts:50:3 › Articles › should edit ────────',
      '',
      '    TimeoutError: page.waitForURL: Timeout 10000ms exceeded.',
      '',
      '       at helpers/auth.ts:11',
      '',
      '  3) [chromium] › ../fixtures/realworld/specs/e2e/auth.spec.ts:78:3 › Authentication › should sign up ────────',
      '',
      '    TimeoutError: page.waitForURL: Timeout 10000ms exceeded.',
      '',
      '       at helpers/auth.ts:11',
      '',
      '  4) [chromium] › ../fixtures/realworld/specs/e2e/tags.spec.ts:12:3 › Tags › shows the pill ────────',
      '',
      '    Expected class "active" but got ""',
      '',
      '  3 failed',
      '  136 passed',
    ].join('\n')

    it('groups every failure by the cause behind it, most tests first', () => {
      const causes = failuresByCause(finished)
      expect(causes.map((c) => c.tests.length)).toEqual([3, 1])
      // The signature, not the line verbatim: the timeout is the config's own number (flash-m84).
      expect(causes[0].message).toBe('TimeoutError: page.waitForURL: Timeout <n> exceeded.')
      expect(causes[0].tests.map((t) => t.title)).toEqual([
        'should create',
        'should edit',
        'should sign up',
      ])
      expect(causes[1].message).toBe('Expected class "active" but got ""')
      expect(causes[1].tests[0].title).toBe('shows the pill')
    })

    it('summarizes a finished run as one line per cause, so one round fixes them all', () => {
      const note = failureCausesNote(finished)!
      expect(note).toContain('4 failures in this run, grouped by cause')
      expect(note).toContain('fix every cause below before the next deploy')
      expect(note).toContain(
        '1. `TimeoutError: page.waitForURL: Timeout <n> exceeded.` — 3 tests in 2 files',
      )
      // The path the log itself wrote, so it can be pasted into a re-run (flash-m82).
      expect(note).toContain(
        '../fixtures/realworld/specs/e2e/articles.spec.ts:32, ' +
          '../fixtures/realworld/specs/e2e/articles.spec.ts:50, ' +
          '../fixtures/realworld/specs/e2e/auth.spec.ts:78',
      )
      expect(note).toContain('2. `Expected class "active" but got ""` — 1 test in 1 file')
    })

    it('counts a test printed twice by two reporters once (flash-m83)', () => {
      // `--reporter=list,line` printed every failure twice: same location, same title, one test.
      const print = (n: number): string =>
        [
          `  ${n}) [chromium] › ../fixtures/realworld/specs/e2e/tags.spec.ts:12:3 › Tags › shows the pill ────────`,
          '',
          '    Expected class "active" but got ""',
        ].join('\n')
      const twice = [print(1), print(2)].join('\n\n')
      expect(failuresByCause(twice).map((c) => c.tests.length)).toEqual([1])
      expect(failureCausesNote(twice)).toBeNull()
    })

    it('says nothing for a run that named fewer than two failures', () => {
      expect(failureCausesNote('  1 passed\n')).toBeNull()
      expect(failureCausesNote(finished.split('\n').slice(0, 9).join('\n'))).toBeNull()
    })

    /**
     * xr-molecule-flash-m101's +12:00 `wait_for_task` result, verbatim: 3 failures, one of them
     * the test the request carves out (`except "should require login to post comment"`).
     */
    const m101 = [
      'Running 139 tests using 1 worker',
      '',
      '  1) [chromium] › comments.spec.ts:102:3 › Comments › should require login to post comment ─────────',
      '',
      '    Error: expect(locator).toBeVisible() failed',
      '',
      '    Locator: locator(\'a[href="/login"]\')',
      '    Expected: visible',
      '    Error: strict mode violation: locator(\'a[href="/login"]\') resolved to 2 elements:',
      '',
      '  2) [chromium] › navigation.spec.ts:200:3 › Navigation and Filtering › should show article count on profile tabs ',
      '',
      '    TimeoutError: page.click: Timeout 5000ms exceeded.',
      '    Call log:',
      '      - waiting for locator(\'a:has-text("Favorited")\')',
      '',
      '  3) [chromium] › social.spec.ts:115:3 › Social Features › should display favorited articles on profile ',
      '',
      '    TimeoutError: page.waitForSelector: Timeout 3000ms exceeded.',
      '    Call log:',
      '      - waiting for locator(\'a:has-text("Favorited")\') to be visible',
      '',
      '  3 failed',
      '  65 skipped',
      '  71 passed (4.1m)',
    ].join('\n')
    const excluded = ['should require login to post comment']

    it('drops a failure the request excludes, recounts, and says which one it ignored', () => {
      expect(failureCausesNote(m101)).toContain('3 failures in this run')
      const causes = failuresByCause(m101, excluded)
      expect(causes.flatMap((c) => c.tests.map((t) => t.title))).toEqual([
        'should show article count on profile tabs',
        'should display favorited articles on profile',
      ])
      const note = failureCausesNote(m101, excluded)!
      expect(note).toContain('2 failures in this run, grouped by cause')
      // The excluded test is not a cause the executor is told to fix...
      expect(note).not.toContain('expect(locator).toBeVisible()')
      expect(note).toContain('1. `TimeoutError: page.click: Timeout <n> exceeded.')
      // ...and it is named once, at the end, as ignored.
      expect(
        note.endsWith('Ignored (excluded by the request): should require login to post comment.'),
      ).toBe(true)
    })

    it('hands over the narrowed re-run of the surviving failures, with the exclusion inverted out', () => {
      const command =
        'cd /workspace/fixtures/realworld/specs/e2e && TEST_MODE=fullstack baseURL=http://localhost:5173 ' +
        'npx --prefix /workspace/my-app/app playwright test --config playwright.run.config.ts --reporter=list 2>&1'
      const note = failureCausesNote(m101, excluded, { command })!
      expect(note).toContain('Re-run just these once they are fixed: `')
      expect(note).toContain(
        'playwright test navigation.spec.ts:200 social.spec.ts:115 --retries=0 ' +
          "--grep-invert 'should require login to post comment'",
      )
      // The excluded test's own location is not in the re-run.
      expect(note).not.toContain('comments.spec.ts:102')
      // No run record, no re-run: the note stays the plain cause list.
      expect(failureCausesNote(m101, excluded)).not.toContain('Re-run just these')
    })

    it('matches an excluded title by containment, ignoring case and wrapped whitespace', () => {
      expect(matchingExcludedTitles('should require login to post comment', excluded)).toEqual(
        excluded,
      )
      expect(
        matchingExcludedTitles('Comments › Should Require Login\n  to Post Comment', excluded),
      ).toEqual(excluded)
      expect(matchingExcludedTitles('should require login', excluded)).toEqual([])
      expect(matchingExcludedTitles('anything', [])).toEqual([])
    })

    /**
     * xr-molecule-flash-m105's deployed proof run in the shape the runner prints with the suite's
     * own `retries: 1`: one test failed its first attempt and passed on the retry, so Playwright
     * prints a failure block for the first attempt AND declares the test under `  1 flaky`.
     */
    const flakyRun = [
      'Running 3 tests using 1 worker',
      '',
      '  ✘  1 [chromium] › comments.spec.ts:116:3 › Comments › should post a comment (20.5s)',
      '  ✓  1 [chromium] › comments.spec.ts:116:3 › Comments › should post a comment (retry #1) (3.2s)',
      '',
      '  1) [chromium] › comments.spec.ts:116:3 › Comments › should post a comment ────────',
      '',
      '    TimeoutError: page.waitForURL: Timeout 20000ms exceeded.',
      '',
      '  2) [chromium] › navigation.spec.ts:200:3 › Navigation › should show article count ─────',
      '',
      '    Expected class "active" but got ""',
      '',
      '  3) [chromium] › social.spec.ts:115:3 › Social › should favorite ─────',
      '',
      '    Expected class "active" but got ""',
      '',
      '  1 flaky',
      '    [chromium] › comments.spec.ts:116:3 › Comments › should post a comment ─────────',
      '  2 failed',
      '  1 passed (4.1m)',
    ].join('\n')

    it('does not count a test the tally declared flaky as a cause to fix (xr-molecule-flash-m105)', () => {
      const causes = failuresByCause(flakyRun)
      expect(causes).toHaveLength(1)
      expect(causes[0].tests.map((t) => t.title)).toEqual([
        'should show article count',
        'should favorite',
      ])
      // The flaky test's FIRST-attempt block carries an error of its own: it must not become one,
      // and its `✘` row must not come back as a shared-duration cause either.
      expect(causes.some((c) => (c.message ?? '').includes('TimeoutError'))).toBe(false)
      expect(causes.flatMap((c) => c.tests.map((t) => t.where))).not.toContain(
        'comments.spec.ts:116',
      )
    })

    it('names a flaky test apart from the causes, as the tally called it', () => {
      const note = failureCausesNote(flakyRun)!
      expect(note).toContain('2 failures in this run, grouped by cause')
      expect(note).not.toContain('TimeoutError')
      expect(note).toContain(
        'Flaky (failed once, passed on the config retry — the runner counts these as flaky, not ' +
          'as failures): comments.spec.ts:116.',
      )
    })

    /**
     * xr-molecule-flash-m102's +12:43 `wait_for_task` result, in its real shape: `12 failures`
     * and 8 causes, a note that listed 5 and said "… and 3 more causes", and a stdout whose
     * middle 35 628 characters the tool-result cut had removed. The four causes past the old cap
     * (`navigation.spec.ts:200`, `url-navigation.spec.ts:39` and `:234`, `social.spec.ts:115`)
     * cost the run four `grep -A` round trips (≈25 s) before its first fix.
     */
    const m102 = ((): string => {
      const block = (n: number, where: string, title: string, body: string[]): string =>
        [
          `  ${n}) [chromium] › ../../fixtures/realworld/specs/e2e/${where} › ${title} `,
          '',
          ...body,
        ].join('\n')
      const unfavorite = [
        '    TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.',
        '    Call log:',
        '      - waiting for locator(\'button.btn-primary:has-text("Unfavorite")\') to be visible',
      ]
      const pageUrl = (expected: string, received: string): string[] => [
        '    Error: expect(page).toHaveURL(expected) failed',
        '',
        `    Expected: "${expected}"`,
        `    Received: "${received}"`,
      ]
      return [
        'Running 139 tests using 1 worker',
        '',
        block(1, 'articles.spec.ts:123:3', 'Articles › should favorite an article', unfavorite),
        block(2, 'articles.spec.ts:139:3', 'Articles › should unfavorite an article', unfavorite),
        block(
          3,
          'social.spec.ts:115:3',
          'Social Features › should display favorited articles on profile',
          unfavorite,
        ),
        block(
          4,
          'url-navigation.spec.ts:111:3',
          'Pagination › pagination should update URL with ?page=N',
          pageUrl('http://localhost:5173/?page=2', 'http://localhost:5173/'),
        ),
        block(
          5,
          'url-navigation.spec.ts:182:3',
          'Pagination › pagination should work with /tag/:tag',
          pageUrl(
            'http://localhost:5173/tag/technology?page=2',
            'http://localhost:5173/tag/technology',
          ),
        ),
        block(
          6,
          'url-navigation.spec.ts:206:3',
          'Pagination › page should reset when switching feeds',
          pageUrl('http://localhost:5173/?page=1', 'http://localhost:5173/?page=3'),
        ),
        block(
          7,
          'auth.spec.ts:72:3',
          'Authentication › should prevent accessing editor when not logged in',
          [
            '    Error: expect(page).not.toHaveURL(expected) failed',
            '',
            '    Expected: not "http://localhost:5173/editor"',
            '    Received: "http://localhost:5173/editor"',
          ],
        ),
        block(8, 'comments.spec.ts:102:3', 'Comments › should require login to post comment', [
          '    Error: expect(locator).toBeVisible() failed',
          '',
          '    Locator: locator(\'a[href="/login"]\')',
          '    Expected: visible',
          '    Error: strict mode violation: locator(\'a[href="/login"]\') resolved to 2 elements:',
          '',
          '    Call log:',
          '      - waiting for locator(\'a[href="/login"]\')',
        ]),
        block(9, 'navigation.spec.ts:63:3', 'Navigation and Filtering › should filter by tag', [
          '    Error: expect(locator).toBeVisible() failed',
          '',
          '    Locator: locator(\'.nav-link:has-text("playwright-test")\')',
          '    Expected: visible',
          '',
          '    Call log:',
          '      - waiting for locator(\'.nav-link:has-text("playwright-test")\')',
        ]),
        block(
          10,
          'navigation.spec.ts:200:3',
          'Navigation and Filtering › should show article count on profile tabs',
          [
            '    Error: expect(locator).toHaveCount(expected) failed',
            '',
            "    Locator:  locator('.article-preview')",
            '    Expected: 1',
            '    Received: 0',
            '    Timeout:  5000ms',
            '',
            '    Call log:',
            '      - Expect "toHaveCount" locator(\'.article-preview\') with timeout 5000ms',
            "      - waiting for locator('.article-preview')",
          ],
        ),
        block(
          11,
          'url-navigation.spec.ts:39:3',
          'URL-based Navigation › /tag/:tag should filter by tag',
          [
            '    Error: expect(page).toHaveURL(expected) failed',
            '',
            '    Expected: "http://localhost:5173/tag/technology"',
            '    Received: "http://localhost:5173/"',
            '',
            '    Call log:',
            '      - waiting for navigation until "load"',
          ],
        ),
        block(
          12,
          'url-navigation.spec.ts:234:3',
          'Pagination › tag pagination shows correct articles per page',
          [
            '    Error: expect(locator).toHaveCount(expected) failed',
            '',
            "    Locator:  locator('.pagination .page-item')",
            '    Expected: 10',
            '    Received: 4',
          ],
        ),
        '',
        '  12 failed',
        '  65 skipped',
        '  62 passed (4.4m)',
      ].join('\n')
    })()

    it('lists EVERY cause the result has room for, each with its own body lines (m102)', () => {
      const note = failureCausesNote(m102)!
      expect(note).toContain('12 failures in this run, grouped by cause')
      // 8 causes, not the old 5: the recap is the part of the result the tool-output cut keeps.
      expect(note.split('\n').filter((l) => /^ {2}\d+\. /.test(l))).toHaveLength(8)
      expect(note).not.toContain('more causes')
      // The values the normalised signature drops (`Expected:` / `Received:`), on the cause line.
      expect(note).toContain('     Expected: 1 · Received: 0')
      expect(note).toContain(
        '     Expected: "http://localhost:5173/tag/technology" · Received: "http://localhost:5173/"',
      )
      expect(note).toContain(
        '     Expected: not "http://localhost:5173/editor" · Received: "http://localhost:5173/editor"',
      )
      // The locator from the Call log, and the line that explains the failure below the error.
      expect(note).toContain(
        '     Locator: locator(\'a[href="/login"]\') · Error: strict mode violation:',
      )
      // The causes the old cap withheld are named with the path the log wrote, not shortened.
      for (const where of [
        'specs/e2e/navigation.spec.ts:200',
        'specs/e2e/url-navigation.spec.ts:39',
        'specs/e2e/url-navigation.spec.ts:234',
      ])
        expect(note).toContain(`../../fixtures/realworld/${where}`)
      // The note must itself survive the platform's tool-result cut whole.
      expect(note.length).toBeLessThanOrEqual(TOOL_RESULT_CHARS)
    })

    it('names the causes it had to leave out, and the ONE command that prints their bodies', () => {
      // 13 causes of one test each: the readability bound (12) is what withholds the last.
      const many = Array.from({ length: 13 }, (_, i) =>
        [
          `  ${i + 1}) [chromium] › ../../fixtures/realworld/specs/e2e/tags.spec.ts:${10 + i}:3 › Tags › case ${i} `,
          '',
          `    Expected class "active-${i}" but got ""`,
        ].join('\n'),
      ).join('\n')
      const note = failureCausesNote(many, [], {
        command: 'npx playwright test --config e2e-suite.config.ts --reporter=line',
        log: '/tmp/mol-bg-m102.log',
      })!
      expect(note.split('\n').filter((l) => /^ {2}\d+\. /.test(l))).toHaveLength(12)
      expect(note).toContain(
        '… and 1 more cause: ../../fixtures/realworld/specs/e2e/tags.spec.ts:22',
      )
      expect(note).toContain('their bodies are past the part of this result the cut keeps.')
      expect(note).toContain(
        "Print them: `grep -n -A 40 -e '../../fixtures/realworld/specs/e2e/tags.spec.ts:22' '/tmp/mol-bg-m102.log'`",
      )
      expect(note.length).toBeLessThanOrEqual(TOOL_RESULT_CHARS)
    })
  })

  it('names the error message in the note when the log carried one', () => {
    const found: RepeatingFailure = {
      count: 4,
      message: 'TimeoutError: page.waitForURL: Timeout 10000ms exceeded.',
      seconds: null,
      tests: [{ where: 'specs/e2e/auth.spec.ts:7', title: 'should register', seconds: null }],
    }
    const note = repeatingFailureNote(found, {
      taskId: 'mol-bg-x-y',
      log: '/tmp/mol-bg-x-y.log',
      stop: 'kill 9',
    })
    expect(note).toContain(
      'every one with `TimeoutError: page.waitForURL: Timeout 10000ms exceeded.`',
    )
    // The test's own location, named for after the run ends — the error text of a `list` log only
    // arrives with the run (or with a re-run of it), and the run is still walking.
    expect(note).toContain('Read `specs/e2e/auth.spec.ts:7` and the code it drives now')
  })
})

describe('suiteRunPriorityLaunch', () => {
  const LAUNCH = 'sh /tmp/mol-bg-1.sh > /tmp/mol-bg-1.log 2>&1; echo $? > /tmp/mol-bg-1.exit'

  it('lowers a background suite run in CPU and IO priority (flash-m75)', () => {
    // flash-m75: a backgrounded 139-test Playwright run saturated the sandbox, and
    // the two-word command the executor sent next returned nothing for 2 min 40 s.
    const r = suiteRunPriorityLaunch('cd e2e && npx playwright test --retries=1', LAUNCH)
    // Each tool is PROBED BY RUNNING IT: an `ioprio_set` a container's seccomp policy
    // refuses is invisible to `command -v`, which would leave the run failing on a
    // probe that lied. The probes are independent, so one missing tool still lowers.
    expect(r.launch.startsWith("p=''")).toBe(true)
    expect(r.launch).toContain("nice -n 10 true >/dev/null 2>&1 && p='nice -n 10'")
    expect(r.launch).toContain('ionice -c3 true >/dev/null 2>&1 && p="$p ionice -c3"')
    // `$p` unquoted: it expands to the prefix words, or to nothing at all — the run
    // keeps the exit code its `.exit` file is written from either way.
    expect(r.launch.endsWith(`$p ${LAUNCH}`)).toBe(true)
    expect(r.note).toContain('lower CPU and IO priority')
  })

  it('covers Playwright, Vitest and Hurl however they are invoked', () => {
    for (const command of [
      'npx playwright test',
      'playwright test --reporter=list',
      'cd spec && node_modules/.bin/playwright test specs/auth.spec.ts',
      'vitest',
      'npx vitest run',
      'hurl --test --variable host=http://localhost:4000 api/*.hurl',
      '/usr/local/bin/hurl auth.hurl',
    ]) {
      expect(isSuiteRunCommand(command), command).toBe(true)
      expect(suiteRunPriorityLaunch(command, LAUNCH).launch, command).toContain('nice -n 10')
    }
  })

  it('does not lower a runner that only prints (flash-m79)', () => {
    // The priority note promises the suite "may take a little longer": a `--list` that takes two
    // seconds is not a suite run, and neither is a report, a browser install or a help screen.
    for (const command of [
      'npx playwright test --list',
      'npx playwright test --help',
      'npx playwright show-report',
      'npx playwright install chromium',
      'npx vitest list',
      'npx vitest --list',
      'hurl --help',
    ]) {
      expect(isSuiteRunCommand(command), command).toBe(false)
      expect(suiteRunPriorityLaunch(command, LAUNCH), command).toEqual({ launch: LAUNCH, note: '' })
    }
    // A real run in the same command is still lowered.
    expect(isSuiteRunCommand('npx playwright install && npx playwright test')).toBe(true)
  })

  it('leaves a build, an install and a one-off script exactly as sent', () => {
    for (const command of [
      'npm run build',
      'npm install',
      'npm ci',
      'npx tsc --noEmit',
      'npx playwright --version',
      'hurl --version',
      'curl -s http://localhost:4000/health',
    ]) {
      expect(isSuiteRunCommand(command), command).toBe(false)
      expect(suiteRunPriorityLaunch(command, LAUNCH), command).toEqual({ launch: LAUNCH, note: '' })
    }
  })
})

describe('outputRedirectTarget', () => {
  it('finds the file a command sends its output to (flash-m29)', () => {
    expect(outputRedirectTarget('npx playwright test > /tmp/pw.txt 2>&1')).toBe('/tmp/pw.txt')
    // A heredoc that writes a config is not the run's output (flash-m44).
    expect(
      outputRedirectTarget(
        "cat > e2e/playwright.deployed.config.ts <<'EOF'\nexport default { use: { baseURL: 'https://x' } }\nEOF\nnpx playwright test -c e2e/playwright.deployed.config.ts",
      ),
    ).toBeNull()
    expect(
      outputRedirectTarget('cat > c.ts <<EOF\nx\nEOF\nnpx playwright test > /tmp/run.log 2>&1'),
    ).toBe('/tmp/run.log')
    expect(outputRedirectTarget('npx playwright test 2>&1 | tee run.log')).toBe('run.log')
    expect(outputRedirectTarget('npm test >> out.log')).toBe('out.log')
  })

  it('is null for no redirect, /dev/null, or only joining stderr', () => {
    expect(outputRedirectTarget('npx playwright test')).toBeNull()
    expect(outputRedirectTarget('npm i > /dev/null 2>&1')).toBeNull()
    expect(outputRedirectTarget('npm test 2>&1')).toBeNull()
  })
})

describe('redactSecrets — a value cut off mid-line', () => {
  it('masks the truncated value and keeps the lines after it (flash-m32)', () => {
    const out = redactSecrets(
      '{"user":{"token":"eyJhbGciOiJIUzI1NiJ9.abc\ntoken len 491\n{"errors":{"x":1}}',
    )
    expect(out).not.toContain('eyJhbGciOiJIUzI1NiJ9')
    expect(out).toContain('token len 491')
    expect(out).toContain('{"errors":{"x":1}}')
  })

  it('still masks a complete value', () => {
    expect(redactSecrets('{"token":"eyJhbGciOiJIUzI1NiJ9.abc.def"}')).not.toContain('eyJhbGci')
  })
})

describe('redactSecrets — package names that end in a keyword', () => {
  it('keeps the version of a package whose name ends in auth or secrets (flash-m35)', () => {
    const line = '    "@molecule/app-auth": "1.2.0",\n    "@molecule/api-secrets": "1.0.4",'
    expect(redactSecrets(line)).toBe(line)
  })

  it('still masks a real secret key', () => {
    expect(redactSecrets('{"apiToken": "sk-abcdef0123456789"}')).not.toContain('sk-abcdef')
    expect(redactSecrets('{"auth": "Bearer abcdef0123456789"}')).not.toContain('abcdef0123')
  })
})

describe('truncateMiddle — test runs (flash-m45)', () => {
  it('keeps the failure blocks over passing progress', async () => {
    const { truncateMiddle } = await import('../utilities.js')
    const progress = Array.from(
      { length: 400 },
      (_, i) => `  ✓  ${i} [chromium] › e2e/a.spec.ts:${i}:1 › passes`,
    ).join('\n')
    const failures = Array.from(
      { length: 3 },
      (_, i) =>
        `  ${i + 1}) [chromium] › e2e/b.spec.ts:${i}:1 › fails ${i}\n\n    Error: expected thing ${i}\n      at b.spec.ts:${i}:5`,
    ).join('\n\n')
    const out = `Running 403 tests using 1 worker\n${progress}\n\n${failures}\n\n  3 failed\n  400 passed (7.2m)`
    const cut = truncateMiddle(out, 8000)
    expect(cut.length).toBeLessThanOrEqual(8000)
    for (let i = 0; i < 3; i++) expect(cut).toContain(`Error: expected thing ${i}`)
    expect(cut).toContain('3 failed')
    expect(cut).toContain('3 of 3 failure blocks kept')
  })
})

describe('fusedLine', () => {
  it('reads back the line two lines became when a newline was dropped', () => {
    expect(fusedLine('const a = 1\nconst b = 22const c = 33\n', 'const b = 22')).toEqual({
      line: 2,
      text: 'const b = 22const c = 33',
    })
  })

  it('is null when the newline survived, and when the replacement ends the file', () => {
    expect(fusedLine('const a = 1\nconst b = 22\n', 'const b = 22')).toBeNull()
    expect(fusedLine('const a = 1\nconst b = 22', 'const b = 22')).toBeNull()
  })

  it('keeps looking past an occurrence a later edit rewrote the boundary of', () => {
    // The replacement's text appears twice; only the second occurrence has more
    // of the line after it.
    expect(fusedLine('x b\nx btail\n', 'x b')).toEqual({ line: 2, text: 'x btail' })
  })
})

describe('redactSecrets — author is not auth (flash-m44)', () => {
  it('keeps author=… and still masks AUTH_TOKEN and Authorization values', async () => {
    const { redactSecrets } = await import('../utilities.js')
    expect(redactSecrets('slug=a author=testuser17921')).toContain('author=testuser17921')
    expect(redactSecrets('AUTH_TOKEN=abc123secret')).not.toContain('abc123secret')
    expect(redactSecrets('authorization=Bearer abcdef123')).not.toContain('abcdef123')
  })
})

/**
 * X1 xr-molecule-flash-m101 (+25:54): the production Playwright run was sent as
 * `… playwright test --reporter=list --timeout=30000 2>&1 | grep -E "✘|passed|failed|skipped" |
 * tail -20` in the background. The rewrite dropped only the trailing `| tail -20`, so the log held
 * 6 lines with no failure body, and `wait_for_task` reported `exitCode: 0` — the code of `tail`,
 * for a run whose own tally said `1 failed`.
 */
describe('a suite’s pipeline is not the suite’s result (xr-molecule-flash-m101 +25:54)', () => {
  /** The head a background suite run is given (see `streamingBackgroundCommand`). */
  const INLINE = 'export PLAYWRIGHT_LIST_PRINT_FAILURES_INLINE=1; '
  /** m101's production run, verbatim. */
  const M101 =
    'cd /workspace/my-app && npx --prefix /workspace/my-app/app playwright test ' +
    '--config playwright.run.config.ts --reporter=list --timeout=30000 2>&1 ' +
    '| grep -E "✘|passed|failed|skipped" | tail -20'
  /** m101's run with every filter gone — the command the tool must actually start. */
  const M101_BARE =
    `${INLINE}cd /workspace/my-app && npx --prefix /workspace/my-app/app playwright test ` +
    '--config playwright.run.config.ts --reporter=list --timeout=30000 2>&1'

  it('drops every output-only filter after the runner, not only a trailing tail', () => {
    const { command, changes } = streamingBackgroundCommand(M101)
    expect(command).toBe(M101_BARE)
    // One sentence says what went and why.
    expect(changes[0]).toBe(
      'Dropped `| grep -E "✘|passed|failed|skipped" | tail -20` from after the test runner: a ' +
        'filtered log cannot be diagnosed — the failing test’s own error is not in it — and ' +
        'wait_for_task returns the end of the full log anyway.',
    )
  })

  it('drops a grep, cut, awk, sed or tr filter as readily as a tail and a head', () => {
    for (const filter of [
      'grep -E "✘|passed"',
      'cut -d: -f1',
      "awk '{print $1}'",
      "sed -n '1,20p'",
      "tr -d '\\r'",
      'head -40',
    ])
      expect(streamingBackgroundCommand(`npx playwright test 2>&1 | ${filter}`).command).toBe(
        `${INLINE}npx playwright test 2>&1 --reporter=list`,
      )
  })

  it('applies the reporter and retries rewrites to a run whose pipe must stay', () => {
    // `tee` writes a file and `sed -i` edits one: neither is provably output-only, so the pipe
    // stays — but that no longer withholds the run's flags, and they land on the RUNNER, never on
    // the filter (m102's dangling `--trace` was the same shape).
    expect(
      streamingBackgroundCommand('npx playwright test --max-failures=15 2>&1 | tee /tmp/run.log')
        .command,
    ).toBe(
      `${INLINE}npx playwright test --max-failures=15 2>&1 --reporter=list --retries=0 ` +
        '| tee /tmp/run.log',
    )
    expect(streamingBackgroundCommand("npx playwright test 2>&1 | sed -i 's/a/b/'").command).toBe(
      `${INLINE}npx playwright test 2>&1 --reporter=list | sed -i 's/a/b/'`,
    )
  })

  it('strips only a suite’s trailing filters, and only output-only ones', () => {
    const unchanged = (command: string): void =>
      expect(stripTrailingSuiteFilters(command)).toEqual({ command, dropped: '' })
    // Not a suite, or a runner that only lists: nothing to strip.
    unchanged('npm run build 2>&1 | tail -5')
    unchanged('npx playwright test --list 2>&1 | tail -5')
    // A statement after the suite is that statement's pipeline, not the run's.
    unchanged('npx playwright test | grep x; echo done')
    unchanged('npx playwright test && grep x file')
    // Output-only proof is required: `tee` writes a file, `sed -i` edits one.
    unchanged('npx playwright test | tee run.log')
    unchanged("npx playwright test | sed -i 's/a/b/'")
    // Another suite runner is covered by the same rule.
    expect(stripTrailingSuiteFilters('npx vitest run 2>&1 | grep failed')).toEqual({
      command: 'npx vitest run 2>&1',
      dropped: '| grep failed',
    })
  })

  it('tells a run whose code is its own from one whose code is a filter’s', () => {
    expect(suiteRunPipedAfterRunner(M101)).toBe(true)
    expect(suiteRunPipedAfterRunner(M101_BARE)).toBe(false)
    expect(suiteRunPipedAfterRunner('npx playwright test | tee run.log')).toBe(true)
    expect(suiteRunPipedAfterRunner('npx playwright test')).toBe(false)
    expect(suiteRunPipedAfterRunner('npx playwright test; echo done')).toBe(false)
    // Irregular spacing inside the run no longer leaves its stages unplaceable: the offsets are the
    // parse's own token positions, so the run's code is its own (m105 +08:12 — this used to be
    // reported as "piped", and a heredoc body was enough to make every run look that way).
    expect(suiteRunPipedAfterRunner('npx  playwright   test --max-failures=15')).toBe(false)
    // A suite inside a `sh -c` string has no offsets in the command's own text: the stages cannot
    // be placed, and the result says so instead of naming a stage that does not exist.
    expect(suiteRunPipelinePlacement("sh -c 'npx playwright test'")).toEqual({
      piped: false,
      unplaced: true,
    })
    expect(suiteRunPipelinePlacement("sh -c 'npx playwright test | tee run.log'")).toEqual({
      piped: true,
      unplaced: true,
    })
    expect(suiteRunPipedAfterRunner("sh -c 'npx playwright test'")).toBe(false)
  })

  it('never hands back a filter’s code, and never 0 beside a failure', () => {
    expect(suiteRunExitCode(0, '  1 failed\n  1 passed (4.2m)', true)).toBeNull()
    // Even with no pipe left, a 0 beside a failure in the tally is not a pass.
    expect(suiteRunExitCode(0, '  1 failed\n  1 passed (4.2m)', false)).toBeNull()
    // A run's own non-zero code is preserved.
    expect(suiteRunExitCode(1, '  1 failed\n  1 passed (4.2m)', false)).toBe(1)
    expect(suiteRunExitCode(0, '  2 passed (1.2s)', false)).toBe(0)
    expect(suiteRunExitCode(null, '', false)).toBeNull()
  })

  it('leaves the run’s own exit code through a real shell', () => {
    /** Recording stubs: the runner exits 1, the filters exit 0 as grep and tail do on a match. */
    const sandbox = (): { dir: string; cwd: string; log: string; env: NodeJS.ProcessEnv } => {
      const dir = mkdtempSync(join(tmpdir(), 'mol-piped-suite-'))
      const cwd = join(dir, 'my-app')
      mkdirSync(cwd)
      for (const name of ['npx', 'grep', 'tail']) {
        writeFileSync(
          join(dir, name),
          '#!/bin/sh\n' +
            `printf '%s' '${name}' >> "$ARGV_LOG.${name}"\n` +
            `for a in "$@"; do printf ' <%s>' "$a" >> "$ARGV_LOG.${name}"; done\n` +
            `printf '\\n' >> "$ARGV_LOG.${name}"\n` +
            (name === 'npx' ? 'exit 1\n' : 'exit 0\n'),
        )
        chmodSync(join(dir, name), 0o755)
      }
      return {
        dir,
        cwd,
        log: join(dir, 'argv.log'),
        env: {
          ...process.env,
          PATH: `${dir}:${process.env.PATH ?? ''}`,
          ARGV_LOG: join(dir, 'argv.log'),
        },
      }
    }
    /** One recorded invocation of `name`, or undefined when it never ran. */
    const invocation = (log: string, name: string): string | undefined => {
      try {
        return readFileSync(`${log}.${name}`, 'utf8')
          .split('\n')
          .find((line) => line.length > 0)
      } catch (_error) {
        return undefined
      }
    }
    /** The shell's exit status for a command, through a real `sh`. */
    const status = (command: string, s: ReturnType<typeof sandbox>): number => {
      const file = join(s.dir, 'status')
      execFileSync('sh', ['-c', `${command}; echo $? > ${file}`], { cwd: s.cwd, env: s.env })
      return Number(readFileSync(file, 'utf8'))
    }
    /** The command with only the directory it `cd`s into made this test's own. */
    const here = (command: string, cwd: string): string =>
      command.replace('cd /workspace/my-app && ', `cd ${cwd} && `)

    // The bug, reproduced: the pipeline's status is the last filter's, and the run's own code
    // never reaches the caller.
    const before = sandbox()
    try {
      expect(status(here(M101, before.cwd), before)).toBe(0)
      expect(invocation(before.log, 'grep')).toBeDefined()
      expect(invocation(before.log, 'tail')).toBe('tail <-20>')
    } finally {
      rmSync(before.dir, { recursive: true, force: true })
    }

    // The rewrite: the runner's 1 is the run's status, and no filter runs at all.
    const after = sandbox()
    try {
      expect(status(here(streamingBackgroundCommand(M101).command, after.cwd), after)).toBe(1)
      expect(invocation(after.log, 'grep')).toBeUndefined()
      expect(invocation(after.log, 'tail')).toBeUndefined()
      // Playwright received the run's flags, once each.
      const playwright = invocation(after.log, 'npx')
      expect(playwright).toContain('<playwright>')
      expect(playwright).toContain('<test>')
      expect(playwright).toContain('<--reporter=list>')
      expect(playwright?.match(/--reporter=/g)).toHaveLength(1)
    } finally {
      rmSync(after.dir, { recursive: true, force: true })
    }
  })
})

/**
 * X1 xr-molecule-flash-m105 (+08:12): the executor wrote its wrapper Playwright config in the SAME
 * `exec_command` as the run, via a heredoc, then launched the suite `2>&1 | tail -60`. The body's
 * `import { defineConfig, devices } from '@playwright/test'` put braces in the text, the stage
 * placement searched for re-joined words it could not find, and the answer fell through to "cannot
 * be placed ⇒ treat as piped": the run came back with no exit code and a note claiming a stage
 * after the runner that had already been dropped. Every later re-run of that command inherited it.
 */
describe('a heredoc body does not defeat statement placement (xr-molecule-flash-m105 +08:12)', () => {
  /** m105's +08:12 command, verbatim. */
  const M105 = `cat > /workspace/.mol-scratch/realworld-e2e/playwright.config.ts <<'EOF'
import { defineConfig, devices } from '@playwright/test'
import { baseConfig } from './playwright.base'

export default defineConfig({
  ...baseConfig,
  reporter: [['list']],
  use: {
    ...baseConfig.use,
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:5173',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },
  expect: { timeout: 10_000 },
  timeout: 45_000,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
EOF
cd /workspace/.mol-scratch/realworld-e2e && TEST_MODE=fullstack TEST_BASE_URL=http://localhost:5173 npx --prefix /workspace/my-app/app playwright test --config playwright.config.ts --retries=0 --workers=1 2>&1 | tail -60`

  it('places the run after the heredoc: the rewritten command is not piped', () => {
    const { command, changes } = streamingBackgroundCommand(M105)
    // The tail is dropped and the reporter lands on the RUNNER, after its own last argument.
    expect(command.endsWith('--workers=1 2>&1 --reporter=list')).toBe(true)
    expect(changes[0]).toContain('Dropped the trailing `| tail -60`')
    // The run's own code is its own: no filter follows it any more.
    expect(suiteRunPipedAfterRunner(command)).toBe(false)
    expect(suiteRunPipelinePlacement(command)).toEqual({ piped: false, unplaced: false })
    // The command as sent really did have a pipe — the answer above is about the rewrite.
    expect(suiteRunPipedAfterRunner(M105)).toBe(true)
  })

  it('runs the rewritten command through a real shell: the heredoc writes, no tail runs', () => {
    /** Recording stubs: the runner exits 1, the tail exits 0 as tail does on a match. */
    const sandbox = (): { dir: string; suite: string; log: string; env: NodeJS.ProcessEnv } => {
      const dir = mkdtempSync(join(tmpdir(), 'mol-heredoc-suite-'))
      const suite = join(dir, 'realworld-e2e')
      mkdirSync(suite)
      for (const name of ['npx', 'tail']) {
        writeFileSync(
          join(dir, name),
          '#!/bin/sh\n' +
            `printf '%s' '${name}' >> "$ARGV_LOG.${name}"\n` +
            `for a in "$@"; do printf ' <%s>' "$a" >> "$ARGV_LOG.${name}"; done\n` +
            `printf '\\n' >> "$ARGV_LOG.${name}"\n` +
            (name === 'npx' ? 'exit 1\n' : 'exit 0\n'),
        )
        chmodSync(join(dir, name), 0o755)
      }
      return {
        dir,
        suite,
        log: join(dir, 'argv.log'),
        env: {
          ...process.env,
          PATH: `${dir}:${process.env.PATH ?? ''}`,
          ARGV_LOG: join(dir, 'argv.log'),
        },
      }
    }
    /** One recorded invocation of `name`, or undefined when it never ran. */
    const invocation = (log: string, name: string): string | undefined => {
      try {
        return readFileSync(`${log}.${name}`, 'utf8')
          .split('\n')
          .find((line) => line.length > 0)
      } catch (_error) {
        return undefined
      }
    }
    /** The command with m105's absolute paths made this test's own. */
    const here = (command: string, s: ReturnType<typeof sandbox>): string =>
      command.replaceAll('/workspace/.mol-scratch/realworld-e2e', s.suite)

    const s = sandbox()
    try {
      const rewritten = here(streamingBackgroundCommand(M105).command, s)
      const file = join(s.dir, 'status')
      const output = execFileSync('sh', ['-c', `${rewritten}; echo $? > ${file}`], {
        cwd: s.dir,
        env: s.env,
        encoding: 'utf8',
      })
      // The shell's status is the run's 1 — the pipeline's `tail` 0 is gone with the filter.
      const status = Number(readFileSync(file, 'utf8'))
      expect(status).toBe(1)
      expect(invocation(s.log, 'tail')).toBeUndefined()
      // What the TOOL reports for that run. Before the fix the stages could not be placed, the
      // answer fell through to "piped", and the result carried no code at all (null) — the note
      // under it claiming a stage after the runner that the rewrite had already dropped.
      expect(suiteRunExitCode(status, output, suiteRunPipedAfterRunner(rewritten))).toBe(1)
      // The heredoc still wrote the config the run was given, body and all.
      expect(readFileSync(join(s.suite, 'playwright.config.ts'), 'utf8')).toContain(
        "import { defineConfig, devices } from '@playwright/test'",
      )
      // Playwright received the run's own flags, the reporter once.
      const playwright = invocation(s.log, 'npx')
      expect(playwright).toContain('<playwright>')
      expect(playwright).toContain('<test>')
      expect(playwright).toContain('<--config>')
      expect(playwright?.match(/--reporter=/g)).toHaveLength(1)
    } finally {
      rmSync(s.dir, { recursive: true, force: true })
    }
  })
})

/**
 * xr-molecule-flash-m110 (+20:44): five failures in one run were `Test timeout of 15000ms
 * exceeded`, and the recap printed `Test timeout of <n> exceeded` — the number the whole failure
 * class is about replaced by the placeholder that makes equal causes group. The budget is the one
 * value that differs BETWEEN CAUSES and never within one, so it survives the grouping.
 */
describe('failureCausesNote — the test budget a timeout cause normalized away', () => {
  /** Two failures the suite's own 15 s budget stopped, before and after the placeholders. */
  const budget = [
    '  1) [chromium] › e2e/url-navigation.spec.ts:137:3 › Pagination › loads ?page=N ────────',
    '',
    '    Test timeout of 15000ms exceeded.',
    '',
    '    Error: page.goto: Target page, context or browser has been closed',
    '',
    '  2) [chromium] › e2e/url-navigation.spec.ts:182:3 › Pagination › works with a tag ────────',
    '',
    '    Test timeout of 15000ms exceeded.',
    '',
    '    Error: page.goto: Target page, context or browser has been closed',
    '',
    '  2 failed',
  ].join('\n')

  it('prints the budget instead of <n>, and keeps it on the cause', () => {
    const causes = failuresByCause(budget)
    expect(causes).toHaveLength(1)
    expect(causes[0].message).toBe('Test timeout of <n> exceeded.')
    expect(causes[0].budgetMs).toBe(15000)
    const note = failureCausesNote(budget)!
    expect(note).toContain('`Test timeout of 15000ms exceeded.`')
    expect(note).not.toContain('Test timeout of <n>')
  })

  it("leaves a locator wait's own timeout normalized — that is the config, not the budget", () => {
    const waits = [
      '  1) [chromium] › e2e/a.spec.ts:10:3 › A › one ────────',
      '',
      '    TimeoutError: page.click: Timeout 5000ms exceeded.',
      '',
      '  2) [chromium] › e2e/a.spec.ts:20:3 › A › two ────────',
      '',
      '    TimeoutError: page.click: Timeout 5000ms exceeded.',
      '',
      '  2 failed',
    ].join('\n')
    const causes = failuresByCause(waits)
    expect(causes[0].budgetMs).toBeUndefined()
    expect(failureCausesNote(waits)!).toContain('`TimeoutError: page.click: Timeout <n> exceeded.`')
  })
})
