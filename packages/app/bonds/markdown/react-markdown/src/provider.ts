/**
 * Markdown implementation of MarkdownProvider.
 *
 * @module
 */

import type { MarkdownConfig } from './types.js'

/**
 *
 */
export class MarkdownMarkdownProvider {
  readonly name = 'markdown'

  constructor(private config: MarkdownConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: MarkdownConfig): MarkdownMarkdownProvider {
  return new MarkdownMarkdownProvider(config)
}
