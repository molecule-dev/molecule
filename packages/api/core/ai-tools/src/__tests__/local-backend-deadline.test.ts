import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

import { expect, it } from 'vitest'

import { createLocalBackend } from '../backends/local.js'
import { shellQuote } from '../utilities.js'

it('enforces the caller budget and stops native descendants before they write after the deadline', async () => {
  const root = await mkdtemp(join(tmpdir(), 'feedback-budget-'))
  try {
    const marker = join(root, 'late-write')
    const code = `setTimeout(()=>require('node:fs').writeFileSync(${JSON.stringify(marker)},'late'),350)`
    const result = await createLocalBackend(root).run(`node -e ${shellQuote(code)}`, {
      budgetMs: 60,
      timeout: 1000,
    })
    await delay(400)
    expect(result.exitCode).toBe(124)
    expect(await readFile(marker, 'utf8').catch(() => null)).toBeNull()
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

it('the outer timeout stops the native child, not only its wrapper shell', async () => {
  const root = await mkdtemp(join(tmpdir(), 'feedback-timeout-'))
  try {
    const marker = join(root, 'late-write')
    const code = `setTimeout(()=>require('node:fs').writeFileSync(${JSON.stringify(marker)},'late'),350)`
    await createLocalBackend(root).run(`node -e ${shellQuote(code)}`, { timeout: 60 })
    await delay(400)
    expect(await readFile(marker, 'utf8').catch(() => null)).toBeNull()
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
