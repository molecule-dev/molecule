import { describe, expect, it } from 'vitest'

import {
  checkBlockedCommand,
  isValidGlob,
  redactSecrets,
  resolvePath,
  shellQuote,
  stripControlChars,
  truncate,
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
})

describe('checkBlockedCommand', () => {
  it('blocks bare env / printenv', () => {
    expect(checkBlockedCommand('env')).toMatch(/environment variable dumps/)
    expect(checkBlockedCommand('printenv')).toMatch(/environment variable dumps/)
  })

  it('blocks env through sh -c wrapper', () => {
    expect(checkBlockedCommand('sh -c "env"')).toMatch(/environment variable dumps/)
    expect(checkBlockedCommand('bash -c env')).toMatch(/environment variable dumps/)
  })

  it('blocks pipe / chain to env (env after ; & |)', () => {
    expect(checkBlockedCommand('echo hi; env')).toMatch(/environment variable dumps/)
    expect(checkBlockedCommand('echo hi && env')).toMatch(/environment variable dumps/)
  })

  it('blocks cat /etc/environment', () => {
    expect(checkBlockedCommand('cat /etc/environment')).toMatch(/environment variable/)
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
      /interpreter environment/,
    )
    expect(checkBlockedCommand('node -e "console.log(process.env)"')).toMatch(
      /interpreter environment/,
    )
    expect(checkBlockedCommand('ruby -e "puts ENV[\'X\']"')).toMatch(/interpreter environment/)
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
