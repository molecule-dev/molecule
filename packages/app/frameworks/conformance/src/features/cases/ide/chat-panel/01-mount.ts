/**
 * `ChatPanel` cases: Mount and baseline loads. Every case name starts with `mount: `.
 *
 * @module
 */

import type { FeatureCase } from '../../../spec.js'
import { base } from './fixtures.js'

/** Mount and baseline loads. */
export const mountCases: FeatureCase[] = [base('mount: an empty conversation')]
