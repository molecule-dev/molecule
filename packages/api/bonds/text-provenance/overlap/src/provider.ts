/**
 * Attribution by overlapping word sequences.
 *
 * Every three-word sequence the assistant produced — in its replies and in the
 * files it wrote — is indexed with the turn that produced it; so is every
 * sequence the user typed. A paragraph word counts as the AI's when a sequence
 * covering it came from the assistant AND no sequence covering it was typed by
 * the user. A paragraph is `ai` when those words reach `minAiShare` of it.
 *
 * @module
 */

import type { AgentSession } from '@molecule/api-agent-transcript'
import type {
  Attribution,
  AttributionInput,
  ParagraphAttribution,
  TextProvenanceProvider,
} from '@molecule/api-text-provenance'

import { SHINGLE, shingles, words } from './words.js'

/** Where a sequence of assistant words came from. */
interface Source {
  session: number
  turn: number
}

/** The indexed sessions. */
interface Index {
  /** Assistant sequence → the turns that produced it, in order. */
  ai: Map<string, Source[]>
  /** Every sequence a user typed. */
  user: Set<string>
  /** Whole assistant / user texts as ` w1 w2 … `, for paragraphs shorter than a sequence. */
  aiTexts: Array<{ text: string; source: Source }>
  userTexts: string[]
}

/**
 * Index the sessions' words.
 *
 * @param sessions - The agent sessions.
 * @returns The index.
 */
function indexSessions(sessions: readonly AgentSession[]): Index {
  const idx: Index = { ai: new Map(), user: new Set(), aiTexts: [], userTexts: [] }
  sessions.forEach((s, si) => {
    s.turns.forEach((t, ti) => {
      const texts = t.role === 'assistant' ? [t.text, ...t.files.map((f) => f.text)] : [t.text]
      for (const text of texts) {
        const ws = words(text)
        if (!ws.length) continue
        if (t.role === 'user') {
          for (const sh of shingles(ws)) idx.user.add(sh)
          idx.userTexts.push(` ${ws.join(' ')} `)
        } else {
          const source = { session: si, turn: ti }
          for (const sh of shingles(ws)) {
            const list = idx.ai.get(sh)
            if (!list) idx.ai.set(sh, [source])
            else if (!list.some((x) => x.session === si && x.turn === ti)) list.push(source)
          }
          idx.aiTexts.push({ text: ` ${ws.join(' ')} `, source })
        }
      }
    })
  })
  return idx
}

/**
 * The user message a turn answered: the nearest user turn before it.
 *
 * @param session - The session.
 * @param turn - The assistant turn's index.
 * @returns The prompt as typed, if any.
 */
function promptBefore(session: AgentSession, turn: number): string | undefined {
  for (let i = turn - 1; i >= 0; i--)
    if (session.turns[i].role === 'user') return session.turns[i].text
  return undefined
}

/**
 * Attribute one paragraph.
 *
 * @param index - Its position in the document.
 * @param text - Its text.
 * @param idx - The indexed sessions.
 * @param sessions - The sessions.
 * @param minAiShare - The share of AI words that makes it `ai`.
 * @returns Its attribution.
 */
function attributeParagraph(
  index: number,
  text: string,
  idx: Index,
  sessions: readonly AgentSession[],
  minAiShare: number,
): ParagraphAttribution {
  const ws = words(text)
  const n = ws.length
  const human: ParagraphAttribution = { index, origin: 'human', words: n, aiWords: 0 }
  if (n === 0) return human
  const votes = new Map<string, { source: Source; count: number }>()
  const vote = (sources: Source[], weight: number): void => {
    for (const s of sources) {
      const key = `${s.session}:${s.turn}`
      const v = votes.get(key)
      if (v) v.count += weight
      else votes.set(key, { source: s, count: weight })
    }
  }
  let aiWords = 0
  if (n < SHINGLE) {
    // Too short for a sequence: the whole phrase must appear in an assistant text and in no user text.
    const phrase = ` ${ws.join(' ')} `
    const hits = idx.aiTexts.filter((a) => a.text.includes(phrase)).map((a) => a.source)
    if (hits.length && !idx.userTexts.some((u) => u.includes(phrase))) {
      aiWords = n
      vote(hits, 1)
    }
  } else {
    const byAi = new Array<boolean>(n).fill(false)
    const byUser = new Array<boolean>(n).fill(false)
    shingles(ws).forEach((sh, i) => {
      const sources = idx.ai.get(sh)
      if (sources) {
        for (let k = i; k < i + SHINGLE; k++) byAi[k] = true
        vote(sources, 1)
      }
      if (idx.user.has(sh)) for (let k = i; k < i + SHINGLE; k++) byUser[k] = true
    })
    for (let k = 0; k < n; k++) if (byAi[k] && !byUser[k]) aiWords++
  }
  if (aiWords / n < minAiShare || votes.size === 0) return { ...human, aiWords }
  // The turn that contributed the most sequences wrote it; the latest wins a tie (the revision, not the draft).
  const best = [...votes.values()].sort(
    (a, b) =>
      b.count - a.count || b.source.session - a.source.session || b.source.turn - a.source.turn,
  )[0].source
  const session = sessions[best.session]
  const turn = session.turns[best.turn]
  return {
    index,
    origin: 'ai',
    words: n,
    aiWords,
    prompt: promptBefore(session, best.turn),
    model: turn.model ?? session.model,
    source: best,
  }
}

/**
 * Attributes paragraphs by overlapping word sequences.
 */
export const provider: TextProvenanceProvider = {
  attribute(input: AttributionInput): Attribution {
    const minAiShare = input.options?.minAiShare ?? 0.5
    const idx = indexSessions(input.sessions)
    const paragraphs = input.paragraphs.map((p, i) =>
      attributeParagraph(i, p, idx, input.sessions, minAiShare),
    )
    const total = paragraphs.reduce((n, p) => n + p.words, 0)
    const ai = paragraphs.filter((p) => p.origin === 'ai').reduce((n, p) => n + p.words, 0)
    const prompts: string[] = []
    for (const p of paragraphs) if (p.prompt && !prompts.includes(p.prompt)) prompts.push(p.prompt)
    return { paragraphs, words: total, aiWords: ai, aiShare: total ? ai / total : 0, prompts }
  },
}
