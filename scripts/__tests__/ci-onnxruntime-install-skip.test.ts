/**
 * `npm ci` must never depend on nuget.org.
 *
 * `onnxruntime-node` — a transitive dependency of `@huggingface/transformers`,
 * which the local ai-embeddings bonds depend on — runs a `postinstall`
 * (`script/install.js`) that downloads the CUDA execution-provider binaries
 * from `api.nuget.org`. Its `script/install-metadata.js` lists that download
 * for `linux/x64` ONLY, which is exactly the CI runner, so every `npm ci`
 * reached out to nuget.org for binaries nothing here uses: the CPU binary is
 * bundled in the package (`bin/napi-v6/linux/x64/libonnxruntime.so.1`), and no
 * runner has a GPU. When nuget.org was unreachable, CI died in `npm ci` before
 * it ran a single test (run 39075987540, 2026-10-17 — connection timeout to
 * 150.171.110.210:443).
 *
 * `ONNXRUNTIME_NODE_INSTALL=skip` is the package's documented switch for this
 * (`install.js` exits before its first request). Every workflow here that runs
 * `npm ci` must declare it at the top level — a job that re-adds the download
 * (or a new workflow that forgets it) turns CI back into a nuget.org client.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const WORKFLOWS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.github', 'workflows')

/** Every workflow file, with its raw text. */
function workflows(): { name: string; text: string }[] {
  return readdirSync(WORKFLOWS)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .map((name) => ({ name, text: readFileSync(join(WORKFLOWS, name), 'utf8') }))
}

/** Drop comment-only lines so a mention in prose cannot satisfy a check. */
function codeOnly(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n')
}

/** One-line-per-raw-line view: does the file run `npm ci` and at what indent? */
function npmCiIndents(text: string): number[] {
  return codeOnly(text)
    .split('\n')
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /(^|\s)(npm ci|npm ci\b)/.test(line) && !/^\s*#/.test(line))
    .map(({ line }) => line.length - line.trimStart().length)
}

/** Whether the file's top-level `env:` block sets the skip value. */
function topLevelSkip(text: string): boolean {
  const lines = text.split('\n')
  const envAt = lines.findIndex((line) => /^env:\s*$/.test(line))
  if (envAt === -1) return false
  for (let i = envAt + 1; i < lines.length; i += 1) {
    const line = lines[i]
    if (line.trim() === '') continue
    // A top-level key (column 0) ends the env block.
    if (!/^\s/.test(line)) return false
    if (/^\s{2}ONNXRUNTIME_NODE_INSTALL:\s*['"]?skip['"]?\s*$/.test(line)) return true
  }
  return false
}

describe('CI npm installs do not download onnxruntime CUDA binaries', () => {
  const all = workflows()

  it('finds the workflows that run npm ci (the guard cannot pass on none)', () => {
    const withCi = all.filter(({ text }) => npmCiIndents(text).length > 0)
    expect(withCi.map(({ name }) => name).sort()).toEqual(['ci.yml', 'release.yml'])
  })

  it('sets ONNXRUNTIME_NODE_INSTALL=skip at the workflow level wherever npm ci runs', () => {
    const missing = all
      .filter(({ text }) => npmCiIndents(text).length > 0)
      .filter(({ text }) => !topLevelSkip(text))
      .map(({ name }) => name)
    expect(
      missing,
      `add a top-level \`env:\` with \`ONNXRUNTIME_NODE_INSTALL: skip\` to: ${missing.join(', ')}`,
    ).toEqual([])
  })

  it('never re-enables the download (every mention still resolves to skip)', () => {
    // The env var, and the equivalent `--onnxruntime-node-install` argument the
    // package also honours. Any value other than `skip` re-opens the fetch.
    const forced = /ONNXRUNTIME_NODE_INSTALL:\s*['"]?(?!skip\b)\w+/
    const forcedFlag = /--onnxruntime-node-install(?:=|\s+)(?!skip\b)\S*/
    const reenabled = all
      .filter(({ text }) => forced.test(codeOnly(text)) || forcedFlag.test(codeOnly(text)))
      .map(({ name }) => name)
    expect(reenabled, `remove the forced install from: ${reenabled.join(', ')}`).toEqual([])
  })
})
