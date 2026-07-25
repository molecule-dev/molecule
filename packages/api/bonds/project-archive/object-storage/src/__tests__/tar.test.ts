import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  assertSafeEntryPath,
  assertSafeSourcePath,
  createTar,
  gunzipBytes,
  gzipBytes,
  parseTar,
  pathCollisionKey,
  type TarEntry,
} from '../tar.js'

const BLOCK_SIZE = 512
const NAME_SIZE = 100
const PREFIX_SIZE = 155

/**
 * Encodes a UTF-8 string as bytes.
 *
 * @param value - The string to encode.
 * @returns The encoded bytes.
 */
function bytes(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'utf8'))
}

/**
 * Decodes bytes as a UTF-8 string.
 *
 * @param value - The bytes to decode.
 * @returns The decoded string.
 */
function text(value: Uint8Array): string {
  return Buffer.from(value).toString('utf8')
}

/**
 * Runs a function and returns the message of the error it threw.
 *
 * @param run - The function expected to throw.
 * @returns The thrown error's message.
 * @throws {Error} If the function did not throw.
 */
function messageOf(run: () => unknown): string {
  try {
    run()
  } catch (error) {
    return (error as Error).message
  }
  throw new Error('Expected the function to throw, but it returned normally.')
}

/** Knobs for {@link craftTar}, every one of them hostile-capable. */
interface CraftOptions {
  /** Raw bytes written into the 100-byte `name` field. */
  name?: string
  /** Raw bytes written into the 155-byte `prefix` field. */
  prefix?: string
  /** Raw mode written into the header, UNMASKED. */
  mode?: number
  /** Type flag byte: `'0'` file, `'5'` directory, anything else unsupported. */
  typeflag?: string
  /** The 6-byte magic field (`'ustar\0'` when omitted). */
  magic?: string
  /** The entry's actual bytes. */
  content?: Uint8Array
  /** The size the header CLAIMS, which need not match `content`. */
  declaredSize?: number
  /** Which checksum convention to store. */
  checksum?: 'unsigned' | 'signed' | 'corrupt'
  /** Whether to append the two-zero-block end-of-archive marker. */
  endMarker?: boolean
}

/**
 * Builds a tar by hand, bypassing {@link createTar}'s write-side validation
 * entirely, so the READER can be tested against archives it would never write.
 *
 * @param options - The header/content knobs.
 * @returns The tar bytes.
 */
function craftTar(options: CraftOptions = {}): Uint8Array {
  const {
    name = 'file.txt',
    prefix = '',
    mode = 0o644,
    typeflag = '0',
    magic = 'ustar\0',
    content = new Uint8Array(0),
    declaredSize = content.byteLength,
    checksum = 'unsigned',
    endMarker = true,
  } = options

  const header = Buffer.alloc(BLOCK_SIZE)
  header.write(name, 0, NAME_SIZE, 'utf8')
  header.write(`${(mode & 0o7777).toString(8).padStart(6, '0')}\0 `, 100, 8, 'ascii')
  header.write('0000000\0', 108, 8, 'ascii')
  header.write('0000000\0', 116, 8, 'ascii')
  header.write(`${declaredSize.toString(8).padStart(11, '0')}\0`, 124, 12, 'ascii')
  header.write('00000000000\0', 136, 12, 'ascii')
  header.write(typeflag, 156, 1, 'ascii')
  header.write(magic, 257, 6, 'ascii')
  header.write('00', 263, 2, 'ascii')
  header.write(prefix, 345, PREFIX_SIZE, 'utf8')

  header.fill(0x20, 148, 156)
  let unsigned = 0
  let signed = 0
  for (const byte of header) {
    unsigned += byte
    signed += byte > 0x7f ? byte - 0x100 : byte
  }
  const stored = checksum === 'signed' ? signed : checksum === 'corrupt' ? unsigned + 1 : unsigned
  header.write(`${stored.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii')

  const remainder = content.byteLength % BLOCK_SIZE
  return new Uint8Array(
    Buffer.concat([
      header,
      Buffer.from(content),
      remainder === 0 ? Buffer.alloc(0) : Buffer.alloc(BLOCK_SIZE - remainder),
      endMarker ? Buffer.alloc(BLOCK_SIZE * 2) : Buffer.alloc(0),
    ]),
  )
}

describe('assertSafeSourcePath — DECISION 5, validated on the UNPREFIXED path', () => {
  it('rejects absolute POSIX paths', () => {
    expect(() => assertSafeSourcePath('/etc/passwd')).toThrow(/absolute paths are rejected/)
    expect(() => assertSafeSourcePath('/')).toThrow(/absolute paths are rejected/)
  })

  it('rejects a leading backslash', () => {
    expect(() => assertSafeSourcePath('\\etc\\passwd')).toThrow(/absolute paths are rejected/)
    expect(() => assertSafeSourcePath('\\\\server\\share\\x')).toThrow(
      /absolute paths are rejected/,
    )
  })

  it('rejects drive-qualified paths', () => {
    expect(() => assertSafeSourcePath('C:\\Windows\\system32\\drivers\\etc\\hosts')).toThrow(
      /drive-qualified paths are rejected/,
    )
    expect(() => assertSafeSourcePath('c:/temp/x.ts')).toThrow(/drive-qualified paths are rejected/)
    // Drive-RELATIVE ("C:x", "a:b.ts") is rejected too — on Windows it resolves
    // against that drive's current directory, which is not the restore root.
    expect(() => assertSafeSourcePath('C:x.ts')).toThrow(/drive-qualified paths are rejected/)
    expect(() => assertSafeSourcePath('a:b.ts')).toThrow(/drive-qualified paths are rejected/)
  })

  it('rejects any ".." segment, wherever it appears', () => {
    expect(() => assertSafeSourcePath('..')).toThrow(/path traversal/)
    expect(() => assertSafeSourcePath('../evil')).toThrow(/path traversal/)
    expect(() => assertSafeSourcePath('src/../../etc/passwd')).toThrow(/path traversal/)
    expect(() => assertSafeSourcePath('src/app/..')).toThrow(/path traversal/)
    expect(() => assertSafeSourcePath('src\\..\\..\\etc\\passwd')).toThrow(/path traversal/)
  })

  it('rejects NUL bytes', () => {
    expect(() => assertSafeSourcePath('src/index.ts\0.png')).toThrow(/must not contain NUL bytes/)
    expect(() => assertSafeSourcePath('\0')).toThrow(/must not contain NUL bytes/)
  })

  it('rejects empty and "."-only paths', () => {
    expect(() => assertSafeSourcePath('')).toThrow(/the path is empty/)
    expect(() => assertSafeSourcePath('.')).toThrow(/names no file/)
    expect(() => assertSafeSourcePath('./')).toThrow(/names no file/)
    expect(() => assertSafeSourcePath('././.')).toThrow(/names no file/)
    expect(() => assertSafeSourcePath('/')).toThrow()
  })

  it('rejects "." and empty segments anywhere in the path', () => {
    expect(() => assertSafeSourcePath('./relative/ok.ts')).toThrow(/a "\." segment are rejected/)
    expect(() => assertSafeSourcePath('src/./index.ts')).toThrow(/a "\." segment are rejected/)
    expect(() => assertSafeSourcePath('src//index.ts')).toThrow(/an empty segment are rejected/)
    expect(() => assertSafeSourcePath('src/index.ts/')).toThrow(/an empty segment are rejected/)
  })

  it('accepts ordinary relative paths, including dotted and non-ASCII names', () => {
    expect(() => assertSafeSourcePath('src/index.ts')).not.toThrow()
    expect(() => assertSafeSourcePath('.env.example')).not.toThrow()
    expect(() => assertSafeSourcePath('src/..hidden/file..ts')).not.toThrow()
    expect(() => assertSafeSourcePath('ドキュメント/説明.md')).not.toThrow()
    expect(() => assertSafeSourcePath('packages/api/core/src/index.ts')).not.toThrow()
  })

  it('is the guard the "source/" prefix used to defeat (the regression this fixes)', () => {
    // The OLD guard only ever saw the prefixed form, which looks harmless:
    // it is not absolute, has no ".." segment, and is not drive-qualified.
    const prefixed = `source/${'/etc/passwd'}`
    expect(prefixed).toBe('source//etc/passwd')
    expect(prefixed.startsWith('/')).toBe(false)
    expect(prefixed.split('/').includes('..')).toBe(false)
    expect(/^[a-zA-Z]:/.test(prefixed)).toBe(false)

    // Validating the RAW path is what catches it.
    expect(() => assertSafeSourcePath('/etc/passwd')).toThrow(/absolute paths are rejected/)

    // Same story for a drive-qualified path, which prefixing hides completely.
    expect(`source/${'C:\\Windows\\x'}`).toBe('source/C:\\Windows\\x')
    expect(() => assertSafeSourcePath('C:\\Windows\\x')).toThrow(
      /drive-qualified paths are rejected/,
    )
  })

  it('applies the same rules to archive-internal entry paths', () => {
    expect(() => assertSafeEntryPath('source/src/index.ts')).not.toThrow()
    expect(() => assertSafeEntryPath('source//etc/passwd')).toThrow(/an empty segment are rejected/)
    expect(() => assertSafeEntryPath('source/../../etc/passwd')).toThrow(/path traversal/)
    expect(() => assertSafeEntryPath('')).toThrow(/the path is empty/)
  })
})

describe('pathCollisionKey — DECISION 5, entries must not collide on restore', () => {
  it('folds letter case', () => {
    expect(pathCollisionKey('source/README.md')).toBe(pathCollisionKey('source/readme.md'))
  })

  it('folds Unicode composition (NFC)', () => {
    const precomposed = 'source/caf\u00e9.txt'
    const decomposed = 'source/cafe\u0301.txt'
    expect(precomposed).not.toBe(decomposed)
    expect(pathCollisionKey(precomposed)).toBe(pathCollisionKey(decomposed))
  })

  it('folds separator shape', () => {
    expect(pathCollisionKey('a\\b\\c.ts')).toBe(pathCollisionKey('a/b/c.ts'))
    expect(pathCollisionKey('a//b/c.ts')).toBe(pathCollisionKey('a/b/c.ts'))
    expect(pathCollisionKey('a/b/')).toBe(pathCollisionKey('a/b'))
  })

  it('keeps genuinely different paths apart', () => {
    expect(pathCollisionKey('src/a.ts')).not.toBe(pathCollisionKey('src/b.ts'))
    expect(pathCollisionKey('src/a.ts')).not.toBe(pathCollisionKey('src/sub/a.ts'))
  })
})

describe('createTar / parseTar round-trip fidelity', () => {
  it('round-trips nested paths, empty files, unusual modes, and multi-byte UTF-8 content', () => {
    const entries: TarEntry[] = [
      { path: 'README.md', content: bytes('# hello\n'), mode: 0o644 },
      { path: 'src/deeply/nested/dir/module.ts', content: bytes('export const x = 1\n') },
      { path: 'empty.txt', content: new Uint8Array(0) },
      { path: 'scripts/run.sh', content: bytes('#!/bin/sh\necho hi\n'), mode: 0o755 },
      { path: 'secrets/key.pem', content: bytes('-----BEGIN-----\n'), mode: 0o600 },
      { path: 'read-only.txt', content: bytes('locked'), mode: 0o444 },
      {
        path: 'i18n/messages.json',
        content: bytes('{"greeting":"こんにちは 🎉 Grüße — naïve café"}'),
      },
    ]

    const parsed = parseTar(createTar(entries))

    expect(parsed.map((entry) => entry.path)).toEqual(entries.map((entry) => entry.path))
    for (const [index, entry] of entries.entries()) {
      expect(Buffer.from(parsed[index].content).equals(Buffer.from(entry.content))).toBe(true)
      expect(parsed[index].mode).toBe(entry.mode ?? 0o644)
      expect(parsed[index].type).toBe('file')
    }
    expect(text(parsed[6].content)).toBe('{"greeting":"こんにちは 🎉 Grüße — naïve café"}')
    expect(parsed[2].content.byteLength).toBe(0)
    expect(parsed[3].mode).toBe(0o755)
  })

  it('round-trips a multi-byte UTF-8 path', () => {
    const parsed = parseTar(createTar([{ path: 'ドキュメント/説明.md', content: bytes('内容') }]))

    expect(parsed).toHaveLength(1)
    expect(parsed[0].path).toBe('ドキュメント/説明.md')
    expect(text(parsed[0].content)).toBe('内容')
  })

  it('round-trips directory entries', () => {
    const parsed = parseTar(
      createTar([
        { path: 'src/generated', content: new Uint8Array(0), type: 'directory' },
        { path: 'src/generated/index.ts', content: bytes('export {}\n') },
      ]),
    )

    expect(parsed[0]).toMatchObject({ path: 'src/generated', type: 'directory' })
    expect(parsed[0].content.byteLength).toBe(0)
    expect(parsed[0].mode).toBe(0o755)
    expect(parsed[1].type).toBe('file')
  })

  it('accepts a directory path supplied WITH a trailing slash, and canonicalises it', () => {
    const parsed = parseTar(
      createTar([{ path: 'src/generated/', content: new Uint8Array(0), type: 'directory' }]),
    )

    expect(parsed[0]).toMatchObject({ path: 'src/generated', type: 'directory' })
  })

  it('treats a directory and a file of the same name as a collision', () => {
    expect(() =>
      createTar([
        { path: 'src/generated', content: new Uint8Array(0), type: 'directory' },
        { path: 'src/generated', content: bytes('clobber') },
      ]),
    ).toThrow(/Duplicate tar entry path/)
  })

  it('writes an entry-less archive as the bare end-of-archive marker (emptiness is the caller’s policy)', () => {
    const tar = createTar([])

    expect(tar.byteLength).toBe(BLOCK_SIZE * 2)
    expect(parseTar(tar)).toEqual([])
  })

  it('round-trips content sitting exactly on the 512- and 1024-byte block boundaries', () => {
    const sizes = [0, 1, 511, 512, 513, 1023, 1024, 1025]
    const entries: TarEntry[] = sizes.map((size, index) => ({
      path: `blocks/entry-${index}-${size}.bin`,
      content: new Uint8Array(size).fill((index + 1) & 0xff),
    }))

    const tar = createTar(entries)
    const expectedLength =
      sizes.reduce(
        (total, size) => total + BLOCK_SIZE + Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE,
        0,
      ) +
      BLOCK_SIZE * 2

    expect(tar.byteLength % BLOCK_SIZE).toBe(0)
    expect(tar.byteLength).toBe(expectedLength)

    const parsed = parseTar(tar)
    expect(parsed.map((entry) => entry.content.byteLength)).toEqual(sizes)
    for (const [index, entry] of entries.entries()) {
      expect(Buffer.from(parsed[index].content).equals(Buffer.from(entry.content))).toBe(true)
    }
  })

  it('pads every entry to a 512-byte boundary and ends with two zero blocks', () => {
    const tar = createTar([
      { path: 'a.txt', content: bytes('x') },
      { path: 'b.txt', content: new Uint8Array(BLOCK_SIZE).fill(7) },
    ])

    // 2 headers + 1 padded data block + 1 exact data block + 2 end blocks.
    expect(tar.byteLength % BLOCK_SIZE).toBe(0)
    expect(tar.byteLength).toBe(BLOCK_SIZE * 6)
    const tail = Buffer.from(tar.subarray(tar.byteLength - BLOCK_SIZE * 2))
    expect(tail.equals(Buffer.alloc(BLOCK_SIZE * 2))).toBe(true)
  })

  it('uses the ustar prefix field for paths longer than the 100-byte name field', () => {
    const path = `${'nested-directory/'.repeat(7)}some/rather/long/file-name-here.ts`
    expect(Buffer.byteLength(path, 'utf8')).toBeGreaterThan(100)

    const tar = createTar([{ path, content: bytes('deep') }])
    // The name field alone cannot hold it — the prefix field must be populated.
    expect(Buffer.from(tar.subarray(345, 500)).indexOf(0)).toBeGreaterThan(0)

    const parsed = parseTar(tar)
    expect(parsed[0].path).toBe(path)
    expect(text(parsed[0].content)).toBe('deep')
  })

  it('round-trips a >100-byte path whose non-ASCII bytes straddle the name/prefix split', () => {
    const path = `${'ドキュメント/'.repeat(4)}とても長い名前のファイル.md`
    expect(Buffer.byteLength(path, 'utf8')).toBeGreaterThan(100)

    const parsed = parseTar(createTar([{ path, content: bytes('日本語の中身') }]))
    expect(parsed[0].path).toBe(path)
    expect(text(parsed[0].content)).toBe('日本語の中身')
  })

  it('throws for a path that cannot be split across the name and prefix fields', () => {
    const impossible = `${'x'.repeat(140)}.ts`

    expect(() => createTar([{ path: impossible, content: bytes('nope') }])).toThrow(
      /cannot be represented in the ustar format/,
    )
  })

  it('throws on duplicate entry paths, including case- and Unicode-collisions', () => {
    expect(() =>
      createTar([
        { path: 'dup.txt', content: bytes('a') },
        { path: 'dup.txt', content: bytes('b') },
      ]),
    ).toThrow(/Duplicate tar entry path/)

    expect(() =>
      createTar([
        { path: 'source/README.md', content: bytes('a') },
        { path: 'source/readme.md', content: bytes('b') },
      ]),
    ).toThrow(/Duplicate tar entry path/)

    expect(() =>
      createTar([
        { path: 'source/caf\u00e9.txt', content: bytes('a') },
        { path: 'source/cafe\u0301.txt', content: bytes('b') },
      ]),
    ).toThrow(/Duplicate tar entry path/)
  })

  it('throws on a truncated archive', () => {
    const tar = createTar([{ path: 'a.txt', content: new Uint8Array(1024).fill(3) }])

    expect(() => parseTar(tar.subarray(0, BLOCK_SIZE * 2))).toThrow(/ends early/)
    expect(() => parseTar(tar.subarray(0, BLOCK_SIZE + 10))).toThrow(/not a multiple of 512/)
    // Cut exactly at a block boundary after a COMPLETE entry: only the missing
    // end-of-archive marker reveals the truncation.
    expect(() => parseTar(tar.subarray(0, BLOCK_SIZE * 3))).toThrow(
      /end-of-archive marker is missing/,
    )
    expect(() => parseTar(new Uint8Array(0))).toThrow(/the archive is empty/)
  })
})

describe('header checksum validation — never trusted, always recomputed', () => {
  it('detects a corrupted header via the checksum', () => {
    const tar = createTar([{ path: 'a.txt', content: bytes('hello') }])
    tar[10] = tar[10] ^ 0xff

    expect(() => parseTar(tar)).toThrow(/header checksum mismatch/)
  })

  it('detects tampering with the declared size, path and mode fields', () => {
    for (const offset of [0, 100, 124, 345]) {
      const tar = createTar([
        { path: 'source/app/main.ts', content: bytes('console.log(1)'), mode: 0o644 },
      ])
      tar[offset] = tar[offset] ^ 0x01
      expect(() => parseTar(tar)).toThrow(/header checksum mismatch/)
    }
  })

  it('detects tampering with a header holding non-ASCII bytes', () => {
    const tar = createTar([{ path: 'ドキュメント/説明.md', content: bytes('内容') }])
    tar[3] = tar[3] ^ 0x20

    expect(() => parseTar(tar)).toThrow(/header checksum mismatch/)
  })

  it('rejects a header whose checksum was recomputed to match a swapped-in value only partly', () => {
    const hostile = craftTar({ name: 'a.txt', content: bytes('x'), checksum: 'corrupt' })

    expect(() => parseTar(hostile)).toThrow(/header checksum mismatch/)
  })

  it('still accepts the historic SIGNED checksum convention', () => {
    const signed = craftTar({ name: '説明.md', content: bytes('内容'), checksum: 'signed' })

    const parsed = parseTar(signed)
    expect(parsed[0].path).toBe('説明.md')
    expect(text(parsed[0].content)).toBe('内容')
  })
})

describe('hostile archives fed to parseTar', () => {
  it('REJECTS a relative path traversal entry on read', () => {
    expect(() => parseTar(craftTar({ name: '../evil', content: bytes('pwned') }))).toThrow(
      /path traversal/,
    )
  })

  it('REJECTS a nested path traversal entry on read', () => {
    const hostile = craftTar({
      name: 'source/app/../../../../etc/cron.d/evil',
      content: bytes('pwned'),
    })

    expect(() => parseTar(hostile)).toThrow(/path traversal/)
  })

  it('REJECTS traversal smuggled through the ustar PREFIX field', () => {
    const hostile = craftTar({ name: 'authorized_keys', prefix: '../../../root/.ssh' })

    expect(() => parseTar(hostile)).toThrow(/path traversal/)
  })

  it('REJECTS an absolute path smuggled through the ustar PREFIX field', () => {
    const hostile = craftTar({ name: 'passwd', prefix: '/etc' })

    expect(() => parseTar(hostile)).toThrow(/absolute paths are rejected/)
  })

  it('REJECTS an absolute path entry on read', () => {
    expect(() => parseTar(craftTar({ name: '/etc/passwd', content: bytes('root:x:0:0') }))).toThrow(
      /absolute paths are rejected/,
    )
  })

  it('REJECTS a drive-qualified path entry on read', () => {
    expect(() => parseTar(craftTar({ name: 'C:\\Windows\\system32\\x' }))).toThrow(
      /drive-qualified paths are rejected/,
    )
  })

  it('REJECTS "." and empty segments on read', () => {
    expect(() => parseTar(craftTar({ name: './x' }))).toThrow(/a "\." segment are rejected/)
    expect(() => parseTar(craftTar({ name: 'source//etc/passwd' }))).toThrow(
      /an empty segment are rejected/,
    )
  })

  it('REJECTS entry types other than file and directory (symlinks are an escape hatch)', () => {
    expect(() => parseTar(craftTar({ name: 'link', typeflag: '2' }))).toThrow(
      /Unsupported tar entry type/,
    )
    expect(() => parseTar(craftTar({ name: 'dev/null', typeflag: '3' }))).toThrow(
      /Unsupported tar entry type/,
    )
  })

  it('REJECTS a non-ustar header', () => {
    expect(() => parseTar(craftTar({ name: 'a.txt', magic: 'xxxxx\0' }))).toThrow(
      /"ustar" magic is missing/,
    )
  })

  it('REJECTS a garbage numeric field without echoing its bytes', () => {
    const hostile = craftTar({ name: 'a.txt' })
    // Overwrite the size field with non-octal junk (checksum recomputed by hand).
    const buffer = Buffer.from(hostile)
    buffer.write('99999999999\0', 124, 12, 'ascii')
    buffer.fill(0x20, 148, 156)
    let sum = 0
    for (let i = 0; i < BLOCK_SIZE; i++) sum += buffer[i]
    buffer.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii')

    const message = messageOf(() => parseTar(new Uint8Array(buffer)))
    expect(message).toMatch(/not a valid octal numeric field/)
    expect(message).not.toContain('99999999999')
  })

  it('REJECTS two entries that collide after normalisation', () => {
    const first = craftTar({ name: 'source/README.md', content: bytes('real'), endMarker: false })
    const second = craftTar({ name: 'source/readme.md', content: bytes('evil') })

    expect(() => parseTar(new Uint8Array(Buffer.concat([first, second])))).toThrow(
      /duplicate entry path/,
    )
  })

  it('REJECTS an archive with no end-of-archive marker', () => {
    expect(() => parseTar(craftTar({ name: 'a.txt', endMarker: false }))).toThrow(
      /end-of-archive marker is missing/,
    )
  })
})

describe('mode hygiene — DECISION 8, setuid/setgid/sticky never survive', () => {
  it('masks 0o4755 to 0o755 on WRITE', () => {
    const tar = createTar([{ path: 'bin/tool', content: bytes('#!/bin/sh\n'), mode: 0o4755 }])

    // Read the mode straight out of the header bytes, not just the parsed entry.
    const modeField = Buffer.from(tar.subarray(100, 108)).toString('ascii').replace(/[\0 ]/g, '')
    expect(parseInt(modeField, 8)).toBe(0o755)

    const parsed = parseTar(tar)
    expect(parsed[0].mode).toBe(0o755)
    expect((parsed[0].mode ?? 0) & 0o7000).toBe(0)
  })

  it('masks setgid and sticky bits on WRITE', () => {
    const parsed = parseTar(
      createTar([
        { path: 'a', content: bytes('x'), mode: 0o2755 },
        { path: 'b', content: bytes('x'), mode: 0o1777 },
        { path: 'c', content: new Uint8Array(0), type: 'directory', mode: 0o6755 },
      ]),
    )

    expect(parsed[0].mode).toBe(0o755)
    expect(parsed[1].mode).toBe(0o777)
    expect(parsed[2].mode).toBe(0o755)
  })

  it('masks 0o4755 to 0o755 on READ of a hostile archive that declares setuid', () => {
    const hostile = craftTar({ name: 'bin/rootme', mode: 0o4755, content: bytes('#!/bin/sh\n') })

    // The crafted header really does carry the setuid bit.
    const modeField = Buffer.from(hostile.subarray(100, 108))
      .toString('ascii')
      .replace(/[\0 ]/g, '')
    expect(parseInt(modeField, 8)).toBe(0o4755)

    const parsed = parseTar(hostile)
    expect(parsed[0].mode).toBe(0o755)
    expect((parsed[0].mode ?? 0) & 0o7000).toBe(0)
  })
})

describe('size caps — DECISION 7, decompression bombs and unbounded buffering', () => {
  it('refuses to inflate a decompression bomb past maxUncompressedBytes', () => {
    // 16 MiB of zeros compresses to a handful of KB — the classic bomb shape.
    const bomb = gzipBytes(new Uint8Array(16 * 1024 * 1024))
    expect(bomb.byteLength).toBeLessThan(64 * 1024)

    expect(() => gunzipBytes(bomb, { maxUncompressedBytes: 1024 * 1024 })).toThrow(
      /maxUncompressedBytes/,
    )
  })

  it('still refuses when the gzip trailer LIES about the uncompressed size', () => {
    // The ISIZE pre-check is only a fast path; zlib's maxOutputLength is the
    // enforcement, and this proves it fires on its own.
    const bomb = gzipBytes(new Uint8Array(16 * 1024 * 1024))
    const lying = new Uint8Array(bomb)
    lying[lying.length - 4] = 0
    lying[lying.length - 3] = 0
    lying[lying.length - 2] = 0
    lying[lying.length - 1] = 0

    const message = messageOf(() => gunzipBytes(lying, { maxUncompressedBytes: 1024 * 1024 }))
    expect(message).toMatch(/maxUncompressedBytes/)
    expect(message).toMatch(/decompression bomb/)
  })

  it('inflates the same stream happily when the cap allows it', () => {
    const bomb = gzipBytes(new Uint8Array(16 * 1024 * 1024))

    expect(gunzipBytes(bomb, { maxUncompressedBytes: 32 * 1024 * 1024 }).byteLength).toBe(
      16 * 1024 * 1024,
    )
    expect(gunzipBytes(bomb).byteLength).toBe(16 * 1024 * 1024)
  })

  it('refuses to parse a tar larger than maxUncompressedBytes', () => {
    const tar = createTar([{ path: 'a.txt', content: new Uint8Array(2048).fill(1) }])

    expect(() => parseTar(tar, { maxUncompressedBytes: 1024 })).toThrow(/maxUncompressedBytes/)
    expect(() => parseTar(tar, { maxUncompressedBytes: tar.byteLength })).not.toThrow()
  })

  it('refuses BEFORE allocating when a header claims more bytes than the cap', () => {
    // 0o77777777777 === 8589934591 (~8 GiB) declared by a 2 KB archive. The
    // accumulation check must fire before the copy is attempted.
    const hostile = craftTar({ name: 'huge.bin', declaredSize: 0o77777777777 })

    const message = messageOf(() => parseTar(hostile))
    expect(message).toMatch(/maxUncompressedBytes/)
    expect(message).toContain('huge.bin')

    expect(() => parseTar(hostile, { maxUncompressedBytes: 1024 * 1024 })).toThrow(
      /maxUncompressedBytes/,
    )
  })

  it('rejects a nonsensical cap instead of silently disabling itself', () => {
    expect(() => parseTar(createTar([]), { maxUncompressedBytes: 0 })).toThrow(
      /Invalid maxUncompressedBytes/,
    )
    expect(() => gunzipBytes(gzipBytes(new Uint8Array(1)), { maxUncompressedBytes: -1 })).toThrow(
      /Invalid maxUncompressedBytes/,
    )
  })
})

describe('error hygiene — DECISION 9, no archive bytes or file contents in messages', () => {
  it('never embeds entry content in a path-rejection message', () => {
    const secret = 'AKIA_SUPER_SECRET_TOKEN_9f2a3b'
    const hostile = craftTar({ name: '../evil', content: bytes(secret) })

    const message = messageOf(() => parseTar(hostile))
    expect(message).toMatch(/path traversal/)
    expect(message).not.toContain(secret)
  })

  it('never embeds artifact bytes in a gzip failure', () => {
    const secret = '{"password":"hunter2"}'

    const message = messageOf(() => gunzipBytes(bytes(secret)))
    expect(message).toMatch(/not a valid gzip stream/)
    expect(message).not.toContain('hunter2')
    expect(message).not.toContain('password')
  })

  it('escapes control characters in a hostile path instead of piping them into the log', () => {
    const hostile = craftTar({ name: 'a\r\n2026-07-25 FAKE LOG LINE/../x' })

    const message = messageOf(() => parseTar(hostile))
    expect(message).toMatch(/path traversal/)
    expect(message).toContain('\\x0d')
    expect(message).toContain('\\x0a')
    expect(message).not.toMatch(/[\r\n]/)
  })

  it('truncates an absurdly long hostile path', () => {
    // Built across the prefix + name fields so the joined path clears 120 chars.
    const hostile = craftTar({ name: '../x', prefix: 'a'.repeat(150) })

    const message = messageOf(() => parseTar(hostile))
    expect(message).toMatch(/path traversal/)
    expect(message).toContain('...')
    expect(message.length).toBeLessThan(400)
  })
})

describe('gzipBytes / gunzipBytes', () => {
  it('round-trips a tar through gzip', () => {
    const tar = createTar([{ path: 'a.txt', content: bytes('compress me'.repeat(100)) }])
    const gz = gzipBytes(tar)

    // Real gzip magic — the artifact is a genuine .tar.gz.
    expect(gz[0]).toBe(0x1f)
    expect(gz[1]).toBe(0x8b)
    expect(Buffer.from(gunzipBytes(gz)).equals(Buffer.from(tar))).toBe(true)
    expect(parseTar(gunzipBytes(gz, { maxUncompressedBytes: 1024 * 1024 }))[0].path).toBe('a.txt')
  })

  it('throws on invalid gzip input', () => {
    expect(() => gunzipBytes(bytes('definitely not gzip'))).toThrow(/not a valid gzip stream/)
    expect(() => gunzipBytes(new Uint8Array(0))).toThrow(/not a valid gzip stream/)
  })
})

describe('system tar compatibility (the no-lock-in promise)', () => {
  it('produces an archive the system tar can list and extract', () => {
    const dir = mkdtempSync(join(tmpdir(), 'molecule-tar-'))
    try {
      const tar = createTar([
        { path: 'manifest.json', content: bytes('{"formatVersion":1}') },
        { path: 'source/src/app/main.ts', content: bytes('console.log("hi")\n') },
        // Requested setuid — the codec must strip it before it ever hits disk.
        { path: 'source/scripts/run.sh', content: bytes('#!/bin/sh\n'), mode: 0o4755 },
      ])
      const archivePath = join(dir, 'artifact.tar.gz')
      writeFileSync(archivePath, Buffer.from(gzipBytes(tar)))

      const listed = execFileSync('tar', ['-tzf', archivePath], { encoding: 'utf8' })
      expect(listed.split('\n').filter(Boolean).sort()).toEqual([
        'manifest.json',
        'source/scripts/run.sh',
        'source/src/app/main.ts',
      ])

      execFileSync('tar', ['-xzf', archivePath, '-C', dir])
      expect(readFileSync(join(dir, 'source/src/app/main.ts'), 'utf8')).toBe('console.log("hi")\n')
      // Owner-execute survives any umask, unlike the full 0o755 bit pattern.
      expect(statSync(join(dir, 'source/scripts/run.sh')).mode & 0o100).toBe(0o100)
      // ...but setuid/setgid/sticky must be gone.
      expect(statSync(join(dir, 'source/scripts/run.sh')).mode & 0o7000).toBe(0)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
