/**
 * SYN2 — co-author trailer must never leak into user-facing commit displays.
 *
 * The agent co-authors every commit it makes (molecule.dev appends
 * `Co-authored-by: Synthase <synthase@molecule.dev>` after a blank line per git
 * trailer convention). That trailer belongs in the real git commit object, but
 * the commit-bar status line and the expanded commit-card label both render the
 * full message returned by the commit endpoint — so the trailer was leaking into
 * the chat UI. {@link stripCommitCoauthorTrailer} removes it at render time only.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { stripCommitCoauthorTrailer } from '../components/chat-commit-utilities.js'

// The exact trailer molecule.dev appends (see api/src/ai/git-handlers.ts).
const SYNTHASE_TRAILER = 'Co-authored-by: Synthase <synthase@molecule.dev>'

describe('stripCommitCoauthorTrailer — SYN2', () => {
  it('strips a single co-author trailer and the blank line above it', () => {
    const message = `feat: add login screen\n\n${SYNTHASE_TRAILER}`
    expect(stripCommitCoauthorTrailer(message)).toBe('feat: add login screen')
  })

  it('keeps the subject and body, dropping only the trailer block', () => {
    const message = `feat: add login screen\n\nWires the OAuth callback.\n\n${SYNTHASE_TRAILER}`
    expect(stripCommitCoauthorTrailer(message)).toBe(
      'feat: add login screen\n\nWires the OAuth callback.',
    )
  })

  it('strips multiple stacked co-author trailers', () => {
    const message = `chore: update deps\n\nCo-authored-by: A <a@x.dev>\nCo-authored-by: B <b@x.dev>`
    expect(stripCommitCoauthorTrailer(message)).toBe('chore: update deps')
  })

  it('is case-insensitive (Co-Authored-By spelling)', () => {
    const message = `fix: bug\n\nCo-Authored-By: Claude <noreply@anthropic.com>`
    expect(stripCommitCoauthorTrailer(message)).toBe('fix: bug')
  })

  it('tolerates trailing whitespace on the separating blank line', () => {
    const message = `feat: thing\n   \n${SYNTHASE_TRAILER}`
    expect(stripCommitCoauthorTrailer(message)).toBe('feat: thing')
  })

  it('leaves a message with no co-author trailer unchanged', () => {
    expect(stripCommitCoauthorTrailer('chore: bump version')).toBe('chore: bump version')
  })

  it('does not touch an empty string', () => {
    expect(stripCommitCoauthorTrailer('')).toBe('')
  })
})
