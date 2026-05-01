/**
 * Zod schemas for runtime-validating untrusted question + answer
 * payloads (e.g. from request bodies, JSON columns, or AI-generated
 * content).
 *
 * @module
 */

import { z } from 'zod'

/** Schema for {@link TextMatchOptions}. */
export const textMatchOptionsSchema = z
  .object({
    caseInsensitive: z.boolean().optional(),
    trim: z.boolean().optional(),
    collapseWhitespace: z.boolean().optional(),
    accentFold: z.boolean().optional(),
  })
  .strict()

/** Schema for {@link FuzzyMatchOptions}. */
export const fuzzyMatchOptionsSchema = textMatchOptionsSchema.extend({
  maxEditDistance: z.number().int().nonnegative().optional(),
})

/** Schema for a multi-choice payload. */
export const multiChoicePayloadSchema = z
  .object({
    correctIndices: z.array(z.number().int().nonnegative()),
    allowPartial: z.boolean().optional(),
    optionCount: z.number().int().positive(),
  })
  .strict()

/** Schema for a true-false payload. */
export const trueFalsePayloadSchema = z.object({ correct: z.boolean() }).strict()

/** Schema for a type-answer payload. */
export const typeAnswerPayloadSchema = z
  .object({
    acceptedAnswers: z.array(z.string()).min(1),
    match: fuzzyMatchOptionsSchema.optional(),
  })
  .strict()

/** Schema for a fill-blank payload. */
export const fillBlankPayloadSchema = z
  .object({
    blanks: z.array(z.object({ acceptedAnswers: z.array(z.string()).min(1) }).strict()).min(1),
    match: textMatchOptionsSchema.optional(),
    allowPartial: z.boolean().optional(),
  })
  .strict()

/** Schema for a numeric payload. */
export const numericPayloadSchema = z
  .object({
    correct: z.number(),
    tolerance: z.number().nonnegative().optional(),
  })
  .strict()

/** Schema for a matching payload. */
export const matchingPayloadSchema = z
  .object({
    pairs: z.record(z.string(), z.string()),
    allowPartial: z.boolean().optional(),
  })
  .strict()

/**
 * Discriminated-union schema for a {@link Question}. Use this to validate
 * questions read from untrusted JSON.
 */
export const questionSchema = z.discriminatedUnion('kind', [
  z
    .object({
      id: z.string().optional(),
      kind: z.literal('multi-choice'),
      payload: multiChoicePayloadSchema,
      points: z.number().nonnegative().optional(),
      timeLimitMs: z.number().nonnegative().optional(),
    })
    .strict(),
  z
    .object({
      id: z.string().optional(),
      kind: z.literal('true-false'),
      payload: trueFalsePayloadSchema,
      points: z.number().nonnegative().optional(),
      timeLimitMs: z.number().nonnegative().optional(),
    })
    .strict(),
  z
    .object({
      id: z.string().optional(),
      kind: z.literal('type-answer'),
      payload: typeAnswerPayloadSchema,
      points: z.number().nonnegative().optional(),
      timeLimitMs: z.number().nonnegative().optional(),
    })
    .strict(),
  z
    .object({
      id: z.string().optional(),
      kind: z.literal('fill-blank'),
      payload: fillBlankPayloadSchema,
      points: z.number().nonnegative().optional(),
      timeLimitMs: z.number().nonnegative().optional(),
    })
    .strict(),
  z
    .object({
      id: z.string().optional(),
      kind: z.literal('numeric'),
      payload: numericPayloadSchema,
      points: z.number().nonnegative().optional(),
      timeLimitMs: z.number().nonnegative().optional(),
    })
    .strict(),
  z
    .object({
      id: z.string().optional(),
      kind: z.literal('matching'),
      payload: matchingPayloadSchema,
      points: z.number().nonnegative().optional(),
      timeLimitMs: z.number().nonnegative().optional(),
    })
    .strict(),
])

/** Schema for {@link GradeOptions}. */
export const gradeOptionsSchema = z
  .object({
    elapsedMs: z.number().nonnegative().optional(),
    speedBonusMaxFactor: z.number().nonnegative().optional(),
  })
  .strict()

/** Schema for {@link GradeResult}. */
export const gradeResultSchema = z
  .object({
    is_correct: z.boolean(),
    points_earned: z.number().nonnegative(),
    explanation: z.string().optional(),
  })
  .strict()
