/**
 * Prompts for the language-model speech provider.
 *
 * The system prompt pins the model to verbatim transcription: output only what
 * is spoken, invent nothing, translate nothing. The user message carries the
 * audio block plus the language / context hints.
 *
 * @module
 */

/**
 * The system prompt for one transcription pass.
 *
 * @param options - Diarization request and extra caller instructions.
 * @param options.diarize - Ask the model to label speakers line by line.
 * @param options.maxSpeakers - Upper bound on speakers to label.
 * @param options.instructions - Extra caller instructions, appended last.
 * @returns The system prompt.
 */
export function systemPrompt(options: {
  diarize?: boolean
  maxSpeakers?: number
  instructions?: string
}): string {
  return [
    'You are a speech-to-text engine. Transcribe EXACTLY the words spoken in the audio.',
    '- Output only the transcript: no commentary, no markdown fences, no preamble.',
    '- Transcribe in the language spoken; do not translate, summarize or correct the speaker.',
    '- Inaudible words become a single "?" each — never guess a plausible word.',
    '- If the audio contains no speech, return an empty response.',
    ...(options.diarize
      ? [
          '- Label who is speaking: start every line with "speaker_<n>: " where speakers are numbered 0, 1, 2, … in the order they first speak, and start a new line whenever the speaker changes.',
          ...(options.maxSpeakers ? [`- There are at most ${options.maxSpeakers} speakers.`] : []),
        ]
      : []),
    ...(options.instructions ? ['- ' + options.instructions] : []),
  ].join('\n')
}

/**
 * The text part of the user message (the audio block is sent alongside it).
 *
 * @param language - Optional language hint.
 * @param context - Optional context / spelling hints.
 * @returns The user-side instruction.
 */
export function userPrompt(language?: string, context?: string): string {
  const lang = language ? ` The speech is expected to be in "${language}".` : ''
  const hint = context ? ` Context and spellings to expect: ${context}` : ''
  return `Transcribe this audio.${lang}${hint}`
}
