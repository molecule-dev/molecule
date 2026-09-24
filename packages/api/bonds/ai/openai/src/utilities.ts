/**
 * Helpers shared by the chat/completions and Responses transports.
 *
 * @module
 */

import type { ChatEvent } from '@molecule/api-ai'

/**
 * Map a mid-stream error's code/type/message to the client-facing `error`
 * event. Overload and rate-limit errors get their own messages so the
 * consumer's retry recovery can tell them apart from other failures.
 *
 * @param detail - The upstream error's code/type and message, joined.
 * @returns The `error` ChatEvent to yield.
 */
export function streamErrorEvent(detail: string): ChatEvent {
  const message = /overload|capacity|503|529/i.test(detail)
    ? 'AI service is temporarily overloaded. Please try again in a moment.'
    : /rate.?limit|429|quota/i.test(detail)
      ? 'AI rate limit exceeded. Please try again shortly.'
      : 'AI service error. Please try again.'
  return { type: 'error', message, errorKey: 'ai.error.apiError' }
}
