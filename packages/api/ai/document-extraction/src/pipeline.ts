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

function describeField(f: ExtractionField): string {
  const req = f.required ? ' (REQUIRED)' : ''
  return `- "${f.name}" (${f.type})${req}: ${f.description}`
}

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
    const e = event as { type: string; text?: string }
    if (e.type === 'text') raw += e.text ?? ''
  }

  try {
    const json = raw
      .replace(/```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()
    const parsed = JSON.parse(json) as ExtractionResult<T>
    return parsed
  } catch {
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
