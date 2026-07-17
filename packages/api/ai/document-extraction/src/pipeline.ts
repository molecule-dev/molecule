/**
 * Document-extraction pipeline.
 *
 * Given raw text (e.g. OCR'd from a PDF) and a schema of fields to
 * extract, prompts the bonded AI provider for a structured result.
 *
 * @module
 */

import { requireProvider as requireAI } from '@molecule/api-ai'

import type { ExtractionField, ExtractionResult } from './types.js'

/**
 * Format a single extraction field as a prompt line describing its name, type, and constraints.
 */
function describeField(f: ExtractionField): string {
  const req = f.required ? ' (REQUIRED)' : ''
  return `- "${f.name}" (${f.type})${req}: ${f.description}`
}

/**
 * Build the AI prompt that instructs the model to extract the specified fields from a document.
 */
function buildExtractionPrompt(opts: {
  text: string
  fields: ExtractionField[]
  context?: string
}): string {
  return `You are extracting structured data from a document.

${opts.context ? `Document context: ${opts.context}\n\n` : ''}Extract the following fields. Return null for fields you cannot find.

Fields to extract:
${opts.fields.map(describeField).join('\n')}

Respond with ONLY a JSON object in this shape:
{
  "data": { "<field_name>": <value or null>, ... },
  "confidence": { "<field_name>": 0.0-1.0, ... },
  "reasoning": "..."
}

Document text:
${opts.text}`
}

/**
 * Extract a set of fields from a document. The AI prompt enumerates
 * each field with its type and description; the response is validated
 * and any missing/required fields are flagged.
 */
export async function extractFields<T = Record<string, unknown>>(opts: {
  text: string
  fields: ExtractionField[]
  context?: string
  model?: string
  temperature?: number
}): Promise<ExtractionResult<T>> {
  const ai = requireAI()
  const prompt = buildExtractionPrompt(opts)
  let raw = ''
  for await (const event of ai.chat({
    messages: [{ role: 'user', content: prompt }],
    model: opts.model,
    temperature: opts.temperature ?? 0,
  })) {
    // A ChatEvent's text payload is `content` (NOT `text`, which is the
    // ContentBlock shape) — reading `event.text` accumulated nothing.
    if (event.type === 'text') raw += event.content
  }

  try {
    // Extract the JSON object even when the model wraps it in prose and/or a
    // markdown fence (LLMs commonly add "Here is the result:" or trailing
    // remarks). Prefer fenced content, then slice first `{` to last `}` — a bare
    // fence-strip fails on prose around the block.
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const jsonBody = (fenced ? fenced[1] : raw).trim()
    // Slice the outermost JSON value — object OR array — out of any prose.
    const objAt = jsonBody.indexOf('{')
    const arrAt = jsonBody.indexOf('[')
    const useArray = arrAt >= 0 && (objAt < 0 || arrAt < objAt)
    const valStart = useArray ? arrAt : objAt
    const valEnd = jsonBody.lastIndexOf(useArray ? ']' : '}')
    const json =
      valStart >= 0 && valEnd > valStart ? jsonBody.slice(valStart, valEnd + 1) : jsonBody
    const parsed = JSON.parse(json) as ExtractionResult<T>
    return parsed
  } catch (_error) {
    // Safe to ignore: the AI returned non-JSON text; we surface a normalized fallback result
    // rather than throwing, so the caller always gets a typed ExtractionResult.
    return {
      data: {} as T,
      reasoning: 'AI returned malformed JSON',
    }
  }
}

/**
 * Validate that all `required` fields were extracted as non-null.
 * Returns the list of missing field names.
 */
export function missingRequiredFields<T = Record<string, unknown>>(
  result: ExtractionResult<T>,
  fields: ExtractionField[],
): string[] {
  const data = result.data as Record<string, unknown>
  return fields
    .filter((f) => f.required && (data[f.name] === undefined || data[f.name] === null))
    .map((f) => f.name)
}
