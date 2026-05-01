/**
 * Pure-function SM-2 spaced-repetition algorithm for molecule.dev.
 *
 * Implements Piotr Wozniak's SM-2 algorithm exactly as published in
 * "Optimization of repetition spacing in the course of learning"
 * (1990). No I/O, no DB, no clock reads — every scheduling decision
 * is a pure function of `(state, quality, options.now)`. This keeps
 * it equally usable from API handlers, AI study agents, mock-server
 * fixtures, and frontend test harnesses.
 *
 * Used by flashcard-app and language-learning today, and by any
 * future app that needs spaced-repetition scheduling. Future
 * algorithms (FSRS / SM-15) can be added as additional named exports
 * without breaking the SM-2 API.
 *
 * @example
 * ```ts
 * import { initialSm2State, reviewSm2 } from '@molecule/api-spaced-repetition'
 *
 * let state = initialSm2State()
 * state = reviewSm2(state, 5)        // first correct review → interval 1d
 * state = reviewSm2(state, 4)        // second correct review → interval 6d
 * state = reviewSm2(state, 5)        // mature card → interval ≈ 6 * EF
 * state = reviewSm2(state, 1)        // failure → reps reset, interval = 1d, lapse++
 * ```
 *
 * @example
 * ```ts
 * // Deterministic scheduling for tests / replays:
 * const state = reviewSm2(card, 3, { now: new Date('2026-01-01T00:00:00Z') })
 * // state.next_review is exactly 24h after the supplied `now`.
 * ```
 *
 * @module
 */

export * from './sm2.js'
export * from './types.js'
