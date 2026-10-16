import { describe, expect, it } from 'vitest'

import {
  checkBlockedCommand,
  findPatternArgs,
  fusedLine,
  isEnvFilePath,
  isSuiteRunCommand,
  isValidGlob,
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
  suiteRunPriorityLaunch,
  truncate,
  truncateMiddle,
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
  it('drops a trailing tail, in both of its spellings', () => {
    expect(streamingBackgroundCommand('npm run build 2>&1 | tail -40').command).toBe(
      'npm run build 2>&1',
    )
    expect(streamingBackgroundCommand('npm test | tail -n 100').command).toBe('npm test')
  })

  it('drops a trailing head from a Playwright run, whose tally prints last (flash-m32)', () => {
    expect(streamingBackgroundCommand('npx playwright test 2>&1 | head -60').command).toBe(
      'npx playwright test 2>&1 --reporter=list',
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
    // A run being iterated on also carries `line`: `list` holds each failure's error for the
    // summary at the end, so mid-run its log says only how long a failure took, while the
    // repeating-cause look (flash-m76) needs the error the failure wrote.
    expect(
      streamingBackgroundCommand('cd e2e && npx playwright test specs/auth.spec.ts').command,
    ).toBe('cd e2e && npx playwright test specs/auth.spec.ts --reporter=list,line --retries=0')
  })

  it('runs a diagnosis or re-run with --retries=0, and leaves the proof run alone (flash-m71)', () => {
    expect(streamingBackgroundCommand('npx playwright test --max-failures=15').command).toBe(
      'npx playwright test --max-failures=15 --reporter=list,line --retries=0',
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

  it('switches a final playwright run off the line reporter the fail-fast cannot read', () => {
    expect(
      streamingBackgroundCommand('cd spec/run && npx playwright test --reporter=line'),
    ).toEqual({
      command: 'cd spec/run && npx playwright test --reporter=list',
      changes: [
        'Switched `--reporter=line` to `--reporter=list`: it also writes each test result as it ' +
          'finishes, and it is the shape the platform reads back from a background run.',
      ],
    })
    // The space spelling is the same flag to Playwright, and only the last step is rewritten.
    expect(streamingBackgroundCommand('cd e2e; npx playwright test --reporter line').command).toBe(
      'cd e2e; npx playwright test --reporter list',
    )
    expect(
      streamingBackgroundCommand('npx playwright test --reporter line && echo done').command,
    ).toBe('npx playwright test --reporter line && echo done')
  })

  it('leaves playwright alone when it picks a reporter, redirects, or is not the last step', () => {
    for (const command of [
      'npx playwright test --reporter=list',
      'npx playwright test --reporter=html',
      'npx playwright test > log.txt',
      'npx playwright test && echo done',
      'npm run build',
    ]) {
      expect(streamingBackgroundCommand(command)).toEqual({ command, changes: [] })
    }
  })

  it('adds `line` to an iterating run’s own `list` reporter (flash-m76)', () => {
    // flash-m76's diagnosis run ended `--max-failures=15 … --reporter=list`: 15 tests took the
    // full 4.0 minutes to report one cause, because the log carried each failure's duration and
    // nothing of its error until the very end.
    expect(
      streamingBackgroundCommand('npx playwright test --max-failures=15 --reporter=list').command,
    ).toBe('npx playwright test --max-failures=15 --reporter=list,line --retries=0')
    // A whole-suite proof run keeps `list` alone — nothing stops it early, and the second
    // reporter would only double its log.
    expect(streamingBackgroundCommand('npx playwright test --reporter=list').command).toBe(
      'npx playwright test --reporter=list',
    )
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
    expect(found!.message).toBe('TimeoutError: page.waitForURL: Timeout 10000ms exceeded.')
    expect(found!.tests[0].where).toBe('../../fixtures/realworld/specs/e2e/auth.spec.ts:1')
  })

  it('builds the note with the tests it hit, the stop command and no waiting', () => {
    const found = repeatingFailure(m76)!
    const note = repeatingFailureNote(found, {
      taskId: 'mol-bg-mvax0rgp-63okfo',
      log: '/tmp/mol-bg-mvax0rgp-63okfo.log',
      stop: 'kill 412 419',
    })
    expect(note).toContain('3 of this run’s tests have already failed the same way')
    expect(note).toContain('each after ~15.6s')
    expect(note).toContain('✘ e2e/articles.spec.ts:32 › should create a new article (15.6s)')
    expect(note).toContain('exec_command: kill 412 419')
    expect(note).toContain('do not wait for the rest of it')
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
    expect(note).toContain('Re-run `specs/e2e/auth.spec.ts:7` alone')
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
