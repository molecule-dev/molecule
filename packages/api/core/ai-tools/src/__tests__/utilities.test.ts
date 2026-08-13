import { describe, expect, it } from 'vitest'

import {
  checkBlockedCommand,
  isEnvFilePath,
  isValidGlob,
  redactSecrets,
  redactSecretsInCode,
  resolvePath,
  shellQuote,
  stripControlChars,
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
  it('blocks bare env / printenv', () => {
    expect(checkBlockedCommand('env')).toMatch(/dumping environment variables/)
    expect(checkBlockedCommand('printenv')).toMatch(/dumping environment variables/)
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
