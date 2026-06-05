/**
 * Brand colors for each AI provider, used in model picker UIs.
 *
 * Centralised here so feature packages stay provider-agnostic. Keys must stay
 * in sync with `AIProviderID`.
 *
 * @module
 */

import type { AIProviderID } from './types.js'

/**
 * Brand colors keyed by provider ID. Used as accent colors in picker rows.
 */
export const PROVIDER_BRAND_COLORS: Readonly<Record<AIProviderID, string>> = {
  anthropic: '#d97706',
  openai: '#10b981',
  google: '#3b82f6',
  xai: '#ef4444',
  deepseek: '#4d6bfe',
  meta: '#6366f1',
  moonshot: '#8b5cf6',
  minimax: '#ec4899',
  alibaba: '#f97316',
  zhipu: '#14b8a6',
}
