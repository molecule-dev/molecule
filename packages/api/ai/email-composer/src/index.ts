/**
 * `@molecule/api-ai-email-composer` — AI-assisted email drafting.
 *
 * Generates email drafts (subject + body) with tone / length / audience
 * controls, plus an optional reply mode that grounds the draft in a
 * previous message.
 *
 * Extracted from ai-email-composer flagship.
 *
 * @module
 */

import { requireProvider as requireAI } from '@molecule/api-ai'

/** Tone preset controlling the voice and register of the generated email. */
export * from './browser-guard.js'
export type EmailTone =
  | 'professional'
  | 'friendly'
  | 'concise'
  | 'persuasive'
  | 'apologetic'
  | 'enthusiastic'
/** Length preset controlling how many sentences / paragraphs the draft contains. */
export type EmailLength = 'short' | 'medium' | 'long'

/** AI-generated email draft returned by {@link composeEmail}. */
export interface EmailDraft {
  subject: string
  body: string
  reasoning?: string
}

/** Options accepted by {@link composeEmail} to control the generated draft. */
export interface ComposeOptions {
  /** Plain-English description of what the email should say. */
  brief: string
  /** Tone preset. Default 'professional'. */
  tone?: EmailTone
  /** Length preset. Default 'medium'. */
  length?: EmailLength
  /** Who you're writing to (e.g. "the engineering team", "a vendor"). */
  audience?: string
  /** Optional prior message to reply to — anchors the response. */
  inReplyTo?: { from?: string; subject?: string; body: string }
  /** Sender name (for signature). */
  senderName?: string
  /** Pass-through to AI provider. */
  model?: string
}

const LENGTH_GUIDANCE: Record<EmailLength, string> = {
  short: '3–5 sentences, no fluff',
  medium: '1–2 short paragraphs',
  long: '2–4 paragraphs, with context and a clear ask',
}

const TONE_GUIDANCE: Record<EmailTone, string> = {
  professional: 'measured, neutral, polite',
  friendly: 'warm, conversational, first names',
  concise: 'bullet-pointed when helpful, direct, no preamble',
  persuasive: 'lead with value, anticipate objections',
  apologetic: 'acknowledges the issue early, owns it, offers remediation',
  enthusiastic: 'energetic but not over-the-top',
}

const PROMPT_TEMPLATE = `You are drafting an email on behalf of {{SENDER}}.

Brief: {{BRIEF}}
Audience: {{AUDIENCE}}
Tone: {{TONE_LABEL}} — {{TONE}}
Length: {{LENGTH_LABEL}} — {{LENGTH}}
{{REPLY_BLOCK}}
Respond with ONLY a JSON object:
{
  "subject": "...",
  "body": "...",
  "reasoning": "..."
}

Body should be the email text (no headers). Use \\n for line breaks. End with the sender's name if a sender was specified.`

/** Generates an email draft (subject + body) from a plain-English brief using the wired AI provider. */
export async function composeEmail(opts: ComposeOptions): Promise<EmailDraft> {
  const ai = requireAI()
  const tone = opts.tone ?? 'professional'
  const length = opts.length ?? 'medium'
  const replyBlock = opts.inReplyTo
    ? `\nThis is a REPLY to the following message:\nFrom: ${opts.inReplyTo.from ?? '(unknown)'}\nSubject: ${opts.inReplyTo.subject ?? '(no subject)'}\n${opts.inReplyTo.body}\n`
    : ''

  const prompt = PROMPT_TEMPLATE.replace('{{SENDER}}', opts.senderName ?? 'the user')
    .replace('{{BRIEF}}', opts.brief)
    .replace('{{AUDIENCE}}', opts.audience ?? 'a general professional audience')
    .replace('{{TONE_LABEL}}', tone)
    .replace('{{TONE}}', TONE_GUIDANCE[tone])
    .replace('{{LENGTH_LABEL}}', length)
    .replace('{{LENGTH}}', LENGTH_GUIDANCE[length])
    .replace('{{REPLY_BLOCK}}', replyBlock)

  let raw = ''
  for await (const event of ai.chat({
    messages: [{ role: 'user', content: prompt }],
    model: opts.model,
    temperature: 0.4,
  })) {
    const e = event as { type: string; text?: string }
    if (e.type === 'text') raw += e.text ?? ''
  }

  try {
    const json = raw
      .replace(/```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()
    return JSON.parse(json) as EmailDraft
  } catch (_error) {
    // Safe to ignore: the AI returned non-JSON output (e.g. plain text or markdown fence);
    // we degrade gracefully by surfacing the raw text as the body so the user still gets something usable.
    return { subject: '(draft failed)', body: raw, reasoning: 'malformed JSON' }
  }
}
