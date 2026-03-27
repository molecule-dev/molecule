/**
 * Xml implementation of SitemapProvider.
 *
 * @module
 */

import type { XmlConfig } from './types.js'

/**
 *
 */
export class XmlSitemapProvider {
  readonly name = 'xml'

  constructor(private config: XmlConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: XmlConfig): XmlSitemapProvider {
  return new XmlSitemapProvider(config)
}
